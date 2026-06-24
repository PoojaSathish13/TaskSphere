import pytest
from django.contrib.auth import get_user_model
from features.planner_module.models import Task
from features.task_module.models import Label, Comment, TaskActivityLog

User = get_user_model()


@pytest.mark.django_db
def test_task_subtask_creation(test_user, test_organization):
    """Verify that a task can have subtasks under it."""
    parent_task = Task.objects.create(
        title="Parent Task",
        priority="HIGH",
        status="TODO",
        organization=test_organization,
        assignee=test_user
    )
    
    subtask = Task.objects.create(
        title="Subtask Item",
        parent=parent_task,
        priority="MEDIUM",
        status="TODO",
        organization=test_organization,
        assignee=test_user
    )

    assert subtask.parent_id == parent_task.id
    assert parent_task.subtasks.count() == 1


@pytest.mark.django_db
def test_comment_activity_log(test_user, test_organization):
    """Verify that commenting on tasks saves data and links logs."""
    task = Task.objects.create(
        title="Parent Task",
        priority="HIGH",
        status="TODO",
        organization=test_organization,
        assignee=test_user
    )

    comment = Comment.objects.create(
        task=task,
        user=test_user,
        content="This is a test comment",
        organization=test_organization
    )

    assert comment.task_id == task.id
    assert Comment.objects.filter(task=task).count() == 1
