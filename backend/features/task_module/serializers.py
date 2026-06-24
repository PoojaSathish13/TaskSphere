from rest_framework import serializers
from .models import Label, Comment, Attachment, TaskActivityLog
from django.contrib.auth import get_user_model
from features.planner_module.serializers import TaskSerializer

User = get_user_model()


class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ['id', 'name', 'color']
        read_only_fields = ['id']


class CommentSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'task', 'user', 'user_email', 'user_name', 'content', 'created_at']
        read_only_fields = ['id', 'user', 'user_email', 'user_name', 'created_at']

    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
        return "Unknown"


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_email = serializers.EmailField(source='uploaded_by.email', read_only=True)

    class Meta:
        model = Attachment
        fields = ['id', 'task', 'file', 'filename', 'uploaded_by', 'uploaded_by_email', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_by', 'uploaded_by_email', 'uploaded_at']


class TaskActivityLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = TaskActivityLog
        fields = ['id', 'task', 'user', 'user_email', 'field_changed', 'old_value', 'new_value', 'timestamp']
        read_only_fields = ['id', 'user', 'user_email', 'timestamp']
