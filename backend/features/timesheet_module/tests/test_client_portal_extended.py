import pytest
from rest_framework import status
from features.rbac_module.models import Role, TenantMembership
from features.planner_module.models import Task
from features.timesheet_module.models import Project
from features.timesheet_module.models_client import (
    Release,
    ClientApprovalRequest,
    ClientProjectAccess,
    ClientDocument,
    ProjectActivity
)


@pytest.fixture
def client_user_ext(db):
    """Fixture creating client user."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return User.objects.create_user(
        email='client_ext@acme.com',
        password='clientpassword123',
        first_name='Acme Ext',
        last_name='Client'
    )


@pytest.fixture
def setup_client_role_ext(db, test_organization, client_user_ext, test_user):
    """Seed client role and link memberships."""
    client_role, _ = Role.objects.get_or_create(
        code='CLIENT',
        defaults={'name': 'Client'}
    )
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
    # Link client user
    TenantMembership.objects.create(
        user=client_user_ext,
        organization=test_organization,
        role=client_role
    )


@pytest.mark.django_db
def test_project_isolation_and_extended_portal_features(api_client, client_user_ext, test_user, test_organization, setup_client_role_ext):
    """
    Verify client user is strictly isolated to projects they are granted ClientProjectAccess to,
    and verify document list, activity timeline, needs clarification updates, and exports.
    """
    # 1. Create Projects
    accessible_project = Project.objects.create(
        name='Accessible Project',
        organization=test_organization,
        is_client_visible=True
    )
    hidden_project = Project.objects.create(
        name='Restricted Project',
        organization=test_organization,
        is_client_visible=True
    )

    # 2. Link access ONLY to accessible_project
    ClientProjectAccess.objects.create(
        project=accessible_project,
        user=client_user_ext,
        organization=test_organization
    )

    # 3. Create tasks linked to projects
    task_accessible = Task.objects.create(
        title='Visible Task',
        project=accessible_project,
        is_client_visible=True,
        organization=test_organization
    )
    task_hidden = Task.objects.create(
        title='Hidden Task',
        project=hidden_project,
        is_client_visible=True,
        organization=test_organization
    )

    # 4. Create document linked to projects
    doc_accessible = ClientDocument.objects.create(
        title='Accessible Docs',
        project=accessible_project,
        is_client_visible=True,
        organization=test_organization
    )
    doc_hidden = ClientDocument.objects.create(
        title='Hidden Docs',
        project=hidden_project,
        is_client_visible=True,
        organization=test_organization
    )

    # 5. Create activity logs
    act_accessible = ProjectActivity.objects.create(
        title='Accessible Milestone',
        project=accessible_project,
        activity_type='MILESTONE',
        organization=test_organization
    )
    act_hidden = ProjectActivity.objects.create(
        title='Hidden Milestone',
        project=hidden_project,
        activity_type='MILESTONE',
        organization=test_organization
    )

    # 6. Create approvals
    app_req = ClientApprovalRequest.objects.create(
        project=accessible_project,
        title='Milestone Sign-Off 1',
        description='Please review and sign off',
        requested_by=test_user,
        organization=test_organization,
        status='PENDING'
    )

    # Authenticate client user
    api_client.force_authenticate(user=client_user_ext)
    api_client.defaults['HTTP_X_ORGANIZATION_ID'] = str(test_organization.id)

    # A. Verify Project List: only accessible_project should be returned
    response = api_client.get('/api/v1/client/projects/')
    assert response.status_code == status.HTTP_200_OK
    project_ids = [p['id'] for p in response.data]
    assert str(accessible_project.id) in project_ids
    assert str(hidden_project.id) not in project_ids

    # B. Verify Task List isolation
    response = api_client.get('/api/v1/client/tasks/')
    assert response.status_code == status.HTTP_200_OK
    task_ids = [t['id'] for t in response.data]
    assert str(task_accessible.id) in task_ids
    assert str(task_hidden.id) not in task_ids

    # C. Verify Document List isolation
    response = api_client.get('/api/v1/client/documents/')
    assert response.status_code == status.HTTP_200_OK
    doc_ids = [d['id'] for d in response.data]
    assert str(doc_accessible.id) in doc_ids
    assert str(doc_hidden.id) not in doc_ids

    # D. Verify Activity Timeline isolation
    response = api_client.get('/api/v1/client/activities/')
    assert response.status_code == status.HTTP_200_OK
    activity_ids = [a['id'] for a in response.data]
    assert str(act_accessible.id) in activity_ids
    assert str(act_hidden.id) not in activity_ids

    # E. Verify Approval Decision - NEEDS_CLARIFICATION
    response = api_client.patch(f'/api/v1/client/approvals/{app_req.id}/', {
        'status': 'NEEDS_CLARIFICATION',
        'comments': 'We need further specs for verification.'
    })
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == 'NEEDS_CLARIFICATION'
    assert response.data['comments'] == 'We need further specs for verification.'

    # F. Verify Reports endpoint & exports
    response = api_client.get('/api/v1/client/reports/')
    assert response.status_code == status.HTTP_200_OK
    assert 'risks' in response.data

    # PDF export download check
    response = api_client.get('/api/v1/client/reports/export_pdf/')
    assert response.status_code == status.HTTP_200_OK
    assert response['Content-Type'] == 'application/pdf'
    
    # Excel/CSV export download check
    response = api_client.get('/api/v1/client/reports/export_excel/')
    assert response.status_code == status.HTTP_200_OK
    assert response['Content-Type'] == 'text/csv'
