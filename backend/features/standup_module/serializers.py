from rest_framework import serializers
from .models import DailyStandup
from django.contrib.auth import get_user_model

User = get_user_model()


class DailyStandupSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DailyStandup
        fields = [
            'id', 'user', 'user_email', 'user_name', 'date', 
            'yesterday_text', 'today_text', 'blockers_text', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'user_email', 'user_name', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
        return "Unknown"
