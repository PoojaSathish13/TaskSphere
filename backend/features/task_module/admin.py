from django.contrib import admin
from .models import Label, Comment, Attachment, TaskActivityLog

@admin.register(Label)
class LabelAdmin(admin.ModelAdmin):
    list_display = ('name', 'color', 'organization', 'created_at')
    list_filter = ('organization',)
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('task', 'user', 'organization', 'created_at')
    list_filter = ('organization', 'created_at')
    search_fields = ('content', 'user__email', 'task__title')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ('filename', 'task', 'uploaded_by', 'organization', 'uploaded_at')
    list_filter = ('organization', 'uploaded_at')
    search_fields = ('filename', 'uploaded_by__email', 'task__title')
    readonly_fields = ('uploaded_at', 'created_at', 'updated_at')

@admin.register(TaskActivityLog)
class TaskActivityLogAdmin(admin.ModelAdmin):
    list_display = ('task', 'user', 'field_changed', 'old_value', 'new_value', 'timestamp')
    list_filter = ('timestamp', 'field_changed')
    search_fields = ('task__title', 'user__email', 'field_changed')
    readonly_fields = ('timestamp', 'created_at', 'updated_at')
