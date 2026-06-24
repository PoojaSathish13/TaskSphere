from rest_framework import serializers
from .models import TaskBlocker, BlockerAuditLog
from django.utils import timezone
from features.planner_module.serializers import TaskSerializer


class TaskBlockerSerializer(serializers.ModelSerializer):
    task_details = TaskSerializer(source='task', read_only=True)
    risk_score = serializers.SerializerMethodField(read_only=True)
    time_active_hours = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TaskBlocker
        fields = [
            'id', 'task', 'task_details', 'blocker_type', 'status', 
            'description', 'root_cause', 'resolution_notes', 'sla_hours', 'is_escalated', 'risk_score',
            'time_active_hours', 'resolved_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_escalated', 'resolved_at', 'created_at', 'updated_at']

    def get_time_active_hours(self, obj):
        end_time = obj.resolved_at or timezone.now()
        delta = end_time - obj.created_at
        return round(delta.total_seconds() / 3600.0, 1)

    def get_risk_score(self, obj):
        # Weight vectors
        weights = {
            'TECHNICAL': 1.5,
            'APPROVAL': 1.2,
            'CLIENT': 1.0,
            'DEVOPS': 0.9,
            'QA': 0.8
        }
        weight = weights.get(obj.blocker_type, 1.0)
        hours = self.get_time_active_hours(obj)
        
        # Calculate base score
        score = hours * weight
        if obj.is_escalated:
            score *= 2.0
            
        return round(score, 1)


class BlockerAuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = BlockerAuditLog
        fields = ['id', 'blocker', 'action', 'user', 'user_email', 'notes', 'timestamp']
        read_only_fields = ['id', 'user', 'user_email', 'timestamp']
