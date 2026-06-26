from django.contrib import admin
from .models import TaskBlocker, BlockerAuditLog

@admin.register(TaskBlocker)
class TaskBlockerAdmin(admin.ModelAdmin):
    list_display = ('task', 'blocker_type', 'status', 'root_cause', 'is_escalated', 'organization', 'created_at')
    list_filter = ('status', 'blocker_type', 'root_cause', 'is_escalated', 'organization', 'created_at')
    search_fields = ('task__title', 'description', 'resolution_notes')
    readonly_fields = ('created_at', 'updated_at', 'resolved_at')

@admin.register(BlockerAuditLog)
class BlockerAuditLogAdmin(admin.ModelAdmin):
    list_display = ('blocker', 'action', 'user', 'organization', 'timestamp')
    list_filter = ('action', 'organization', 'timestamp')
    search_fields = ('blocker__task__title', 'user__email', 'notes')
    readonly_fields = ('timestamp', 'created_at', 'updated_at')
