from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Label, Comment, Attachment, TaskActivityLog
from .serializers import LabelSerializer, CommentSerializer, AttachmentSerializer, TaskActivityLogSerializer
from features.tenant_module.context import get_current_organization
from shared.permissions import HasRequiredPermission
from features.planner_module.models import Task


class LabelViewSet(viewsets.ModelViewSet):
    serializer_class = LabelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return Label.objects.none()
        return Label.objects.filter(organization=organization)

    def perform_create(self, serializer):
        organization = get_current_organization()
        serializer.save(
            organization=organization,
            created_by=self.request.user,
            updated_by=self.request.user
        )


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return Comment.objects.none()
        # Filter comments for tasks belonging to the active organization
        return Comment.objects.filter(
            organization=organization,
            task__organization=organization
        ).select_related('user')

    def perform_create(self, serializer):
        organization = get_current_organization()
        
        # Capture current task before saving log
        task = serializer.validated_data['task']
        
        # Save comment
        comment = serializer.save(
            organization=organization,
            user=self.request.user,
            created_by=self.request.user,
            updated_by=self.request.user
        )

        # Log creation activity
        TaskActivityLog.objects.create(
            task=task,
            user=self.request.user,
            field_changed='COMMENT',
            old_value=None,
            new_value=f"Added comment: {comment.content[:50]}...",
            organization=organization,
            created_by=self.request.user,
            updated_by=self.request.user
        )


class AttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = AttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return Attachment.objects.none()
        return Attachment.objects.filter(
            organization=organization,
            task__organization=organization
        ).select_related('uploaded_by')

    def perform_create(self, serializer):
        organization = get_current_organization()
        task = serializer.validated_data['task']
        attachment = serializer.save(
            organization=organization,
            uploaded_by=self.request.user,
            created_by=self.request.user,
            updated_by=self.request.user
        )

        # Log creation activity
        TaskActivityLog.objects.create(
            task=task,
            user=self.request.user,
            field_changed='ATTACHMENT',
            old_value=None,
            new_value=f"Uploaded file: {attachment.filename}",
            organization=organization,
            created_by=self.request.user,
            updated_by=self.request.user
        )


class TaskActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TaskActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return TaskActivityLog.objects.none()
        
        task_id = self.request.query_params.get('task')
        queryset = TaskActivityLog.objects.filter(organization=organization)
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset.order_by('-timestamp')


class TeamPulseAPIView(APIView):
    """
    Consolidated analytics for organizational work metrics, capacity, and active risk scoring.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        organization = get_current_organization()
        if not organization:
            return Response({'error': 'Active organization required.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Caching Layer Check
        from django.core.cache import cache
        cache_key = f"team_pulse_cache:{organization.id}"
        cached_payload = cache.get(cache_key)
        if cached_payload:
            return Response(cached_payload)

        # 2. Completion Rate today
        total_tasks = Task.objects.filter(organization=organization).count()
        done_tasks = Task.objects.filter(organization=organization, status='DONE').count()
        completion_rate = round((done_tasks / total_tasks * 100.0), 1) if total_tasks > 0 else 100.0

        # 3. Member capacity details
        from features.rbac_module.models import TenantMembership
        memberships = TenantMembership.objects.filter(organization=organization).select_related('user')
        
        member_workloads = []
        overloaded_count = 0
        underutilized_members = []
        overloaded_members = []

        for m in memberships:
            # Query sum of estimated hours assigned to member
            from django.db.models import Sum
            hours_sum = Task.objects.filter(
                assignee=m.user,
                organization=organization
            ).exclude(status='DONE').aggregate(Sum('estimated_hours'))['estimated_hours__sum'] or 0.0
            
            hours_val = float(hours_sum)
            if hours_val > 8.0:
                overloaded_count += 1
                overloaded_members.append(f"{m.user.first_name} {m.user.last_name}".strip() or m.user.email)
            elif hours_val < 4.0:
                underutilized_members.append(f"{m.user.first_name} {m.user.last_name}".strip() or m.user.email)

            member_workloads.append({
                'id': str(m.user.id),
                'email': m.user.email,
                'name': f"{m.user.first_name} {m.user.last_name}".strip() or m.user.email,
                'role': m.role.name,
                'assigned_hours': hours_val,
                'capacity_percentage': min(100.0, round((hours_val / 8.0) * 100.0, 1))
            })

        # 4. Blocker Stats
        from features.blocker_module.models import TaskBlocker
        active_blockers_count = TaskBlocker.objects.filter(organization=organization, status='ACTIVE').count()
        
        # 5. Productivity score average
        from features.focus_module.models import ProductivityMetric
        from django.db.models import Avg
        avg_score = ProductivityMetric.objects.filter(
            organization=organization, 
            date=timezone.now().date()
        ).aggregate(Avg('productivity_score'))['productivity_score__avg'] or 100.0

        # 6. Risks
        overdue_tasks = Task.objects.filter(
            organization=organization,
            due_date__lt=timezone.now().date()
        ).exclude(status='DONE').count()

        # 7. Team Health Score calculation
        # Deduct for overdue tasks, active blockers, and overloaded members
        deductions = (overdue_tasks * 4) + (active_blockers_count * 8) + (overloaded_count * 12)
        health_score = max(0, min(100, 100 - deductions))

        # 8. Workload Optimization Insights
        insights = []
        if overloaded_members and underutilized_members:
            insights.append(
                f"Workload imbalance detected: {', '.join(overloaded_members)} are overloaded, while {', '.join(underutilized_members)} possess free capacity. Re-allocate backlog tasks to balance velocity."
            )
        elif overloaded_members:
            insights.append(
                f"Resource bottlenecks: {', '.join(overloaded_members)} exceed the 8.0-hour threshold. Consider extending deadlines or splitting larger tickets."
            )
        else:
            insights.append("Workload capacity is optimized. Resource distribution aligns with daily target parameters.")

        payload = {
            'completion_rate': completion_rate,
            'total_tasks': total_tasks,
            'done_tasks': done_tasks,
            'active_blockers': active_blockers_count,
            'productivity_score': round(float(avg_score), 1),
            'overdue_tasks': overdue_tasks,
            'team_health_score': health_score,
            'optimization_insights': insights,
            'team_workloads': member_workloads
        }

        # Cache result for 300 seconds
        cache.set(cache_key, payload, 300)

        return Response(payload)
