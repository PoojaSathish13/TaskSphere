import stripe
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


class StripeCheckoutSessionView(APIView):
    """
    Creates a Stripe Checkout Session for the requested subscription plan.
    Falls back to a simulated redirect URL when STRIPE_SECRET_KEY is absent.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.conf import settings
        organization = get_current_organization()
        if not organization:
            return Response({'error': 'Active organization context required.'}, status=status.HTTP_400_BAD_REQUEST)

        plan_code = request.data.get('plan_code')
        if not plan_code:
            return Response({'error': 'plan_code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Simulated mode: no Stripe key configured
        if not settings.STRIPE_SECRET_KEY:
            return Response({
                'checkout_url': 'http://localhost:3000/admin/billing?checkout=simulated',
                'simulated': True
            })

        try:
            plan = SubscriptionPlan.objects.get(code=plan_code)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Subscription plan not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not plan.stripe_price_id:
            return Response({'error': 'This plan does not have a Stripe price configured.'}, status=status.HTTP_400_BAD_REQUEST)

        stripe.api_key = settings.STRIPE_SECRET_KEY

        # Get or create the Stripe customer
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

        if sub.stripe_customer_id:
            stripe_customer_id = sub.stripe_customer_id
        else:
            customer = stripe.Customer.create(
                email=request.user.email,
                name=organization.name
            )
            stripe_customer_id = customer.id
            sub.stripe_customer_id = stripe_customer_id
            sub.save(update_fields=['stripe_customer_id'])

        try:
            session = stripe.checkout.Session.create(
                customer=stripe_customer_id,
                payment_method_types=['card'],
                mode='subscription',
                line_items=[{'price': plan.stripe_price_id, 'quantity': 1}],
                success_url='http://localhost:3000/admin/billing?checkout=success',
                cancel_url='http://localhost:3000/admin/billing?checkout=cancelled',
            )
        except stripe.error.StripeError as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({'checkout_url': session.url, 'simulated': False})


class StripeBillingPortalView(APIView):
    """
    Creates a Stripe Customer Billing Portal session so the user can manage
    their payment methods and subscriptions directly on Stripe.
    Falls back to a simulated URL when Stripe is not configured.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.conf import settings
        organization = get_current_organization()
        if not organization:
            return Response({'error': 'Active organization context required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not settings.STRIPE_SECRET_KEY:
            return Response({
                'portal_url': 'http://localhost:3000/admin/billing?portal=simulated',
                'simulated': True
            })

        sub = OrganizationSubscription.objects.filter(organization=organization).first()
        if not sub or not sub.stripe_customer_id:
            return Response({
                'portal_url': 'http://localhost:3000/admin/billing?portal=simulated',
                'simulated': True
            })

        stripe.api_key = settings.STRIPE_SECRET_KEY

        try:
            session = stripe.billing_portal.Session.create(
                customer=sub.stripe_customer_id,
                return_url='http://localhost:3000/admin/billing',
            )
        except stripe.error.StripeError as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({'portal_url': session.url, 'simulated': False})


class StripeWebhookView(APIView):
    """
    Processes incoming payment event webhooks from Stripe billing gateway.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.conf import settings
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        if settings.STRIPE_WEBHOOK_SECRET:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            try:
                event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
            except (ValueError, stripe.error.SignatureVerificationError):
                return Response({'error': 'Invalid signature'}, status=400)
        else:
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
