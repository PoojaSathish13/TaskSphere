from django.db import models
from django.conf import settings
from features.tenant_module.models import TenantBaseModel
from features.planner_module.models import Task


class Project(TenantBaseModel):
    """
    Enterprise Project structure for classifying work tasks and tracking utilization metrics.
    """
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    is_client_visible = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class TimesheetEntry(TenantBaseModel):
    """
    Tracks daily working hours logged by users on specific tasks and projects, with approval workflows.
    """
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='timesheet_entries'
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='timesheet_entries'
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='timesheet_entries'
    )
    date = models.DateField()
    hours_logged = models.DecimalField(max_digits=4, decimal_places=2, default=0.0)
    description = models.TextField(blank=True, default='')
    
    is_billable = models.BooleanField(default=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='DRAFT')
    rejection_comments = models.TextField(blank=True, null=True)
    
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_timesheets'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.hours_logged}h [{self.status}] logged by {self.user.email} on {self.date}"
