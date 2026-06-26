from django.contrib import admin
from .models import PermissionGroup, Permission, Role, TenantMembership

@admin.register(PermissionGroup)
class PermissionGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'created_at')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ('code', 'group', 'description', 'created_at')
    list_filter = ('group',)
    search_fields = ('code', 'description')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'created_at')
    search_fields = ('name', 'code')
    filter_horizontal = ('permissions',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(TenantMembership)
class TenantMembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'organization', 'role', 'created_at')
    list_filter = ('organization', 'role')
    search_fields = ('user__email', 'organization__name', 'role__name')
    readonly_fields = ('created_at', 'updated_at')
