from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'verb', 'description', 'is_read', 'data', 'created_at']
        read_only_fields = ['id', 'verb', 'description', 'data', 'created_at']
