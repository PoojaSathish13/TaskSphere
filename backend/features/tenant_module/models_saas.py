from django.db import models
from django.conf import settings
from shared.models import BaseModel
from .models import TenantBaseModel, Organization


class Workspace(TenantBaseModel):
    """
    Groups projects and tasks under a subset division within the organization.
    """
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.organization.name})"


class SubscriptionPlan(BaseModel):
    """
    Global subscription plans defining tier codes and resource limits.
    """
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True, db_index=True) # e.g. FREE, PRO, ENTERPRISE
    price_monthly = models.DecimalField(max_digits=8, decimal_places=2, default=0.0)
    max_tasks = models.IntegerField(default=50)
    max_members = models.IntegerField(default=5)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} Plan (${self.price_monthly}/mo)"


class OrganizationSubscription(BaseModel):
    """
    Links an active subscription plan to a tenant Organization.
    """
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('TRIALING', 'Trialing'),
        ('PAST_DUE', 'Past Due'),
        ('CANCELED', 'Canceled'),
        ('EXPIRED', 'Expired'),
    )

    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name='subscription'
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.RESTRICT,
        related_name='subscriptions'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    current_period_end = models.DateField(null=True, blank=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True, default='')
    stripe_subscription_id = models.CharField(max_length=255, blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.organization.name} - {self.plan.name} ({self.status})"


class UsageTracker(TenantBaseModel):
    """
    Monitors consumed resources (e.g. number of tasks created) under tenant isolation context.
    """
    metric_name = models.CharField(max_length=100, db_index=True) # e.g. TASKS_COUNT, MEMBERS_COUNT
    current_value = models.IntegerField(default=0)
    reset_period = models.CharField(max_length=50, default='MONTHLY')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('organization', 'metric_name')

    def __str__(self):
        return f"{self.organization.name} : {self.metric_name} = {self.current_value}"
