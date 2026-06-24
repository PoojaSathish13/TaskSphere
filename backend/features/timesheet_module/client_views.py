from django.http import HttpResponse
from rest_framework import viewsets, permissions, status, generics
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from features.tenant_module.context import get_current_organization
from features.planner_module.models import Task
from features.notification_module.models import Notification
from features.notification_module.serializers import NotificationSerializer
from .models import Project
from .models_client import Release, ClientApprovalRequest, ClientProjectAccess, ClientDocument, ProjectActivity
from .client_serializers import (
    ClientProjectSerializer,
    ClientTaskSerializer,
    ReleaseSerializer,
    ClientApprovalRequestSerializer,
    ClientDocumentSerializer,
    ProjectActivitySerializer
)


class IsClientUser(permissions.BasePermission):
    """
    Enforce that only users with the seeded CLIENT role can access the portal endpoints.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        organization = get_current_organization()
        if not organization:
            return False
        if request.user.is_superuser:
            return True
        return request.user.memberships.filter(
            organization=organization,
            role__code='CLIENT'
        ).exists()


def get_accessible_projects(user, organization):
    """
    Returns Project queryset filtered by organization, client visibility, and user-level ProjectAccess mappings.
    """
    if user.is_superuser:
        return Project.objects.filter(organization=organization, is_client_visible=True)
    return Project.objects.filter(
        organization=organization,
        is_client_visible=True,
        client_accesses__user=user
    )


class ClientProjectViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Exposes only client-visible, project-isolated projects the Client user is explicitly granted access to.
    """
    serializer_class = ClientProjectSerializer
    permission_classes = [IsClientUser]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return Project.objects.none()
        return get_accessible_projects(self.request.user, organization).order_by('name')


class ClientTaskViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Allows clients to safely view only flagged client-visible tasks belonging to accessible projects.
    """
    serializer_class = ClientTaskSerializer
    permission_classes = [IsClientUser]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return Task.objects.none()
        accessible_projects = get_accessible_projects(self.request.user, organization)
        return Task.objects.filter(
            organization=organization,
            project__in=accessible_projects,
            is_client_visible=True
        ).order_by('-created_at')


class ClientReleaseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Exposes release milestones linked to accessible, client-visible projects.
    """
    serializer_class = ReleaseSerializer
    permission_classes = [IsClientUser]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return Release.objects.none()
        accessible_projects = get_accessible_projects(self.request.user, organization)
        return Release.objects.filter(
            organization=organization,
            project__in=accessible_projects
        ).order_by('-release_date')


class ClientApprovalRequestViewSet(viewsets.ModelViewSet):
    """
    Exposes approval items for client sign-offs.
    Clients are permitted to update status (APPROVED, REJECTED, NEEDS_CLARIFICATION) and comments.
    """
    serializer_class = ClientApprovalRequestSerializer
    permission_classes = [IsClientUser]
    http_method_names = ['get', 'patch', 'put', 'options']

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return ClientApprovalRequest.objects.none()
        accessible_projects = get_accessible_projects(self.request.user, organization)
        return ClientApprovalRequest.objects.filter(
            organization=organization,
            project__in=accessible_projects
        ).order_by('-created_at')

    def perform_update(self, serializer):
        serializer.save(
            reviewed_by=self.request.user,
            updated_by=self.request.user
        )


class ClientDocumentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lists files shared with clients for projects they have access to.
    """
    serializer_class = ClientDocumentSerializer
    permission_classes = [IsClientUser]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return ClientDocument.objects.none()
        accessible_projects = get_accessible_projects(self.request.user, organization)
        return ClientDocument.objects.filter(
            organization=organization,
            project__in=accessible_projects,
            is_client_visible=True
        ).order_by('-created_at')


class ProjectActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Chronological project activity timeline for clients.
    """
    serializer_class = ProjectActivitySerializer
    permission_classes = [IsClientUser]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return ProjectActivity.objects.none()
        accessible_projects = get_accessible_projects(self.request.user, organization)
        return ProjectActivity.objects.filter(
            organization=organization,
            project__in=accessible_projects
        ).order_by('-created_at')


class ClientNotificationViewSet(viewsets.ModelViewSet):
    """
    List and update in-app notifications for client user alerts.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsClientUser]
    http_method_names = ['get', 'patch', 'put', 'options']

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return Notification.objects.none()
        return Notification.objects.filter(
            organization=organization,
            recipient=self.request.user
        ).order_by('-created_at')


class ClientReportsAPIView(APIView):
    """
    Aggregates high-level project metrics, milestone statuses, and risk summaries.
    Provides export endpoints.
    """
    permission_classes = [IsClientUser]

    def get(self, request, *args, **kwargs):
        # Route action kwargs if matching PDF or Excel export routes
        action_name = kwargs.get('action')
        if action_name == 'export_pdf':
            return self.export_pdf(request)
        elif action_name == 'export_excel':
            return self.export_excel(request)

        organization = get_current_organization()
        if not organization:
            return Response({'error': 'Active organization required.'}, status=status.HTTP_400_BAD_REQUEST)

        accessible_projects = get_accessible_projects(request.user, organization)
        tasks = Task.objects.filter(organization=organization, project__in=accessible_projects, is_client_visible=True)
        total_tasks = tasks.count()
        completed_tasks = tasks.filter(status='DONE').count()
        pending_tasks = total_tasks - completed_tasks

        progress_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 100.0

        pending_approvals = ClientApprovalRequest.objects.filter(
            organization=organization,
            project__in=accessible_projects,
            status='PENDING'
        ).count()

        # Simulated Risk Summary
        risks = [
            {'id': 1, 'title': 'Resource Constraint in Sprint 3', 'severity': 'MEDIUM'},
            {'id': 2, 'title': 'Integration latency updates', 'severity': 'LOW'}
        ]

        return Response({
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'pending_tasks': pending_tasks,
            'progress_rate': progress_rate,
            'pending_approvals': pending_approvals,
            'risks': risks
        })

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        """Simulated enterprise PDF export stream."""
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="client_report.pdf"'
        # Write PDF mock headers/bytes
        response.write(b"%PDF-1.4\n%TaskSphere Secure Client Report PDF Stream Mock")
        return response

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """Simulated enterprise Excel sheet CSV stream."""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="client_report.csv"'
        # Write CSV text rows
        response.write("Metric,Value\n")
        response.write("Total Tasks,10\n")
        response.write("Completed Tasks,8\n")
        response.write("Progress Rate,80.0%\n")
        return response
