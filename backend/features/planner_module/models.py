from django.db import models
from django.conf import settings
from features.tenant_module.models import TenantBaseModel


class Task(TenantBaseModel):
    """
    SaaS Task entity representing a daily task item.
    """
    PRIORITY_CHOICES = (
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    )

    STATUS_CHOICES = (
        ('BACKLOG', 'Backlog'),
        ('TODO', 'To Do'),
        ('IN_PROGRESS', 'In Progress'),
        ('REVIEW', 'Under Review'),
        ('DONE', 'Done'),
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='TODO')
    is_client_visible = models.BooleanField(default=False)
    project = models.ForeignKey(
        'timesheet_module.Project',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    
    estimated_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0.0)
    actual_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0.0)
    
    due_date = models.DateField(null=True, blank=True)
    
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='assigned_tasks',
        null=True,
        blank=True
    )
    
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        related_name='subtasks',
        null=True,
        blank=True
    )
    
    labels = models.ManyToManyField(
        'task_module.Label',
        related_name='tasks',
        blank=True
    )

    def __str__(self):
        return self.title


class TaskDependency(TenantBaseModel):
    """
    Indicates that a task is blocked by another task.
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='blocked_by_relations'
    )
    depends_on = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='blocking_relations'
    )

    class Meta:
        unique_together = ('task', 'depends_on')
        verbose_name_plural = 'Task Dependencies'

    def __str__(self):
        return f"{self.task.title} blocked by {self.depends_on.title}"


class DailyPlan(TenantBaseModel):
    """
    Stores a user's customized execution sequence for a given calendar day.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_plans'
    )
    date = models.DateField()
    tasks_order = models.JSONField(default=list, blank=True) # List of Task UUID strings

    class Meta:
        unique_together = ('user', 'date')

    def __str__(self):
        return f"Plan for {self.user.email} on {self.date}"
