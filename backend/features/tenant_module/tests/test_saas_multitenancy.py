import pytest
from datetime import date, timedelta
from rest_framework import status
from features.rbac_module.models import Role, TenantMembership
from features.planner_module.models import Task
from features.tenant_module.models import Organization
from features.tenant_module.models_saas import Workspace, SubscriptionPlan, OrganizationSubscription, UsageTracker
from features.audit_module.models import AuditLog


@pytest.fixture
def setup_saas_fixtures(db, test_organization, test_user):
    """Seed base plans and active subscription."""
    # Seed plans
    free_plan, _ = SubscriptionPlan.objects.get_or_create(
        code='FREE',
        defaults={'name': 'Free Tier', 'price_monthly': 0.0, 'max_tasks': 2, 'max_members': 5}
    )
    pro_plan, _ = SubscriptionPlan.objects.get_or_create(
        code='PRO',
        defaults={'name': 'Pro Tier', 'price_monthly': 29.0, 'max_tasks': 500, 'max_members': 50}
    )
    
    # Active subscription for test tenant
    sub = OrganizationSubscription.objects.create(
        organization=test_organization,
        plan=free_plan,
        status='ACTIVE',
        current_period_end=date.today() + timedelta(days=30)
    )

    admin_role, _ = Role.objects.get_or_create(
        code='admin',
        defaults={'name': 'Administrator'}
    )
    TenantMembership.objects.get_or_create(
        user=test_user,
        organization=test_organization,
        role=admin_role
    )


@pytest.mark.django_db
def test_saas_workspace_and_tenant_isolation(api_client, test_user, test_organization, setup_saas_fixtures):
    """Verify workspaces are isolated and can be created inside tenant contexts."""
    api_client.force_authenticate(user=test_user)
    api_client.defaults['HTTP_X_ORGANIZATION_ID'] = str(test_organization.id)

    # 1. Create Workspace
    response = api_client.post('/api/v1/organizations/workspaces/', {
        'name': 'Engineering Department',
        'description': 'Dev division workspace'
    })
    assert response.status_code == status.HTTP_201_CREATED
    workspace_id = response.data['id']

    # 2. Get Workspaces List
    response = api_client.get('/api/v1/organizations/workspaces/')
    assert response.status_code == status.HTTP_200_OK
    workspace_ids = [w['id'] for w in response.data]
    assert workspace_id in workspace_ids

    # 3. Create workspace in isolated Org context to verify separation
    other_org = Organization.objects.create(name='Other Org', slug='other-org')
    api_client.defaults['HTTP_X_ORGANIZATION_ID'] = str(other_org.id)
    response = api_client.get('/api/v1/organizations/workspaces/')
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 0


@pytest.mark.django_db
def test_saas_subscription_plans_and_upgrade(api_client, test_user, test_organization, setup_saas_fixtures):
    """Verify subscription tiers and capability to upgrade plan."""
    api_client.force_authenticate(user=test_user)
    api_client.defaults['HTTP_X_ORGANIZATION_ID'] = str(test_organization.id)

    # Check active subscription plan
    response = api_client.get('/api/v1/organizations/subscription/')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['plan_code'] == 'FREE'

    # Upgrade to PRO plan
    response = api_client.post('/api/v1/organizations/subscription/', {'plan_code': 'PRO'})
    assert response.status_code == status.HTTP_200_OK
    assert response.data['plan_code'] == 'PRO'

    # Verify upgrade is persisted
    response = api_client.get('/api/v1/organizations/subscription/')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['plan_code'] == 'PRO'


@pytest.mark.django_db
def test_saas_usage_quota_limits(api_client, test_user, test_organization, setup_saas_fixtures):
    """Verify tasks creation is blocked once limits defined in the active plan are exceeded."""
    api_client.force_authenticate(user=test_user)
    api_client.defaults['HTTP_X_ORGANIZATION_ID'] = str(test_organization.id)

    # The Free plan fixture max_tasks = 2
    # Create Task 1
    response = api_client.post('/api/v1/planner/tasks/', {
        'title': 'Task One',
        'priority': 'LOW',
        'status': 'TODO',
        'organization': test_organization.id
    })
    assert response.status_code == status.HTTP_201_CREATED

    # Create Task 2
    response = api_client.post('/api/v1/planner/tasks/', {
        'title': 'Task Two',
        'priority': 'LOW',
        'status': 'TODO',
        'organization': test_organization.id
    })
    assert response.status_code == status.HTTP_201_CREATED

    # Create Task 3 (Should be rejected with 400 validation error since quota is full)
    response = api_client.post('/api/v1/planner/tasks/', {
        'title': 'Task Three',
        'priority': 'LOW',
        'status': 'TODO',
        'organization': test_organization.id
    })
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Task limit reached" in str(response.data)

    # Verify usage metrics endpoint reflects exact values
    response = api_client.get('/api/v1/organizations/usage/')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['tasks_usage']['current'] == 2
    assert response.data['tasks_usage']['limit'] == 2
    assert response.data['tasks_usage']['percentage'] == 100.0
