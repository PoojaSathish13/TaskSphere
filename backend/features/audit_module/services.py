from django.contrib.contenttypes.models import ContentType
from .models import AuditLog


def log_action(actor, organization, action, target_instance, payload=None, ip_address=None):
    """
    Orchestration service to generate immutably persisted audit entries.
    """
    content_type = None
    object_id = ''
    
    if target_instance:
        content_type = ContentType.objects.get_for_model(target_instance.__class__)
        object_id = str(getattr(target_instance, 'id', ''))

    return AuditLog.objects.create(
        actor=actor,
        organization=organization,
        action=action,
        content_type=content_type,
        object_id=object_id,
        payload=payload,
        ip_address=ip_address
    )
