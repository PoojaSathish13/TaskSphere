import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from features.rbac_module.models import Role, TenantMembership, PermissionGroup
from features.rbac_module.seeder import seed_rbac_permissions
from features.rbac_module.services import get_user_permissions, clear_permission_cache

User = get_user_model()


@pytest.mark.django_db
def test_permission_groups_linking():
    """Verify seeder maps permissions to logical permission group categories."""
    seed_rbac_permissions()
    
    dev_group = PermissionGroup.objects.get(name="Daily Task Management")
    assert dev_group.permissions.filter(code="TASK_EDIT").exists() is True
    assert dev_group.permissions.filter(code="ORG_MANAGE").exists() is False


@pytest.mark.django_db
def test_redis_permission_caching(test_user, test_organization):
    """Verify permission arrays cache correctly in Redis and evict on command."""
    seed_rbac_permissions()
    cache.clear() # clear redis first
    
    dev_role = Role.objects.get(code="DEVELOPER")
    TenantMembership.objects.create(
        user=test_user,
        organization=test_organization,
        role=dev_role
    )

    # 1. Fetch permissions (Cache MISS: goes to DB)
    perms_first = get_user_permissions(test_user, test_organization.id)
    assert "TASK_EDIT" in perms_first

    # Check cache value
    cache_key = f"user_permissions:{str(test_user.id)}:{str(test_organization.id)}"
    assert cache.get(cache_key) == perms_first

    # 2. Fetch permissions (Cache HIT: reads from Redis)
    perms_second = get_user_permissions(test_user, test_organization.id)
    assert perms_second == perms_first

    # 3. Trigger cache eviction
    clear_permission_cache(test_user.id, test_organization.id)
    assert cache.get(cache_key) is None


@pytest.mark.django_db
def test_user_directory_lookup(api_client, test_user, test_organization):
    """Verify that authenticated users can search other users by email."""
    # Authenticate client
    api_client.force_authenticate(user=test_user)
    api_client.defaults['HTTP_X_ORGANIZATION_ID'] = str(test_organization.id)
    
    # 1. Search for user by email
    response = api_client.get(f'/api/v1/rbac/users/?email={test_user.email}')
    assert response.status_code == 200
    
    # Retrieve data
    users_list = response.data
    assert len(users_list) == 1
    assert users_list[0]['email'] == test_user.email
    assert users_list[0]['id'] == str(test_user.id)

