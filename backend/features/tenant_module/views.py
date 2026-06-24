from rest_framework import viewsets, permissions
from .models import Organization
from .serializers import OrganizationSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    CRUD views for Organizations. 
    In actual production, lists would be filtered based on user memberships.
    """
    queryset = Organization.objects.filter(is_active=True)
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Allow administrators to view all, otherwise filter by organizations linked to User
        if self.request.user.is_superuser:
            return Organization.objects.all()
        return Organization.objects.filter(
            id__in=self.request.user.organizations.values_list('id', flat=True)
        )
