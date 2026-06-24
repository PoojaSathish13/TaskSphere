import pytest
from django.utils import timezone
from rest_framework import status
from features.timesheet_module.models import TimesheetEntry, Project
from features.rbac_module.models import Role, TenantMembership
from features.planner_module.models import Task


@pytest.fixture
def manager_user(db):
    """Fixture creating manager user."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return User.objects.create_user(
        email='manager@tasksphere.com',
        password='managerpassword123',
        first_name='Manager',
        last_name='User'
    )


@pytest.fixture
def setup_rbac_roles(db, test_organization, test_user, manager_user):
    """Seed roles and link memberships."""
    # Seed manager role
    manager_role, _ = Role.objects.get_or_create(
        code='manager',
        defaults={'name': 'Manager'}
    )
    # Seed admin role
    admin_role, _ = Role.objects.get_or_create(
        code='admin',
        defaults={'name': 'Administrator'}
    )
    # Link employee user
    TenantMembership.objects.create(
        user=test_user,
        organization=test_organization,
        role=admin_role
    )
    # Link manager user
    TenantMembership.objects.create(
        user=manager_user,
        organization=test_organization,
        role=manager_role
    )


@pytest.fixture
def test_project(db, test_organization):
    """Fixture creating a test project."""
    return Project.objects.create(
        name='Project Delta',
        description='Apollo project',
        organization=test_organization
    )


@pytest.fixture
def test_task(db, test_organization):
    """Fixture creating a test task."""
    return Task.objects.create(
        title='Design Database Schema',
        estimated_hours=10.0,
        actual_hours=0.0,
        organization=test_organization
    )


@pytest.mark.django_db
def test_timesheet_workflow(api_client, test_user, manager_user, test_organization, test_project, test_task, setup_rbac_roles):
    """Verify Draft -> Submitted -> Approved/Rejected workflow transitions."""
    # 1. Log Draft time entry
    api_client.force_authenticate(user=test_user)
    payload = {
        'project': str(test_project.id),
        'task': str(test_task.id),
        'date': '2026-06-23',
        'hours_logged': 8.0,
        'description': 'Implementing endpoints',
        'is_billable': True
    }
    
    # Set organization header
    api_client.defaults['HTTP_X_ORGANIZATION_ID'] = str(test_organization.id)
    
    response = api_client.post('/api/v1/timesheets/', payload)
    assert response.status_code == status.HTTP_201_CREATED
    entry_id = response.data['id']
    
    entry = TimesheetEntry.objects.get(id=entry_id)
    assert entry.status == 'DRAFT'
    assert float(entry.hours_logged) == 8.0
    
    # 2. Submit timesheet
    response = api_client.post(f'/api/v1/timesheets/{entry_id}/submit/')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == 'SUBMITTED'
    
    # 3. Manager Approve Timesheet
    api_client.force_authenticate(user=manager_user)
    response = api_client.post(f'/api/v1/timesheets/{entry_id}/approve/')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == 'APPROVED'
    
    # Confirm Task actual hours updated
    test_task.refresh_from_db()
    assert float(test_task.actual_hours) == 8.0


@pytest.mark.django_db
def test_timesheet_rejection(api_client, test_user, manager_user, test_organization, test_project, setup_rbac_roles):
    """Verify rejection constraints require comments."""
    api_client.force_authenticate(user=test_user)
    api_client.defaults['HTTP_X_ORGANIZATION_ID'] = str(test_organization.id)
    
    entry = TimesheetEntry.objects.create(
        user=test_user,
        organization=test_organization,
        project=test_project,
        date='2026-06-23',
        hours_logged=4.5,
        status='SUBMITTED'
    )
    
    api_client.force_authenticate(user=manager_user)
    
    # Reject without comments (Should fail validation)
    response = api_client.post(f'/api/v1/timesheets/{entry.id}/reject/', {'rejection_comments': ''})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    # Reject with comments (Should succeed)
    response = api_client.post(f'/api/v1/timesheets/{entry.id}/reject/', {
        'status': 'REJECTED',
        'rejection_comments': 'Please provide more details.'
    })
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == 'REJECTED'


@pytest.mark.django_db
def test_summary_aggregations(api_client, test_user, test_organization, test_project, test_task, setup_rbac_roles):
    """Verify summary API aggregates metrics correctly."""
    api_client.force_authenticate(user=test_user)
    api_client.defaults['HTTP_X_ORGANIZATION_ID'] = str(test_organization.id)
    
    # Log billable hours
    TimesheetEntry.objects.create(
        user=test_user,
        organization=test_organization,
        project=test_project,
        task=test_task,
        date='2026-06-23',
        hours_logged=6.0,
        is_billable=True,
        status='APPROVED'
    )
    
    # Log non-billable hours
    TimesheetEntry.objects.create(
        user=test_user,
        organization=test_organization,
        project=test_project,
        task=test_task,
        date='2026-06-24',
        hours_logged=2.0,
        is_billable=False,
        status='APPROVED'
    )
    
    response = api_client.get('/api/v1/timesheets/summary/')
    assert response.status_code == status.HTTP_200_OK
    data = response.data
    assert data['total_hours'] == 8.0
    assert data['billable_hours'] == 6.0
    assert data['utilization_rate'] == 75.0
