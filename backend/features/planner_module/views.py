from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from .models import Task, TaskDependency, DailyPlan
from .serializers import TaskSerializer, TaskDependencySerializer, DailyPlanSerializer
from .algorithms import suggest_work_plan
from features.tenant_module.context import get_current_organization
from shared.permissions import HasRequiredPermission


class TaskViewSet(viewsets.ModelViewSet):
    """
    CRUD viewset for tasks. Automatically isolates database reads to the active organization.
    """
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return Task.objects.none()
        # TenantManager in models automatically filters soft-deleted & active org items,
        # but double-checking here keeps it bulletproof.
        return Task.objects.filter(organization=organization).select_related('assignee')

    def perform_create(self, serializer):
        from rest_framework import serializers as drf_serializers
        from features.tenant_module.models_saas import OrganizationSubscription
        
        organization = get_current_organization()
        if organization:
            # Enforce SaaS subscription limits
            sub = OrganizationSubscription.objects.filter(organization=organization).first()
            if sub:
                current_tasks = Task.objects.filter(organization=organization).count()
                if current_tasks >= sub.plan.max_tasks:
                    raise drf_serializers.ValidationError(
                        f"Task limit reached for {sub.plan.name} plan ({sub.plan.max_tasks} max). Please upgrade."
                    )

        serializer.save(
            organization=organization,
            created_by=self.request.user,
            updated_by=self.request.user
        )

    def perform_update(self, serializer):
        from rest_framework import serializers as drf_serializers
        if 'status' in serializer.validated_data and serializer.validated_data['status'] == 'DONE':
            instance = self.get_object()
            
            # 1. Check subtasks
            if Task.objects.filter(parent=instance).exclude(status='DONE').exists():
                raise drf_serializers.ValidationError("Cannot complete task: unresolved subtasks exist.")
                
            # 2. Check dependencies
            if TaskDependency.objects.filter(task=instance).exclude(depends_on__status='DONE').exists():
                raise drf_serializers.ValidationError("Cannot complete task: blocked by unfinished tasks.")

        serializer.save(updated_by=self.request.user)

    @action(detail=False, methods=['patch'], url_path='bulk-update')
    def bulk_update(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No task IDs provided.'}, status=status.HTTP_400_BAD_REQUEST)
        
        organization = get_current_organization()
        tasks = Task.objects.filter(id__in=ids, organization=organization)
        
        status_val = request.data.get('status')
        priority_val = request.data.get('priority')
        assignee_id = request.data.get('assignee')
        delete_val = request.data.get('delete', False)
        
        if delete_val:
            tasks_count = tasks.count()
            tasks.delete() # Soft delete query set
            return Response({'success': True, 'message': f'Bulk soft deleted {tasks_count} tasks.'})
            
        update_fields = {}
        if status_val:
            update_fields['status'] = status_val
        if priority_val:
            update_fields['priority'] = priority_val
        if assignee_id is not None:
            update_fields['assignee_id'] = assignee_id if assignee_id else None
            
        if update_fields:
            tasks.update(**update_fields)
            
        return Response({'success': True, 'message': f'Bulk updated {tasks.count()} tasks.'})


class TaskDependencyViewSet(viewsets.ModelViewSet):
    """
    Manages dependency edges mapping blocker parameters.
    """
    serializer_class = TaskDependencySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return TaskDependency.objects.none()
        return TaskDependency.objects.filter(organization=organization)

    def perform_create(self, serializer):
        organization = get_current_organization()
        serializer.save(
            organization=organization,
            created_by=self.request.user,
            updated_by=self.request.user
        )


class DailyPlanViewSet(viewsets.ModelViewSet):
    """
    Saves and lists customized daily planners execution sequences.
    """
    serializer_class = DailyPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return DailyPlan.objects.none()
        return DailyPlan.objects.filter(
            user=self.request.user, 
            organization=organization
        )

    def perform_create(self, serializer):
        organization = get_current_organization()
        serializer.save(
            user=self.request.user,
            organization=organization,
            created_by=self.request.user,
            updated_by=self.request.user
        )


class SuggestedPlanView(APIView):
    """
    Computes Kahn's topological work planner sequence and evaluates risk vectors.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        organization = get_current_organization()
        if not organization:
            return Response({
                'success': False,
                'data': None,
                'meta': None,
                'errors': [{'code': 'TENANT_REQUIRED', 'message': 'Active organization context required.', 'field': None}]
            }, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve date parameter or fallback to today
        date_str = request.query_params.get('date')
        if date_str:
            try:
                from datetime import datetime
                target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response({
                    'success': False,
                    'data': None,
                    'meta': None,
                    'errors': [{'code': 'INVALID_DATE', 'message': 'Date format must be YYYY-MM-DD.', 'field': 'date'}]
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            target_date = timezone.now().date()

        # Execute sort and risk algorithms
        results = suggest_work_plan(request.user, organization.id, target_date)
        
        # Serialize task lists
        serialized_tasks = TaskSerializer(results["suggested_order"], many=True).data

        return Response({
            'success': True,
            'data': {
                'suggested_order': serialized_tasks,
                'risks': results["risks"]
            },
            'meta': None,
            'errors': None
        })
