from django.db import models
from django.conf import settings
from features.tenant_module.models import TenantBaseModel
from .models import Project


class Release(TenantBaseModel):
    """
    Tracks client-visible version releases and milestones.
    """
    STATUS_CHOICES = (
        ('PLANNING', 'Planning'),
        ('BETA', 'Beta'),
        ('RELEASED', 'Released'),
    )

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='releases'
    )
    version = models.CharField(max_length=50)
    release_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNING')
    notes = models.TextField(blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.project.name} - {self.version} ({self.status})"


class ClientApprovalRequest(TenantBaseModel):
    """
    Tracks formal sign-offs submitted to Client roles.
    """
    STATUS_CHOICES = (
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('NEEDS_CLARIFICATION', 'Needs Clarification'),
    )

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='client_approvals'
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='requested_client_approvals'
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_client_approvals'
    )
    comments = models.TextField(blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.status}"


class ClientProjectAccess(TenantBaseModel):
    """
    Explicit project-level access control mapping for Client users.
    """
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='client_accesses'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='client_project_accesses'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('project', 'user')

    def __str__(self):
        return f"Access: {self.user.email} -> {self.project.name}"


class ClientDocument(TenantBaseModel):
    """
    Documents shared explicitly with clients under a specific Project.
    """
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='client_documents'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    file_url = models.CharField(max_length=500, blank=True, default='')
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_client_documents'
    )
    is_client_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class ProjectActivity(TenantBaseModel):
    """
    Timeline updates tracking client-visible milestones or status changes.
    """
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='client_activities'
    )
    activity_type = models.CharField(max_length=50) # e.g. RELEASE, APPROVAL, DOCUMENT, TASK_COMPLETE, CUSTOM
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='project_activities'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.activity_type}] {self.title}"
