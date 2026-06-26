from django.contrib import admin
from .models import Organization, Workspace, SubscriptionPlan, OrganizationSubscription, UsageTracker, Invoice

@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'slug')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'created_at')
    list_filter = ('organization', 'created_at')
    search_fields = ('name', 'organization__name')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'price_monthly', 'max_tasks', 'max_members', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'code')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(OrganizationSubscription)
class OrganizationSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('organization', 'plan', 'status', 'current_period_end', 'created_at')
    list_filter = ('status', 'plan', 'created_at')
    search_fields = ('organization__name', 'stripe_customer_id', 'stripe_subscription_id')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(UsageTracker)
class UsageTrackerAdmin(admin.ModelAdmin):
    list_display = ('organization', 'metric_name', 'current_value', 'reset_period', 'updated_at')
    list_filter = ('metric_name', 'reset_period', 'organization')
    search_fields = ('organization__name', 'metric_name')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'organization', 'amount', 'status', 'stripe_invoice_id', 'created_at')
    list_filter = ('status', 'organization', 'created_at')
    search_fields = ('organization__name', 'stripe_invoice_id')
    readonly_fields = ('created_at', 'updated_at')
