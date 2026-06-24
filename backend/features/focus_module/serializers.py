from rest_framework import serializers
from .models import FocusSession, ProductivityMetric
from features.planner_module.serializers import TaskSerializer


class FocusSessionSerializer(serializers.ModelSerializer):
    task_details = TaskSerializer(source='task', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = FocusSession
        fields = [
            'id', 'user', 'user_email', 'task', 'task_details', 
            'started_at', 'completed_at', 'duration_seconds', 
            'context_switches', 'completed'
        ]
        read_only_fields = ['id', 'user', 'user_email', 'started_at', 'completed_at']


class ProductivityMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductivityMetric
        fields = ['id', 'user', 'date', 'focus_seconds', 'productivity_score']
        read_only_fields = ['id', 'user', 'date']
