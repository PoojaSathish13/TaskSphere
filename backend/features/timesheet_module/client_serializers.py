from rest_framework import serializers
from features.planner_module.models import Task
from .models import Project
from .models_client import Release, ClientApprovalRequest, ClientDocument, ProjectActivity


class ClientProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'is_client_visible', 'created_at']
        read_only_fields = fields


class ClientTaskSerializer(serializers.ModelSerializer):
    """
    Client-safe Task serializer restricting visibility of internal hours and audits.
    """
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'priority', 'status', 'due_date', 'is_client_visible', 'project', 'project_name']
        read_only_fields = ['id', 'title', 'description', 'priority', 'status', 'due_date', 'is_client_visible', 'project', 'project_name']


class ReleaseSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Release
        fields = ['id', 'project', 'project_name', 'version', 'release_date', 'status', 'notes', 'created_at']
        read_only_fields = ['id', 'project_name', 'created_at']


class ClientApprovalRequestSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    requested_by_email = serializers.EmailField(source='requested_by.email', read_only=True)

    class Meta:
        model = ClientApprovalRequest
        fields = ['id', 'project', 'project_name', 'title', 'description', 'status', 'requested_by_email', 'comments', 'created_at', 'updated_at']
        read_only_fields = ['id', 'project', 'project_name', 'title', 'description', 'requested_by_email', 'created_at', 'updated_at']

    def validate_status(self, value):
        valid_transitions = ['APPROVED', 'REJECTED', 'NEEDS_CLARIFICATION']
        if value not in valid_transitions:
            raise serializers.ValidationError(f"Clients can only transition status to: {', '.join(valid_transitions)}.")
        return value


class ClientDocumentSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    uploaded_by_email = serializers.EmailField(source='uploaded_by.email', read_only=True)

    class Meta:
        model = ClientDocument
        fields = ['id', 'project', 'project_name', 'title', 'description', 'file_url', 'uploaded_by_email', 'is_client_visible', 'created_at', 'updated_at']
        read_only_fields = ['id', 'project_name', 'uploaded_by_email', 'created_at', 'updated_at']


class ProjectActivitySerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)

    class Meta:
        model = ProjectActivity
        fields = ['id', 'project', 'project_name', 'activity_type', 'title', 'description', 'created_by_email', 'created_at']
        read_only_fields = ['id', 'project_name', 'created_by_email', 'created_at']
