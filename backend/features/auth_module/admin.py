from django.contrib import admin
from .models import User
from .models_session import UserSession

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'first_name', 'last_name', 'is_active', 'is_staff', 'mfa_enabled', 'created_at')
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'mfa_enabled', 'created_at')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('MFA Info', {'fields': ('mfa_enabled', 'mfa_secret', 'mfa_backup_codes')}),
        ('Lockout Settings', {'fields': ('login_attempts', 'locked_until')}),
        ('Dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    readonly_fields = ('created_at', 'updated_at', 'last_login')

@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'ip_address', 'is_active', 'last_active', 'created_at')
    list_filter = ('is_active', 'created_at', 'last_active')
    search_fields = ('user__email', 'ip_address', 'user_agent')
    readonly_fields = ('created_at', 'last_active')
