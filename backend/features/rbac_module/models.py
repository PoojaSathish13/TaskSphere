from django.db import models
from django.conf import settings
from shared.models import BaseModel


class PermissionGroup(BaseModel):
    """
    Groups related permissions together to organize administration (e.g. 'Project Management', 'Task Operations').
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Permission(BaseModel):
    """
    Fine-grained permission nodes representing specific actions (e.g. 'TASKS_CREATE', 'PROJECTS_VIEW').
    """
    code = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True)
    
    group = models.ForeignKey(
        PermissionGroup,
        on_delete=models.SET_NULL,
        related_name='permissions',
        null=True,
        blank=True
    )

    def __str__(self):
        return self.code


class Role(BaseModel):
    """
    Grouping of permissions under a role name (e.g. 'Administrator', 'Member').
    """
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    permissions = models.ManyToManyField(Permission, related_name='roles')

    def __str__(self):
        return self.name


class TenantMembership(BaseModel):
    """
    Links a User, an Organization, and a Role.
    This is the core mapping that resolves multi-tenancy and RBAC permissions.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    organization = models.ForeignKey(
        'tenant_module.Organization',
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.RESTRICT,
        related_name='memberships'
    )

    class Meta:
        unique_together = ('user', 'organization')

    def __str__(self):
        return f"{self.user.email} in {self.organization.name} as {self.role.name}"
