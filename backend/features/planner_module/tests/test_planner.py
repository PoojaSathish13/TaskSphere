import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from features.planner_module.models import Task, TaskDependency
from features.planner_module.algorithms import suggest_work_plan

User = get_user_model()


@pytest.mark.django_db
def test_topological_suggest_plan(test_user, test_organization):
    """Verify that Kahn's sort sequences dependencies correctly."""
    # Create Task A (blocks Task B)
    task_a = Task.objects.create(
        title="Deploy PostgreSQL",
        priority="HIGH",
        status="TODO",
        estimated_hours=Decimal("3.0"),
        organization=test_organization,
        assignee=test_user
    )
    
    # Create Task B (depends on Task A)
    task_b = Task.objects.create(
        title="Configure DB Caching",
        priority="MEDIUM",
        status="TODO",
        estimated_hours=Decimal("2.0"),
        organization=test_organization,
        assignee=test_user
    )

    # Establish dependency: B depends on A
    TaskDependency.objects.create(
        task=task_b,
        depends_on=task_a,
        organization=test_organization
    )

    # Run Suggested plan
    result = suggest_work_plan(test_user, test_organization.id)
    suggested = result["suggested_order"]

    assert len(suggested) == 2
    # Task A must be sequenced before Task B
    assert suggested[0].id == task_a.id
    assert suggested[1].id == task_b.id
    assert len(result["risks"]) == 0


@pytest.mark.django_db
def test_workload_overload_risk(test_user, test_organization):
    """Verify that exceeding 8 working hours triggers overload warnings."""
    # Task A
    Task.objects.create(
        title="Write API specs",
        priority="HIGH",
        status="TODO",
        estimated_hours=Decimal("5.0"),
        organization=test_organization,
        assignee=test_user
    )
    
    # Task B
    Task.objects.create(
        title="Refactor Frontend",
        priority="MEDIUM",
        status="TODO",
        estimated_hours=Decimal("4.5"),
        organization=test_organization,
        assignee=test_user
    )

    result = suggest_work_plan(test_user, test_organization.id)
    assert len(result["suggested_order"]) == 2
    
    # Risks must contain OVERLOAD
    overload_risk = [r for r in result["risks"] if r["code"] == "WORKLOAD_OVERLOAD"]
    assert len(overload_risk) == 1
    assert "9.5" in overload_risk[0]["message"]


@pytest.mark.django_db
def test_circular_dependency_fallback(test_user, test_organization):
    """Verify that circular dependency maps warnings and falls back to priority."""
    task_a = Task.objects.create(
        title="Task A", priority="HIGH", status="TODO", organization=test_organization, assignee=test_user
    )
    task_b = Task.objects.create(
        title="Task B", priority="MEDIUM", status="TODO", organization=test_organization, assignee=test_user
    )

    # A blocks B, and B blocks A
    TaskDependency.objects.create(task=task_b, depends_on=task_a, organization=test_organization)
    TaskDependency.objects.create(task=task_a, depends_on=task_b, organization=test_organization)

    result = suggest_work_plan(test_user, test_organization.id)
    
    # Risks must contain CIRCULAR_DEPENDENCY
    circular_risk = [r for r in result["risks"] if r["code"] == "CIRCULAR_DEPENDENCY"]
    assert len(circular_risk) == 1
    assert len(result["suggested_order"]) == 2
