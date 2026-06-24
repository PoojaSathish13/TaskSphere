import logging
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger('tasksphere.notifications')


@shared_task(bind=True, max_retries=3)
def send_email_notification(self, recipient_email, subject, message_body):
    """
    Celery background worker task to dispatch emails asynchronously.
    """
    logger.info(f"Triggering email dispatch to {recipient_email} (Subject: {subject})")
    try:
        # In actual production, configure django settings EMAIL_BACKEND
        send_mail(
            subject=subject,
            message=message_body,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@tasksphere.com'),
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        logger.info(f"Email successfully dispatched to {recipient_email}")
        return True
    except Exception as exc:
        logger.error(f"Email dispatch failed. Retrying... Exception: {str(exc)}")
        # Auto retry task under transient network failure (e.g. SMTP timeout)
        raise self.retry(exc=exc, countdown=60)
