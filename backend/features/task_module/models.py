from django.db import models
from django.conf import settings
from features.tenant_module.models import TenantBaseModel
from features.planner_module.models import Task


class Label(TenantBaseModel):
    """
    Tags/Labels applied to tasks for grouping and categorization.
    """
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default='#6366F1') # Hex value

    class Meta:
        unique_together = ('organization', 'name')

    def __str__(self):
        return self.name


class Comment(TenantBaseModel):
    """
    Feedback and discussions under a task ticket.
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='task_comments'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.user.email} on {self.task.title}"


class Attachment(TenantBaseModel):
    """
    Supporting file uploads for tasks.
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file = models.FileField(upload_to='task_attachments/')
    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_attachments'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.filename


class TaskActivityLog(TenantBaseModel):
    """
    Audit log tracking history of operations performed on a task.
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='activity_logs'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='task_activities'
    )
    field_changed = models.CharField(max_length=100)
    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.field_changed} update on {self.task.title} at {self.timestamp}"
