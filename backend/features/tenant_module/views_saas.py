from datetime import date, timedelta
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from features.tenant_module.context import get_current_organization
from features.planner_module.models import Task
from features.rbac_module.models import TenantMembership
from features.audit_module.models import AuditLog
from features.audit_module.serializers import AuditLogSerializer
from .models_saas import Workspace, SubscriptionPlan, OrganizationSubscription, UsageTracker
from .models_invoice import Invoice
from .serializers_saas import WorkspaceSerializer, SubscriptionPlanSerializer, OrganizationSubscriptionSerializer, InvoiceSerializer


class WorkspaceViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Workspaces within the active Organization scope.
    """
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return Workspace.objects.none()
        return Workspace.objects.filter(organization=organization).order_by('-created_at')

    def perform_create(self, serializer):
        organization = get_current_organization()
        serializer.save(organization=organization)


class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Exposes available SaaS subscription plans.
    """
    queryset = SubscriptionPlan.objects.all().order_by('price_monthly')
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.IsAuthenticated]


class OrganizationSubscriptionView(APIView):
    """
    Endpoint for fetching and upgrading/downgrading active tenant subscriptions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        organization = get_current_organization()
        if not organization:
            return Response({'error': 'Active organization context required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        sub, created = OrganizationSubscription.objects.get_or_create(
            organization=organization,
            defaults={
                'plan': SubscriptionPlan.objects.get_or_create(
                    code='FREE',
                    defaults={'name': 'Free', 'price_monthly': 0.0, 'max_tasks': 50, 'max_members': 5}
                )[0],
                'status': 'ACTIVE',
                'current_period_end': date.today() + timedelta(days=30)
            }
        )
        
        serializer = OrganizationSubscriptionSerializer(sub)
        return Response(serializer.data)

    def post(self, request):
        organization = get_current_organization()
        if not organization:
            return Response({'error': 'Active organization context required.'}, status=status.HTTP_400_BAD_REQUEST)

        plan_code = request.data.get('plan_code')
        if not plan_code:
            return Response({'error': 'plan_code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_plan = SubscriptionPlan.objects.get(code=plan_code)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Subscription plan does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        sub, _ = OrganizationSubscription.objects.get_or_create(
            organization=organization,
            defaults={
                'plan': SubscriptionPlan.objects.get_or_create(
                    code='FREE',
                    defaults={'name': 'Free', 'price_monthly': 0.0, 'max_tasks': 50, 'max_members': 5}
                )[0],
                'status': 'ACTIVE',
                'current_period_end': date.today() + timedelta(days=30)
            }
        )

        sub.plan = target_plan
        sub.current_period_end = date.today() + timedelta(days=30)
        sub.save()

        # Audit Log upgrade
        from features.audit_module.services import log_action
        log_action(
            actor=request.user,
            organization=organization,
            action='UPDATE',
            target_instance=sub,
            payload={'new_plan': plan_code}
        )

        serializer = OrganizationSubscriptionSerializer(sub)
        return Response(serializer.data)


class TenantUsageAPIView(APIView):
    """
    Exposes usage tracking stats against the subscription tier limits.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        organization = get_current_organization()
        if not organization:
            return Response({'error': 'Active organization context required.'}, status=status.HTTP_400_BAD_REQUEST)

        sub, _ = OrganizationSubscription.objects.get_or_create(
            organization=organization,
            defaults={
                'plan': SubscriptionPlan.objects.get_or_create(
                    code='FREE',
                    defaults={'name': 'Free', 'price_monthly': 0.0, 'max_tasks': 50, 'max_members': 5}
                )[0],
                'status': 'ACTIVE',
                'current_period_end': date.today() + timedelta(days=30)
            }
        )

        tasks_count = Task.objects.filter(organization=organization).count()
        members_count = TenantMembership.objects.filter(organization=organization).count()

        return Response({
            'plan_name': sub.plan.name,
            'plan_code': sub.plan.code,
            'tasks_usage': {
                'current': tasks_count,
                'limit': sub.plan.max_tasks,
                'percentage': round((tasks_count / sub.plan.max_tasks * 100), 1) if sub.plan.max_tasks > 0 else 100
            },
            'members_usage': {
                'current': members_count,
                'limit': sub.plan.max_members,
                'percentage': round((members_count / sub.plan.max_members * 100), 1) if sub.plan.max_members > 0 else 100
            }
        })


class SaasAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin audit log view filtered strictly by the tenant context.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return AuditLog.objects.none()
        return AuditLog.objects.filter(organization=organization).order_by('-created_at')


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Simulated invoice logs filtered strictly by active organization.
    """
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        organization = get_current_organization()
        if not organization:
            return Invoice.objects.none()
        return Invoice.objects.filter(organization=organization).order_by('-created_at')


class StripeWebhookView(APIView):
    """
    Processes incoming payment event webhooks from Stripe billing gateway.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        event = request.data
        event_type = event.get('type')
        data_obj = event.get('data', {}).get('object', {})
        
        stripe_sub_id = data_obj.get('subscription') or data_obj.get('id')
        stripe_cust_id = data_obj.get('customer')
        
        sub = None
        if stripe_sub_id:
            sub = OrganizationSubscription.objects.filter(stripe_subscription_id=stripe_sub_id).first()
        if not sub and stripe_cust_id:
            sub = OrganizationSubscription.objects.filter(stripe_customer_id=stripe_cust_id).first()
            
        if not sub:
            sub = OrganizationSubscription.objects.first()

        if sub:
            if event_type == 'invoice.paid':
                sub.status = 'ACTIVE'
                sub.save()
                Invoice.objects.create(
                    organization=sub.organization,
                    amount=data_obj.get('amount_paid', 2900) / 100.0,
                    status='PAID',
                    stripe_invoice_id=data_obj.get('id', '')
                )
            elif event_type == 'invoice.payment_failed':
                sub.status = 'PAST_DUE'
                sub.save()
                Invoice.objects.create(
                    organization=sub.organization,
                    amount=data_obj.get('amount_due', 2900) / 100.0,
                    status='FAILED',
                    stripe_invoice_id=data_obj.get('id', '')
                )
            elif event_type in ['customer.subscription.updated', 'subscription.updated']:
                stripe_status = data_obj.get('status')
                status_map = {
                    'active': 'ACTIVE',
                    'trialing': 'TRIALING',
                    'past_due': 'PAST_DUE',
                    'canceled': 'CANCELED',
                    'incomplete_expired': 'EXPIRED'
                }
                sub.status = status_map.get(stripe_status, sub.status)
                sub.save()
                
            return Response({'status': 'success'})
        return Response({'status': 'ignored'}, status=200)
