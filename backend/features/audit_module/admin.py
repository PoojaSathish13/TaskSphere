from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'actor', 'organization', 'content_type', 'object_id', 'ip_address', 'created_at')
    list_filter = ('action', 'organization', 'created_at')
    search_fields = ('actor__email', 'object_id', 'ip_address')
    readonly_fields = ('id', 'actor', 'organization', 'action', 'content_type', 'object_id', 'payload', 'ip_address', 'created_at')
