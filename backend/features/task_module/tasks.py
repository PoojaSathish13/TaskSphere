import logging
from datetime import date, timedelta
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model

logger = logging.getLogger('tasksphere')

@shared_task(bind=True, max_retries=3)
def send_daily_digest_emails(self):
    """
    Daily digest: sent to all active users with tasks due today or overdue.
    Runs every day at 8AM via Celery Beat scheduler.
    """
    try:
        from features.planner_module.models import Task
        User = get_user_model()
        today = date.today()

        sent_count = 0
        for user in User.objects.filter(is_active=True).exclude(email=''):
            due_today = Task.objects.filter(
                assignee=user,
                due_date=today,
                status__in=['TODO', 'IN_PROGRESS', 'BACKLOG', 'REVIEW']
            )
            overdue_tasks = Task.objects.filter(
                assignee=user,
                due_date__lt=today,
                status__in=['TODO', 'IN_PROGRESS', 'BACKLOG', 'REVIEW']
            )

            if not due_today.exists() and not overdue_tasks.exists():
                continue

            lines = [
                f"Hi {user.first_name or user.email},\n",
                "Here is your TaskSphere daily task digest:\n"
            ]
            if due_today.exists():
                lines.append("📅 Tasks Due Today:")
                for t in due_today[:5]:
                    lines.append(f"  • {t.title} ({t.priority})")
                if due_today.count() > 5:
                    lines.append(f"  ... and {due_today.count() - 5} more.")

            if overdue_tasks.exists():
                lines.append("\n⚠️ Overdue Tasks:")
                for t in overdue_tasks[:5]:
                    lines.append(f"  • {t.title} — was due {t.due_date}")
                if overdue_tasks.count() > 5:
                    lines.append(f"  ... and {overdue_tasks.count() - 5} more.")

            lines.append("\nStay on track! Visit TaskSphere to manage your daily workspace dashboard.")
            
            send_mail(
                subject=f"TaskSphere Daily Digest — {today.strftime('%B %d, %Y')}",
                message='\n'.join(lines),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
            sent_count += 1
            
        logger.info(f"Daily digest emails sent to {sent_count} user(s).")
        return f"Daily digest sent to {sent_count} active users."
    except Exception as exc:
        logger.error(f"Failed sending daily digest emails: {exc}")
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def send_weekly_report_emails(self):
    """
    Weekly report: sent every Monday to user accounts detailing completed and pending tasks.
    """
    try:
        from features.planner_module.models import Task
        User = get_user_model()
        today = date.today()
        week_ago = today - timedelta(days=7)

        sent_count = 0
        for user in User.objects.filter(is_active=True).exclude(email=''):
            completed = Task.objects.filter(
                assignee=user,
                status='DONE',
                updated_at__date__gte=week_ago
            )
            pending = Task.objects.filter(
                assignee=user,
                status__in=['TODO', 'IN_PROGRESS', 'BACKLOG', 'REVIEW']
            )

            lines = [
                f"Hi {user.first_name or user.email},\n",
                f"Your weekly TaskSphere report for the week ending {today.strftime('%B %d, %Y')}:\n",
                f"✅ Completed this week: {completed.count()} tasks",
                f"🔄 Currently in progress/todo: {pending.count()} tasks",
            ]
            if completed.exists():
                lines.append("\nCompleted Tasks list:")
                for t in completed[:5]:
                    lines.append(f"  • {t.title}")
                if completed.count() > 5:
                    lines.append(f"  ... and {completed.count() - 5} more.")

            lines.append("\nKeep it up! Visit TaskSphere to plan your next sprint velocity.")

            send_mail(
                subject=f"TaskSphere Weekly Report — {today.strftime('%B %d')}",
                message='\n'.join(lines),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
            sent_count += 1

        logger.info(f"Weekly report emails sent to {sent_count} user(s).")
        return f"Weekly reports sent to {sent_count} active users."
    except Exception as exc:
        logger.error(f"Failed sending weekly reports: {exc}")
        raise self.retry(exc=exc, countdown=300)
