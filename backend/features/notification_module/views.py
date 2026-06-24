from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer
from features.tenant_module.context import get_current_organization


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Provides access to user notifications filtered by tenant context.
    Includes custom action to mark items as read.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return Notification.objects.none()
        
        # Scope notification records to authenticated user and active organization
        return Notification.objects.filter(
            recipient=self.request.user, 
            organization=organization
        )

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """Marks a specific notification entry as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        
        # Output standard success envelope structure
        return Response({
            'success': True,
            'data': {'id': notification.id, 'is_read': True},
            'meta': None,
            'errors': None
        })
