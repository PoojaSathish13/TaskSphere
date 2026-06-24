from rest_framework import serializers
from .models_saas import Workspace, SubscriptionPlan, OrganizationSubscription, UsageTracker
from .models_invoice import Invoice


class WorkspaceSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = Workspace
        fields = ['id', 'organization', 'organization_name', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'organization', 'organization_name', 'created_at', 'updated_at']


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = ['id', 'name', 'code', 'price_monthly', 'max_tasks', 'max_members']
        read_only_fields = ['id']


class OrganizationSubscriptionSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_code = serializers.CharField(source='plan.code', read_only=True)
    price_monthly = serializers.DecimalField(source='plan.price_monthly', max_digits=8, decimal_places=2, read_only=True)
    max_tasks = serializers.IntegerField(source='plan.max_tasks', read_only=True)
    max_members = serializers.IntegerField(source='plan.max_members', read_only=True)

    class Meta:
        model = OrganizationSubscription
        fields = [
            'id', 'organization', 'plan', 'plan_name', 'plan_code', 
            'price_monthly', 'max_tasks', 'max_members', 'status', 'current_period_end',
            'stripe_customer_id', 'stripe_subscription_id'
        ]
        read_only_fields = ['id', 'organization', 'status', 'current_period_end']


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ['id', 'organization', 'amount', 'status', 'stripe_invoice_id', 'created_at']
        read_only_fields = ['id', 'organization', 'created_at']
