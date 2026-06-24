from rest_framework import serializers
from .models import Task, TaskDependency, DailyPlan
from django.contrib.auth import get_user_model

User = get_user_model()


class TaskSerializer(serializers.ModelSerializer):
    assignee_email = serializers.EmailField(source='assignee.email', read_only=True)
    organization_slug = serializers.SlugField(source='organization.slug', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'priority', 'status', 
            'estimated_hours', 'actual_hours', 'due_date', 
            'assignee', 'assignee_email', 'organization', 'organization_slug'
        ]
        read_only_fields = ['id', 'assignee_email', 'organization_slug']

    def validate_estimated_hours(self, value):
        if value < 0:
            raise serializers.ValidationError("Estimated hours cannot be negative.")
        return value


class TaskDependencySerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source='task.title', read_only=True)
    depends_on_title = serializers.CharField(source='depends_on.title', read_only=True)

    class Meta:
        model = TaskDependency
        fields = ['id', 'task', 'task_title', 'depends_on', 'depends_on_title']
        read_only_fields = ['id', 'task_title', 'depends_on_title']


class DailyPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyPlan
        fields = ['id', 'user', 'date', 'tasks_order']
        read_only_fields = ['id', 'user']
