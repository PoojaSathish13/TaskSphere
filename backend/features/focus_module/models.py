from django.db import models
from django.conf import settings
from features.tenant_module.models import TenantBaseModel
from features.planner_module.models import Task


class FocusSession(TenantBaseModel):
    """
    Log containing metrics for an active focus execution session on a task.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='focus_sessions'
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='focus_sessions'
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(default=0)
    context_switches = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)

    def __str__(self):
        return f"Focus Session for {self.user.email} on {self.task.title}"


class ProductivityMetric(TenantBaseModel):
    """
    Consolidated metrics and calculations representing daily workflow quality.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='productivity_metrics'
    )
    date = models.DateField()
    focus_seconds = models.IntegerField(default=0)
    productivity_score = models.IntegerField(default=100) # Scale 0 to 100

    class Meta:
        unique_together = ('user', 'date')

    def __str__(self):
        return f"Metrics for {self.user.email} on {self.date} - Score: {self.productivity_score}"
