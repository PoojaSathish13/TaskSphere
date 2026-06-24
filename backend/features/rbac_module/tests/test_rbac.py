import pytest
from django.contrib.auth import get_user_model
from features.rbac_module.models import Role, Permission, TenantMembership
from features.rbac_module.seeder import seed_rbac_permissions

User = get_user_model()


@pytest.mark.django_db
def test_rbac_seeder():
    """Verify seeder generates all baseline roles and permissions."""
    perms_count, roles_count = seed_rbac_permissions()
    
    assert perms_count == 8
    assert roles_count == 9
    
    # Confirm developer role has developer permissions
    dev_role = Role.objects.get(code="DEVELOPER")
    assert dev_role.permissions.filter(code="TASK_EDIT").exists() is True
    assert dev_role.permissions.filter(code="ORG_MANAGE").exists() is False


@pytest.mark.django_db
def test_user_organization_permission_resolution(test_user, test_organization):
    """Verify User models correctly map organization roles and verify permissions."""
    seed_rbac_permissions()
    
    dev_role = Role.objects.get(code="DEVELOPER")
    
    # Map user to organization as developer
    membership = TenantMembership.objects.create(
        user=test_user,
        organization=test_organization,
        role=dev_role
    )
    
    # Confirm permission checks resolve correctly
    assert test_user.has_org_permission(test_organization.id, "TASK_EDIT") is True
    assert test_user.has_org_permission(test_organization.id, "ORG_MANAGE") is False
