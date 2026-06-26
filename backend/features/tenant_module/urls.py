from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet
from .views_saas import (
    WorkspaceViewSet,
    SubscriptionPlanViewSet,
    OrganizationSubscriptionView,
    TenantUsageAPIView,
    SaasAuditLogViewSet,
    InvoiceViewSet,
    StripeWebhookView,
    StripeCheckoutSessionView,
    StripeBillingPortalView
)

router = DefaultRouter()
router.register('workspaces', WorkspaceViewSet, basename='workspaces')
router.register('plans', SubscriptionPlanViewSet, basename='plans')
router.register('audit-logs', SaasAuditLogViewSet, basename='saas-audit-logs')
router.register('invoices', InvoiceViewSet, basename='invoices')
router.register(r'', OrganizationViewSet, basename='organization')

urlpatterns = [
    path('subscription/', OrganizationSubscriptionView.as_view(), name='subscription'),
    path('usage/', TenantUsageAPIView.as_view(), name='tenant-usage'),
    path('stripe-webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('stripe-checkout/', StripeCheckoutSessionView.as_view(), name='stripe-checkout'),
    path('stripe-portal/', StripeBillingPortalView.as_view(), name='stripe-portal'),
    path('', include(router.urls)),
]
