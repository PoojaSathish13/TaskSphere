import uuid
from django.db import models
from django.conf import settings
from django.contrib.contenttypes.models import ContentType


class AuditLog(models.Model):
    """
    Immutable ledger of domain events and user actions within the SaaS application.
    Does NOT implement soft delete to ensure records are not tampered with.
    """
    ACTION_CHOICES = (
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('ACCESS', 'Access/Read'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_actions'
    )
    organization = models.ForeignKey(
        'tenant_module.Organization',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    
    # Generic relation to target entities
    content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True)
    object_id = models.CharField(max_length=255, db_index=True)
    
    # Payload details (e.g. JSON diff changes)
    payload = models.JSONField(null=True, blank=True)
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} on {self.object_id} by {self.actor or 'System'}"
