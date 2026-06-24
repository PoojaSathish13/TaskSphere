from celery import shared_task
from django.utils import timezone
from .models import TaskBlocker, BlockerAuditLog


@shared_task
def monitor_blocker_slas():
    """
    Background automation checking active blockers and auto-escalating violating logs.
    """
    now = timezone.now()
    active_violators = TaskBlocker.objects.filter(
        status='ACTIVE',
        is_escalated=False
    )

    escalated_count = 0
    for blocker in active_violators:
        delta = now - blocker.created_at
        hours_active = delta.total_seconds() / 3600.0
        
        if hours_active > blocker.sla_hours:
            blocker.is_escalated = True
            blocker.save(update_fields=['is_escalated'])
            
            # Log audit entry
            BlockerAuditLog.objects.create(
                blocker=blocker,
                action='AUTO_ESCALATED',
                notes=f"Auto-escalated by background monitor. SLA of {blocker.sla_hours} hours violated.",
                organization=blocker.organization
            )
            escalated_count += 1

    return f"SLA monitor scan complete. Auto-escalated {escalated_count} task blockers."
