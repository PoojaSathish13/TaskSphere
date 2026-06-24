import pytest
from datetime import date, timedelta
from rest_framework import status
from django.contrib.auth import get_user_model
from features.rbac_module.models import Role, TenantMembership
from features.rbac_module.seeder import seed_rbac_permissions
from features.tenant_module.models import Organization
from features.tenant_module.models_saas import SubscriptionPlan, OrganizationSubscription
from features.tenant_module.models_invoice import Invoice

User = get_user_model()


@pytest.fixture
def setup_billing_fixtures(db, test_organization, test_user):
    """Seed subscription plan and membership contexts."""
    # Seed SaaS plans
    free_plan, _ = SubscriptionPlan.objects.get_or_create(
        code='FREE',
        defaults={'name': 'Free Tier', 'price_monthly': 0.0, 'max_tasks': 50, 'max_members': 3}
    )
    
    # Active subscription with limit of 3 members max
    sub = OrganizationSubscription.objects.create(
        organization=test_organization,
        plan=free_plan,
        status='ACTIVE',
        current_period_end=date.today() + timedelta(days=30),
        stripe_customer_id='cus_test123',
        stripe_subscription_id='sub_test123'
    )

    # Seed RBAC system and fetch SUPER_ADMIN role
    seed_rbac_permissions()
    admin_role = Role.objects.get(code='SUPER_ADMIN')
    
    TenantMembership.objects.create(
        user=test_user,
        organization=test_organization,
        role=admin_role
    )

    return {
        'admin_role': admin_role,
        'free_plan': free_plan
    }


@pytest.mark.django_db
def test_member_seat_limits_gating(api_client, test_user, test_organization, setup_billing_fixtures):
    """Verify team membership creation is blocked once seat count limits are exceeded."""
    admin_role = setup_billing_fixtures['admin_role']
    api_client.force_authenticate(user=test_user)
    api_client.defaults['HTTP_X_ORGANIZATION_ID'] = str(test_organization.id)

    # 1. Add 2 more members (Total members will be 3)
    user2 = User.objects.create_user(email='user2@acme.com', password='pw1')
    response = api_client.post('/api/v1/rbac/members/', {
        'user': user2.id,
        'role': admin_role.id
    })
    assert response.status_code == status.HTTP_201_CREATED

    user3 = User.objects.create_user(email='user3@acme.com', password='pw2')
    response = api_client.post('/api/v1/rbac/members/', {
        'user': user3.id,
        'role': admin_role.id
    })
    assert response.status_code == status.HTTP_201_CREATED

    # 2. Add 4th member (Should exceed seat limit of 3, raising 400 Bad Request)
    user4 = User.objects.create_user(email='user4@acme.com', password='pw3')
    response = api_client.post('/api/v1/rbac/members/', {
        'user': user4.id,
        'role': admin_role.id
    })
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "seat limit reached" in str(response.data)


@pytest.mark.django_db
def test_stripe_billing_webhooks_and_invoices(api_client, test_user, test_organization, setup_billing_fixtures):
    """Verify webhook processing of paid, failed, and status updates, and verify invoices listing."""
    # Stripe webhooks do not require user authentication headers
    api_client.force_authenticate(user=None)
    if 'HTTP_X_ORGANIZATION_ID' in api_client.defaults:
        del api_client.defaults['HTTP_X_ORGANIZATION_ID']

    # 1. Test invoice.paid event
    response = api_client.post('/api/v1/organizations/stripe-webhook/', {
        'type': 'invoice.paid',
        'data': {
            'object': {
                'id': 'in_paid_test',
                'customer': 'cus_test123',
                'subscription': 'sub_test123',
                'amount_paid': 2900 # $29.00
            }
        }
    }, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == 'success'

    # Verify paid invoice is created
    sub = OrganizationSubscription.objects.get(stripe_subscription_id='sub_test123')
    assert sub.status == 'ACTIVE'
    inv = Invoice.objects.filter(organization=sub.organization).first()
    assert inv is not None
    assert inv.amount == 29.00
    assert inv.status == 'PAID'

    # 2. Test invoice.payment_failed event
    response = api_client.post('/api/v1/organizations/stripe-webhook/', {
        'type': 'invoice.payment_failed',
        'data': {
            'object': {
                'id': 'in_failed_test',
                'customer': 'cus_test123',
                'subscription': 'sub_test123',
                'amount_due': 2900
            }
        }
    }, format='json')
    assert response.status_code == status.HTTP_200_OK

    sub.refresh_from_db()
    assert sub.status == 'PAST_DUE'
    assert Invoice.objects.filter(status='FAILED').exists()

    # 3. Test customer.subscription.updated event - status canceled
    response = api_client.post('/api/v1/organizations/stripe-webhook/', {
        'type': 'customer.subscription.updated',
        'data': {
            'object': {
                'id': 'sub_test123',
                'status': 'canceled'
            }
        }
    }, format='json')
    assert response.status_code == status.HTTP_200_OK
    sub.refresh_from_db()
    assert sub.status == 'CANCELED'

    # 4. Verify invoices listing via API
    api_client.force_authenticate(user=test_user)
    api_client.defaults['HTTP_X_ORGANIZATION_ID'] = str(test_organization.id)
    response = api_client.get('/api/v1/organizations/invoices/')
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 2 # Paid + Failed Invoices
