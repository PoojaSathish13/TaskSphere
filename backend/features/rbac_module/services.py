import logging
from django.core.cache import cache
from .models import TenantMembership

logger = logging.getLogger('tasksphere.rbac')


def get_user_permissions(user, organization_id):
    """
    Retrieves and caches computed permission codes for a user in a specific organization.
    Uses Redis as the cache store (configured as the default cache in settings.py).
    """
    if not user or user.is_anonymous:
        return []
        
    if user.is_superuser:
        # Superuser has all permissions implicitly
        return [
            "ORG_MANAGE", "PROJECT_CREATE", "PROJECT_VIEW", 
            "TASK_CREATE", "TASK_EDIT", "TASK_CLOSE", 
            "DEPLOY_MANAGE", "REPORT_VIEW"
        ]

    cache_key = f"user_permissions:{str(user.id)}:{str(organization_id)}"
    cached_permissions = cache.get(cache_key)

    if cached_permissions is not None:
        logger.debug(f"Cache HIT for user permissions {cache_key}")
        return cached_permissions

    logger.debug(f"Cache MISS for user permissions {cache_key}. Fetching from DB.")
    
    # Query Database
    membership = TenantMembership.objects.filter(
        user=user, 
        organization_id=organization_id
    ).select_related('role').first()

    if not membership:
        permissions_list = []
    else:
        permissions_list = list(
            membership.role.permissions.values_list('code', flat=True)
        )

    # Save to Redis Cache for 10 minutes (600 seconds)
    cache.set(cache_key, permissions_list, timeout=600)
    return permissions_list


def clear_permission_cache(user_id, organization_id):
    """
    Invalidates cached permissions. Call this service on role updates or memberships changes.
    """
    cache_key = f"user_permissions:{str(user_id)}:{str(organization_id)}"
    cache.delete(cache_key)
    logger.info(f"Evicted permissions cache for key {cache_key}")
