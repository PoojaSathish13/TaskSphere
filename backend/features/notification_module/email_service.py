"""
TaskSphere Email Notification Service
Sends transactional emails using Django's email backend.
Configure EMAIL_HOST / EMAIL_HOST_USER in .env for production SMTP.
In dev mode (EMAIL_BACKEND=console), emails are printed to the terminal.
"""
import logging
from django.core.mail import send_mail, send_mass_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger('tasksphere')

FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')


def _send(subject, html_body, to_emails: list[str]):
    """Core email send helper — gracefully logs on failure."""
    if not to_emails:
        return
    plain = strip_tags(html_body)
    try:
        send_mail(
            subject=subject,
            message=plain,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=to_emails,
            html_message=html_body,
            fail_silently=False,
        )
        logger.info(f'Email sent: "{subject}" → {to_emails}')
    except Exception as e:
        logger.error(f'Failed to send email "{subject}" to {to_emails}: {e}')


def send_task_assigned_email(assignee_email: str, assignee_name: str, task_title: str, task_id: str, assigned_by: str):
    """Notify a user they have been assigned a new task."""
    subject = f'📋 New task assigned: {task_title}'
    task_url = f'{FRONTEND_URL}/tasks?task={task_id}'
    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f0f12;color:#e4e4e7;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px;border-radius:8px;text-align:center;margin-bottom:24px;">
        <h1 style="margin:0;font-size:20px;color:#fff;">📋 Task Assigned</h1>
      </div>
      <p style="font-size:14px;color:#a1a1aa;">Hi <strong style="color:#e4e4e7;">{assignee_name}</strong>,</p>
      <p style="font-size:14px;color:#a1a1aa;"><strong style="color:#e4e4e7;">{assigned_by}</strong> has assigned you a new task:</p>
      <div style="background:#1c1c1f;border:1px solid #2d2d34;border-radius:8px;padding:16px;margin:16px 0;">
        <h2 style="margin:0 0 8px;font-size:16px;color:#fff;">{task_title}</h2>
      </div>
      <a href="{task_url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Task →</a>
      <p style="font-size:11px;color:#52525b;margin-top:24px;">TaskSphere · You're receiving this because you're a member of the workspace.</p>
    </div>
    """
    _send(subject, html, [assignee_email])


def send_task_due_reminder_email(assignee_email: str, assignee_name: str, task_title: str, task_id: str, due_date: str):
    """Remind user of an upcoming task due date."""
    subject = f'⏰ Task due soon: {task_title}'
    task_url = f'{FRONTEND_URL}/tasks?task={task_id}'
    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f0f12;color:#e4e4e7;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:24px;border-radius:8px;text-align:center;margin-bottom:24px;">
        <h1 style="margin:0;font-size:20px;color:#fff;">⏰ Task Due Soon</h1>
      </div>
      <p style="font-size:14px;color:#a1a1aa;">Hi <strong style="color:#e4e4e7;">{assignee_name}</strong>,</p>
      <p style="font-size:14px;color:#a1a1aa;">Your task is due on <strong style="color:#f59e0b;">{due_date}</strong>:</p>
      <div style="background:#1c1c1f;border:1px solid #2d2d34;border-radius:8px;padding:16px;margin:16px 0;">
        <h2 style="margin:0;font-size:16px;color:#fff;">{task_title}</h2>
      </div>
      <a href="{task_url}" style="display:inline-block;background:#f59e0b;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Open Task →</a>
      <p style="font-size:11px;color:#52525b;margin-top:24px;">TaskSphere · Due date reminder</p>
    </div>
    """
    _send(subject, html, [assignee_email])


def send_blocker_escalation_email(manager_emails: list[str], blocker_title: str, task_title: str, raised_by: str, blocker_id: str):
    """Alert managers when a blocker is escalated."""
    subject = f'🚨 Blocker escalated: {blocker_title}'
    blocker_url = f'{FRONTEND_URL}/blockers'
    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f0f12;color:#e4e4e7;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:24px;border-radius:8px;text-align:center;margin-bottom:24px;">
        <h1 style="margin:0;font-size:20px;color:#fff;">🚨 Blocker Escalated</h1>
      </div>
      <p style="font-size:14px;color:#a1a1aa;"><strong style="color:#e4e4e7;">{raised_by}</strong> escalated a blocker on task <strong style="color:#e4e4e7;">{task_title}</strong>:</p>
      <div style="background:#2a1b1b;border:1px solid #7f1d1d;border-radius:8px;padding:16px;margin:16px 0;">
        <h2 style="margin:0;font-size:15px;color:#fca5a5;">{blocker_title}</h2>
      </div>
      <a href="{blocker_url}" style="display:inline-block;background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Blockers →</a>
      <p style="font-size:11px;color:#52525b;margin-top:24px;">TaskSphere · Escalation alert</p>
    </div>
    """
    _send(subject, html, manager_emails)


def send_standup_reminder_email(member_emails: list[str], org_name: str):
    """Remind team members to submit their daily standup."""
    subject = f'🗣️ Daily standup reminder — {org_name}'
    standup_url = f'{FRONTEND_URL}/standups'
    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f0f12;color:#e4e4e7;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#10b981,#059669);padding:24px;border-radius:8px;text-align:center;margin-bottom:24px;">
        <h1 style="margin:0;font-size:20px;color:#fff;">🗣️ Daily Standup Reminder</h1>
      </div>
      <p style="font-size:14px;color:#a1a1aa;">It's time to submit your standup for <strong style="color:#e4e4e7;">{org_name}</strong>.</p>
      <p style="font-size:13px;color:#a1a1aa;">Share what you did yesterday, what you're doing today, and any blockers.</p>
      <a href="{standup_url}" style="display:inline-block;background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Submit Standup →</a>
      <p style="font-size:11px;color:#52525b;margin-top:24px;">TaskSphere · Daily standup reminder</p>
    </div>
    """
    _send(subject, html, member_emails)


def send_welcome_email(user_email: str, user_name: str, org_name: str):
    """Send a welcome email when a user joins an organization."""
    subject = f'🎉 Welcome to {org_name} on TaskSphere!'
    dashboard_url = f'{FRONTEND_URL}/dashboard'
    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f0f12;color:#e4e4e7;border-radius:12px;">
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px;border-radius:8px;text-align:center;margin-bottom:24px;">
        <h1 style="margin:0;font-size:24px;color:#fff;">Welcome to TaskSphere 🚀</h1>
      </div>
      <p style="font-size:14px;color:#a1a1aa;">Hi <strong style="color:#e4e4e7;">{user_name}</strong>,</p>
      <p style="font-size:14px;color:#a1a1aa;">You've been added to <strong style="color:#e4e4e7;">{org_name}</strong>. Your workspace is ready.</p>
      <a href="{dashboard_url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Go to Dashboard →</a>
      <p style="font-size:11px;color:#52525b;margin-top:24px;">TaskSphere · The enterprise project intelligence platform</p>
    </div>
    """
    _send(subject, html, [user_email])
