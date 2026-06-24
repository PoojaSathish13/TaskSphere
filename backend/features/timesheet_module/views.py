from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Q
from .models import TimesheetEntry, Project
from .serializers import TimesheetEntrySerializer, ProjectSerializer, TimesheetApprovalSerializer
from features.tenant_module.context import get_current_organization
from features.planner_module.models import Task


class IsInternalUser(permissions.BasePermission):
    """
    Blocks client roles from accessing internal timesheets or project modifications.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        organization = get_current_organization()
        if not organization:
            return False
        if request.user.is_superuser:
            return True
        is_client = request.user.memberships.filter(
            organization=organization,
            role__code='CLIENT'
        ).exists()
        return not is_client


class ProjectViewSet(viewsets.ModelViewSet):
    """
    Exposes CRUD for Projects associated with active tenant organization.
    """
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated, IsInternalUser]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return Project.objects.none()
        return Project.objects.filter(organization=organization)

    def perform_create(self, serializer):
        organization = get_current_organization()
        serializer.save(
            organization=organization,
            created_by=self.request.user,
            updated_by=self.request.user
        )


class TimesheetEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimesheetEntrySerializer
    permission_classes = [permissions.IsAuthenticated, IsInternalUser]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return TimesheetEntry.objects.none()
            
        user = self.request.user
        
        # Check if user is admin/manager to see all timesheets (for approvals)
        is_manager = user.is_superuser or user.memberships.filter(
            organization=organization, 
            role__code__in=['admin', 'manager']
        ).exists()

        if is_manager:
            return TimesheetEntry.objects.filter(organization=organization).select_related('user', 'task', 'project', 'approved_by')
            
        return TimesheetEntry.objects.filter(
            user=user,
            organization=organization
        ).select_related('user', 'task', 'project', 'approved_by')

    def perform_create(self, serializer):
        organization = get_current_organization()
        serializer.save(
            user=self.request.user,
            organization=organization,
            created_by=self.request.user,
            updated_by=self.request.user,
            status='DRAFT'
        )

    def perform_update(self, serializer):
        # Prevent editing if already approved unless superuser/manager
        entry = self.get_object()
        if entry.status == 'APPROVED' and not (self.request.user.is_superuser or self.request.user.memberships.filter(
            organization=entry.organization, role__code__in=['admin', 'manager']
        ).exists()):
            raise PermissionError("Approved timesheets cannot be modified.")
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        """Submit timesheet draft for manager review."""
        entry = self.get_object()
        if entry.status not in ['DRAFT', 'REJECTED']:
            return Response({'error': 'Only draft or rejected entries can be submitted.'}, status=status.HTTP_400_BAD_REQUEST)
        
        entry.status = 'SUBMITTED'
        entry.submitted_at = timezone.now()
        entry.save(update_fields=['status', 'submitted_at'])
        return Response(TimesheetEntrySerializer(entry).data)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """Approve a submitted timesheet entry (Managers/Admins only)."""
        organization = get_current_organization()
        user = request.user
        
        is_manager = user.is_superuser or user.memberships.filter(
            organization=organization, 
            role__code__in=['admin', 'manager']
        ).exists()
        
        if not is_manager:
            return Response({'error': 'Only managers or administrators can approve timesheets.'}, status=status.HTTP_403_FORBIDDEN)
            
        entry = self.get_object()
        if entry.status != 'SUBMITTED':
            return Response({'error': 'Only submitted timesheet entries can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
            
        entry.status = 'APPROVED'
        entry.approved_by = user
        entry.approved_at = timezone.now()
        entry.save(update_fields=['status', 'approved_by', 'approved_at'])
        
        # Aggregate hours into Task model actual hours
        if entry.task:
            task = entry.task
            task.actual_hours = float(task.actual_hours or 0.0) + float(entry.hours_logged)
            task.save(update_fields=['actual_hours'])
            
        return Response(TimesheetEntrySerializer(entry).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Reject a submitted timesheet entry with feedback (Managers/Admins only)."""
        organization = get_current_organization()
        user = request.user
        
        is_manager = user.is_superuser or user.memberships.filter(
            organization=organization, 
            role__code__in=['admin', 'manager']
        ).exists()
        
        if not is_manager:
            return Response({'error': 'Only managers or administrators can reject timesheets.'}, status=status.HTTP_403_FORBIDDEN)
            
        entry = self.get_object()
        if entry.status != 'SUBMITTED':
            return Response({'error': 'Only submitted timesheet entries can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = TimesheetApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        entry.status = 'REJECTED'
        entry.rejection_comments = serializer.validated_data.get('rejection_comments', '')
        entry.save(update_fields=['status', 'rejection_comments'])
        
        return Response(TimesheetEntrySerializer(entry).data)

    @action(detail=False, methods=['get'], url_path='summary')
    def get_summary(self, request):
        organization = get_current_organization()
        if not organization:
            return Response({'error': 'Active organization required.'}, status=status.HTTP_400_BAD_REQUEST)

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Check permission to view team-wide summary
        view_team = request.query_params.get('team') == 'true'
        is_manager = request.user.is_superuser or request.user.memberships.filter(
            organization=organization, 
            role__code__in=['admin', 'manager']
        ).exists()

        if view_team and is_manager:
            queryset = TimesheetEntry.objects.filter(organization=organization)
        else:
            queryset = TimesheetEntry.objects.filter(user=request.user, organization=organization)

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        # 1. Total and status metrics
        total_hours = float(queryset.aggregate(sum_hours=Sum('hours_logged'))['sum_hours'] or 0.0)
        billable_hours = float(queryset.filter(is_billable=True).aggregate(sum_hours=Sum('hours_logged'))['sum_hours'] or 0.0)
        
        # 2. Utilization Rate
        utilization_rate = round((billable_hours / total_hours * 100), 1) if total_hours > 0 else 0.0

        # 3. Hours by date
        date_summary = queryset.values('date').annotate(total_hours=Sum('hours_logged')).order_by('date')
        by_date = [{'date': str(s['date']), 'hours': float(s['total_hours'])} for s in date_summary]

        # 4. Hours by Project
        project_summary = queryset.values('project__name').annotate(total_hours=Sum('hours_logged')).order_by('-total_hours')
        by_project = [{'project': s['project__name'] or "No Project", 'hours': float(s['total_hours'])} for s in project_summary]

        # 5. Hours by Task (Planned vs Actual)
        task_ids = queryset.values_list('task_id', flat=True).distinct()
        tasks = Task.objects.filter(id__in=task_ids)
        by_task = []
        completed_tasks_est = 0.0
        completed_tasks_act = 0.0
        for task in tasks:
            task_logged = float(queryset.filter(task=task).aggregate(sum_hours=Sum('hours_logged'))['sum_hours'] or 0.0)
            by_task.append({
                'task': task.title,
                'planned_hours': float(task.estimated_hours),
                'actual_hours': float(task.actual_hours),
                'logged_here': task_logged,
                'status': task.status
            })
            if task.status == 'DONE':
                completed_tasks_est += float(task.estimated_hours)
                completed_tasks_act += float(task.actual_hours)

        # 6. Productivity Score
        # (Completed tasks estimated hours / completed tasks actual hours) * 100
        productivity_score = round((completed_tasks_est / completed_tasks_act * 100), 1) if completed_tasks_act > 0 else 100.0

        # 7. Team Utilization (for manager summary dashboard view)
        team_summary = []
        if is_manager:
            user_summary = queryset.values('user__email', 'user__first_name', 'user__last_name').annotate(total_hours=Sum('hours_logged')).order_by('-total_hours')
            for entry in user_summary:
                team_summary.append({
                    'email': entry['user__email'],
                    'name': f"{entry['user__first_name']} {entry['user__last_name']}".strip() or entry['user__email'],
                    'hours': float(entry['total_hours'])
                })

        return Response({
            'total_hours': total_hours,
            'billable_hours': billable_hours,
            'utilization_rate': utilization_rate,
            'productivity_score': productivity_score,
            'by_date': by_date,
            'by_project': by_project,
            'by_task': by_task,
            'team_summary': team_summary
        })

