from django.db import models
from django.conf import settings
from shared.models import BaseModel


class Notification(BaseModel):
    """
    SaaS notification entity recording in-app alerts.
    Enforces multi-tenancy context using organization key.
    """
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    organization = models.ForeignKey(
        'tenant_module.Organization',
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    
    verb = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    
    # Optional arbitrary metadata payloads
    data = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.recipient.email} : {self.verb}"
