from rest_framework import serializers
from .models import TimesheetEntry, Project
from features.planner_module.serializers import TaskSerializer


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class TimesheetEntrySerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source='task.title', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    approved_by_email = serializers.EmailField(source='approved_by.email', read_only=True)

    class Meta:
        model = TimesheetEntry
        fields = [
            'id', 'user', 'user_email', 'project', 'project_name', 'task', 'task_title', 
            'date', 'hours_logged', 'description', 'is_billable', 'status', 
            'rejection_comments', 'approved_by', 'approved_by_email', 'approved_at', 
            'submitted_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'user_email', 'project_name', 'task_title', 'status', 
            'rejection_comments', 'approved_by', 'approved_by_email', 'approved_at', 
            'submitted_at', 'created_at', 'updated_at'
        ]

    def validate_hours_logged(self, value):
        if value < 0:
            raise serializers.ValidationError("Hours logged cannot be negative.")
        if value > 24:
            raise serializers.ValidationError("Hours logged cannot exceed 24 hours in a single day.")
        return value


class TimesheetApprovalSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['APPROVED', 'REJECTED'])
    rejection_comments = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        status = attrs.get('status')
        comments = attrs.get('rejection_comments')
        if status == 'REJECTED' and not comments:
            raise serializers.ValidationError({"rejection_comments": "Rejection comments are required when rejecting a timesheet."})
        return attrs
