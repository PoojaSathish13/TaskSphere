from django.db import models
from django.conf import settings
from features.tenant_module.models import TenantBaseModel


class DailyStandup(TenantBaseModel):
    """
    Saves a user's daily status updates, tracking planned work, blocking issues, and completed tasks.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_standups'
    )
    date = models.DateField()
    
    yesterday_text = models.TextField()
    today_text = models.TextField()
    blockers_text = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'date')

    def __str__(self):
        return f"Standup for {self.user.email} on {self.date}"
