from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import FocusSession, ProductivityMetric
from .serializers import FocusSessionSerializer, ProductivityMetricSerializer
from features.tenant_module.context import get_current_organization
from features.planner_module.models import Task


class FocusSessionViewSet(viewsets.ModelViewSet):
    serializer_class = FocusSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return FocusSession.objects.none()
        return FocusSession.objects.filter(
            user=self.request.user,
            organization=organization
        ).select_related('task')

    def perform_create(self, serializer):
        organization = get_current_organization()
        serializer.save(
            user=self.request.user,
            organization=organization,
            created_by=self.request.user,
            updated_by=self.request.user
        )

    @action(detail=False, methods=['post'], url_path='start')
    def start_session(self, request):
        task_id = request.data.get('task')
        if not task_id:
            return Response({'error': 'Task ID required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        organization = get_current_organization()
        try:
            task = Task.objects.get(id=task_id, organization=organization)
        except Task.DoesNotExist:
            return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        if task.status == 'DONE':
            return Response({'error': 'Cannot start a focus session on a completed task.'}, status=status.HTTP_400_BAD_REQUEST)

        # Automatically stop any previous active session
        FocusSession.objects.filter(
            user=request.user,
            organization=organization,
            completed=False
        ).update(
            completed=True,
            completed_at=timezone.now(),
            updated_by=request.user
        )

        session = FocusSession.objects.create(
            user=request.user,
            task=task,
            organization=organization,
            created_by=request.user,
            updated_by=request.user
        )
        return Response(FocusSessionSerializer(session).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='stop')
    def stop_session(self, request, pk=None):
        organization = get_current_organization()
        try:
            session = FocusSession.objects.get(id=pk, user=request.user, organization=organization)
        except FocusSession.DoesNotExist:
            return Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        duration = request.data.get('duration_seconds', 0)
        switches = request.data.get('context_switches', 0)
        completed_task = request.data.get('completed_task', False)

        session.completed = True
        session.completed_at = timezone.now()
        session.duration_seconds = duration
        session.context_switches = switches
        session.save(update_fields=['completed', 'completed_at', 'duration_seconds', 'context_switches'])

        # If user explicitly checked 'completed_task', update status of task
        if completed_task:
            session.task.status = 'DONE'
            session.task.save(update_fields=['status'])

        # Update Productivity Metrics for today
        today = timezone.now().date()
        total_duration = sum(s.duration_seconds for s in FocusSession.objects.filter(user=request.user, started_at__date=today))
        total_switches = sum(s.context_switches for s in FocusSession.objects.filter(user=request.user, started_at__date=today))
        completed_count = Task.objects.filter(assignee=request.user, status='DONE', updated_at__date=today).count()

        # Engine Formula: Base score 100, penalize for context switches, reward for completions
        base_score = 100 - (total_switches * 5) + (completed_count * 10)
        final_score = max(0, min(100, base_score))

        metric, _ = ProductivityMetric.objects.update_or_create(
            user=request.user,
            date=today,
            organization=organization,
            defaults={
                'focus_seconds': total_duration,
                'productivity_score': final_score,
                'created_by': request.user,
                'updated_by': request.user
            }
        )

        return Response({
            'session': FocusSessionSerializer(session).data,
            'metric': ProductivityMetricSerializer(metric).data
        })

    @action(detail=True, methods=['post'], url_path='track-switch')
    def track_switch(self, request, pk=None):
        organization = get_current_organization()
        try:
            session = FocusSession.objects.get(id=pk, user=request.user, organization=organization)
        except FocusSession.DoesNotExist:
            return Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        session.context_switches += 1
        session.save(update_fields=['context_switches'])
        return Response({'success': True, 'context_switches': session.context_switches})


class ProductivityMetricViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductivityMetricSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return ProductivityMetric.objects.none()
        return ProductivityMetric.objects.filter(
            user=self.request.user,
            organization=organization
        ).order_by('-date')

    @action(detail=False, methods=['get'])
    def streak(self, request):
        organization = get_current_organization()
        if not organization:
            return Response({'streak': 0})
            
        metrics = ProductivityMetric.objects.filter(
            user=request.user,
            organization=organization,
            focus_seconds__gt=0
        ).order_by('-date')

        if not metrics.exists():
            return Response({'streak': 0})

        from datetime import date, timedelta
        today = timezone.now().date()
        dates_set = {m.date for m in metrics}
        
        streak = 0
        current_check = today
        
        if current_check not in dates_set:
            current_check = today - timedelta(days=1)
            
        while current_check in dates_set:
            streak += 1
            current_check -= timedelta(days=1)
            
        return Response({'streak': streak})
