from rest_framework import serializers
from .models import Role, Permission, TenantMembership, PermissionGroup


class PermissionGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermissionGroup
        fields = ['id', 'name', 'description']


class PermissionSerializer(serializers.ModelSerializer):
    group = PermissionGroupSerializer(read_only=True)

    class Meta:
        model = Permission
        fields = ['id', 'code', 'description', 'group']


class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Role
        fields = ['id', 'name', 'code', 'permissions']


class TenantMembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField(read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True)
    role_code = serializers.CharField(source='role.code', read_only=True)

    class Meta:
        model = TenantMembership
        fields = ['id', 'user', 'user_email', 'user_name', 'role', 'role_name', 'role_code', 'created_at']
        read_only_fields = ['id', 'user_email', 'user_name', 'role_name', 'role_code', 'created_at']

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
