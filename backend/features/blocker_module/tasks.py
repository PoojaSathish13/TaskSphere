from celery import shared_task
from django.utils import timezone
from .models import TaskBlocker, BlockerAuditLog
from features.notification_module.email_service import send_blocker_escalation_email


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

            # Notify managers via email
            try:
                manager_emails = list(
                    blocker.organization.memberships.filter(
                        role__code__in=['ADMIN', 'MANAGER']
                    ).values_list('user__email', flat=True)
                )
                raised_by = blocker.created_by.email if blocker.created_by else 'System'
                task_title = blocker.task.title if blocker.task else '(unknown task)'
                send_blocker_escalation_email(
                    manager_emails=manager_emails,
                    blocker_title=blocker.title,
                    task_title=task_title,
                    raised_by=raised_by,
                    blocker_id=str(blocker.id),
                )
            except Exception as email_exc:
                # Email failure must never prevent blocker escalation from persisting
                import logging
                logging.getLogger('tasksphere').error(
                    f'Blocker escalation email failed for blocker {blocker.id}: {email_exc}'
                )

    return f"SLA monitor scan complete. Auto-escalated {escalated_count} task blockers."
