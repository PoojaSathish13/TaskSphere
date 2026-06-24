from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import TaskBlocker, BlockerAuditLog
from .serializers import TaskBlockerSerializer, BlockerAuditLogSerializer
from features.tenant_module.context import get_current_organization


class TaskBlockerViewSet(viewsets.ModelViewSet):
    serializer_class = TaskBlockerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return TaskBlocker.objects.none()
        return TaskBlocker.objects.filter(organization=organization).select_related('task')

    def perform_create(self, serializer):
        organization = get_current_organization()
        blocker = serializer.save(
            organization=organization,
            created_by=self.request.user,
            updated_by=self.request.user
        )
        
        # Log creation event
        BlockerAuditLog.objects.create(
            blocker=blocker,
            action='CREATED',
            user=self.request.user,
            notes=f"Logged blocker type: {blocker.blocker_type}",
            organization=organization,
            created_by=self.request.user,
            updated_by=self.request.user
        )

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve_blocker(self, request, pk=None):
        organization = get_current_organization()
        try:
            blocker = TaskBlocker.objects.get(id=pk, organization=organization)
        except TaskBlocker.DoesNotExist:
            return Response({'error': 'Blocker not found.'}, status=status.HTTP_404_NOT_FOUND)

        root_cause = request.data.get('root_cause', 'OTHER')
        notes = request.data.get('notes', '')

        blocker.status = 'RESOLVED'
        blocker.resolved_at = timezone.now()
        blocker.root_cause = root_cause
        blocker.resolution_notes = notes
        blocker.save(update_fields=['status', 'resolved_at', 'root_cause', 'resolution_notes'])

        # Log resolution audit log
        BlockerAuditLog.objects.create(
            blocker=blocker,
            action='RESOLVED',
            user=request.user,
            notes=f"Resolved with root cause: {root_cause}. Resolution: {notes}",
            organization=organization,
            created_by=request.user,
            updated_by=request.user
        )
        
        return Response(TaskBlockerSerializer(blocker).data)

    @action(detail=True, methods=['post'], url_path='escalate')
    def escalate_blocker(self, request, pk=None):
        organization = get_current_organization()
        try:
            blocker = TaskBlocker.objects.get(id=pk, organization=organization)
        except TaskBlocker.DoesNotExist:
            return Response({'error': 'Blocker not found.'}, status=status.HTTP_404_NOT_FOUND)

        blocker.is_escalated = True
        blocker.save(update_fields=['is_escalated'])

        # Log escalation audit
        BlockerAuditLog.objects.create(
            blocker=blocker,
            action='ESCALATED',
            user=request.user,
            notes="Manually escalated blocker to executive levels.",
            organization=organization,
            created_by=request.user,
            updated_by=request.user
        )
        
        return Response(TaskBlockerSerializer(blocker).data)

    @action(detail=False, methods=['post'], url_path='check-slas')
    def check_slas(self, request):
        """
        Scan all active blockers and automatically escalate those exceeding their SLA limit.
        """
        organization = get_current_organization()
        if not organization:
            return Response({'error': 'Active organization required.'}, status=status.HTTP_400_BAD_REQUEST)

        active_blockers = TaskBlocker.objects.filter(
            organization=organization,
            status='ACTIVE',
            is_escalated=False
        )

        escalated_count = 0
        now = timezone.now()

        for blocker in active_blockers:
            delta = now - blocker.created_at
            hours_active = delta.total_seconds() / 3600.0
            
            if hours_active > blocker.sla_hours:
                blocker.is_escalated = True
                blocker.save(update_fields=['is_escalated'])
                escalated_count += 1

        return Response({
            'success': True,
            'message': f"Scan complete. Automatically escalated {escalated_count} blockers violating SLAs."
        })


class BlockerAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BlockerAuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return BlockerAuditLog.objects.none()
        
        blocker_id = self.request.query_params.get('blocker')
        queryset = BlockerAuditLog.objects.filter(organization=organization)
        if blocker_id:
            queryset = queryset.filter(blocker_id=blocker_id)
        return queryset.order_by('-timestamp')
