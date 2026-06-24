from django.db import models
from shared.models import BaseModel, BaseModelManager, BaseQuerySet
from django.core.exceptions import ValidationError


class Organization(BaseModel):
    """
    Core Tenant Entity representing an enterprise customer.
    """
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class TenantQuerySet(BaseQuerySet):
    pass


class TenantManager(BaseModelManager):
    """
    Automatically restricts read queries to the active thread-local Organization scope.
    """
    def get_queryset(self):
        from .context import get_current_organization
        org = get_current_organization()
        
        # Base query filters out soft deletes
        qs = TenantQuerySet(self.model, using=self._db).filter(is_deleted=False)
        
        if org:
            # Filter queryset by active organization
            return qs.filter(organization=org)
            
        return qs


class TenantBaseModel(BaseModel):
    """
    Abstract Base Model for all tenant-scoped resources.
    Ensures that domain objects always enforce tenant isolation rules.
    """
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='%(class)s_resources'
    )

    objects = TenantManager()
    all_tenant_objects = BaseModelManager() # bypasses tenant filter but keeps soft-delete filters

    class Meta:
        abstract = True

    def clean(self):
        """Validates that save actions verify tenant consistency."""
        super().clean()
        from .context import get_current_organization
        org = get_current_organization()
        if org and self.organization_id != org.id:
            raise ValidationError(
                f"Organization mismatch: Resource scoped to {self.organization.slug} "
                f"but active tenant context is {org.slug}."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


# Import SaaS models to register them
from .models_saas import Workspace, SubscriptionPlan, OrganizationSubscription, UsageTracker
from .models_invoice import Invoice

