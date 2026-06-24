from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Role, Permission, TenantMembership, PermissionGroup
from .serializers import RoleSerializer, PermissionSerializer, TenantMembershipSerializer, PermissionGroupSerializer
from .seeder import seed_rbac_permissions
from .services import clear_permission_cache
from features.tenant_module.context import get_current_organization
from shared.permissions import HasRequiredPermission


class PermissionGroupViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PermissionGroup.objects.all()
    serializer_class = PermissionGroupSerializer
    permission_classes = [permissions.IsAuthenticated]


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Exposes Roles and associated permissions mapping lists.
    """
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated]


class MembershipViewSet(viewsets.ModelViewSet):
    """
    Manages workspace memberships for the active Organization context.
    Requires ORG_MANAGE permissions to modify memberships.
    """
    serializer_class = TenantMembershipSerializer
    permission_classes = [permissions.IsAuthenticated, HasRequiredPermission]
    required_permission = 'ORG_MANAGE'

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return TenantMembership.objects.none()
        return TenantMembership.objects.filter(organization=organization).select_related('user', 'role')

    def perform_create(self, serializer):
        from rest_framework import serializers as drf_serializers
        from features.tenant_module.models_saas import OrganizationSubscription
        
        organization = get_current_organization()
        if organization:
            # Enforce SaaS subscription seat limits
            sub = OrganizationSubscription.objects.filter(organization=organization).first()
            if sub:
                current_members = TenantMembership.objects.filter(organization=organization).count()
                if current_members >= sub.plan.max_members:
                    raise drf_serializers.ValidationError(
                        f"Organization member seat limit reached for {sub.plan.name} plan ({sub.plan.max_members} max). Please upgrade."
                    )

        membership = serializer.save(organization=organization)
        clear_permission_cache(membership.user_id, membership.organization_id)

    def perform_update(self, serializer):
        # Save modifications
        membership = serializer.save()
        
        # Evict permissions Redis cache for the updated member (Dynamic invalidation)
        clear_permission_cache(membership.user_id, membership.organization_id)

    def perform_destroy(self, instance):
        user_id = instance.user_id
        org_id = instance.organization_id
        instance.delete()
        
        # Evict permissions cache on remove
        clear_permission_cache(user_id, org_id)


class SeedRBACView(APIView):
    """
    Triggers RBAC database seed configurations.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        try:
            perms_count, roles_count = seed_rbac_permissions()
            return Response({
                'success': True,
                'data': {
                    'message': 'RBAC matrix populated successfully.',
                    'permissions_seeded': perms_count,
                    'roles_seeded': roles_count
                },
                'meta': None,
                'errors': None
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'data': None,
                'meta': None,
                'errors': [{'code': 'SEED_FAILURE', 'message': str(e), 'field': None}]
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
