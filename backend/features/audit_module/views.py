from rest_framework import viewsets, permissions
from .models import AuditLog
from .serializers import AuditLogSerializer
from features.tenant_module.context import get_current_organization


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset providing secure access to audit history.
    Enforces tenant context boundaries strictly.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            # Enforce that requests must define X-Organization-ID to view any audit trail
            return AuditLog.objects.none()
        
        # Superusers bypass tenant scopes to view all log files if context is empty, 
        # but here we require context for feature parity.
        return AuditLog.objects.filter(organization=organization)
