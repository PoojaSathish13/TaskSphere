from django.db import models
from django.conf import settings
from features.tenant_module.models import TenantBaseModel
from features.planner_module.models import Task


class TaskBlocker(TenantBaseModel):
    """
    Identifies blockers that obstruct task progression, tracking SLAs and escalation paths.
    """
    BLOCKER_TYPES = (
        ('APPROVAL', 'Waiting For Approval'),
        ('CLIENT', 'Waiting For Client'),
        ('QA', 'Waiting For QA'),
        ('DEVOPS', 'Waiting For DevOps'),
        ('TECHNICAL', 'Technical Blocker'),
    )

    STATUS_CHOICES = (
        ('ACTIVE', 'Active Blocker'),
        ('RESOLVED', 'Resolved Blocker'),
    )

    ROOT_CAUSE_CHOICES = (
        ('REQUIREMENTS_GAP', 'Requirements Gap'),
        ('DEVOPS_INFRA', 'DevOps / Infrastructure Down'),
        ('QA_BLOCK', 'QA Verification Blocked'),
        ('CLIENT_DELAY', 'Waiting for Client Response'),
        ('CODE_BUG', 'Critical Code Bug'),
        ('OTHER', 'Other / Unspecified'),
    )

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='task_blockers'
    )
    blocker_type = models.CharField(max_length=20, choices=BLOCKER_TYPES)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='ACTIVE')
    description = models.TextField()
    root_cause = models.CharField(max_length=30, choices=ROOT_CAUSE_CHOICES, default='OTHER')
    resolution_notes = models.TextField(blank=True, null=True)
    
    sla_hours = models.IntegerField(default=24) # e.g. 24h SLA target resolution
    is_escalated = models.BooleanField(default=False)
    
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.blocker_type} blocker on {self.task.title}"


class BlockerAuditLog(TenantBaseModel):
    """
    Audit ledger tracking chronological escalations and resolution logs of blockers.
    """
    blocker = models.ForeignKey(
        TaskBlocker,
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=50) # e.g. CREATED, ESCALATED, RESOLVED
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='blocker_actions'
    )
    notes = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action} on blocker {self.blocker_id} at {self.timestamp}"
