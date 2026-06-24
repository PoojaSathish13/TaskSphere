from rest_framework import permissions


class HasRequiredPermission(permissions.BasePermission):
    """
    Enterprise permission checker enforcing:
    1. Authentication checks.
    2. Tenant context availability.
    3. Action-based permission lookup based on user's active organizational roles
       (checks JWT access token claims first, falling back to Redis database cache).
    
    Views using this should define `required_permission = 'permission_code'`.
    """
    def has_permission(self, request, view):
        # 1. User must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Superuser bypass
        if request.user.is_superuser:
            return True

        # 2. Get active tenant organization from thread context
        from features.tenant_module.context import get_current_organization
        organization = get_current_organization()
        if not organization:
            return False

        # 3. Retrieve permission code required by the view
        required_permission = getattr(view, 'required_permission', None)
        if not required_permission:
            return True

        # 4. Check JWT claims payload first
        token_auth = request.auth # decoded JWT token dict under SimpleJWT
        if isinstance(token_auth, dict) and 'org_memberships' in token_auth:
            org_data = token_auth['org_memberships'].get(str(organization.id))
            if org_data:
                return required_permission in org_data.get('permissions', [])

        # 5. Fallback: Query via Redis-cached services
        from features.rbac_module.services import get_user_permissions
        user_perms = get_user_permissions(request.user, organization.id)
        return required_permission in user_perms


class IsOwnerOrHasPermission(permissions.BasePermission):
    """
    Grants access if:
    1. The user owns/created the resource object (IsOwner check), OR
    2. The user holds the requested fallback permission in the organization context.
    """
    def has_object_permission(self, request, view, obj):
        # 1. User must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Superuser bypass
        if request.user.is_superuser:
            return True

        # 2. Check ownership
        owner_fields = ['created_by', 'user', 'owner']
        is_owner = False
        for field in owner_fields:
            if hasattr(obj, field) and getattr(obj, field) == request.user:
                is_owner = True
                break

        if is_owner:
            return True

        # 3. Fallback: check permissions via JWT claims or Redis cache
        from features.tenant_module.context import get_current_organization
        organization = get_current_organization()
        if not organization:
            return False

        required_permission = getattr(view, 'required_permission', None)
        if not required_permission:
            return False

        # Check JWT claims
        token_auth = request.auth
        if isinstance(token_auth, dict) and 'org_memberships' in token_auth:
            org_data = token_auth['org_memberships'].get(str(organization.id))
            if org_data:
                return required_permission in org_data.get('permissions', [])

        # Check Redis cached database permissions
        from features.rbac_module.services import get_user_permissions
        user_perms = get_user_permissions(request.user, organization.id)
        return required_permission in user_perms


