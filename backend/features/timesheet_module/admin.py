from django.contrib import admin
from .models import Project, TimesheetEntry
from .models_client import Release, ClientApprovalRequest, ClientProjectAccess, ClientDocument, ProjectActivity

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'is_active', 'is_client_visible', 'created_at')
    list_filter = ('is_active', 'is_client_visible', 'organization', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(TimesheetEntry)
class TimesheetEntryAdmin(admin.ModelAdmin):
    list_display = ('user', 'project', 'task', 'date', 'hours_logged', 'status', 'approved_by', 'organization')
    list_filter = ('status', 'is_billable', 'organization', 'date')
    search_fields = ('user__email', 'description', 'project__name', 'task__title')
    readonly_fields = ('created_at', 'updated_at', 'approved_at', 'submitted_at')

@admin.register(Release)
class ReleaseAdmin(admin.ModelAdmin):
    list_display = ('project', 'version', 'release_date', 'status', 'organization')
    list_filter = ('status', 'organization', 'release_date')
    search_fields = ('project__name', 'version', 'notes')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(ClientApprovalRequest)
class ClientApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'status', 'requested_by', 'reviewed_by', 'organization', 'created_at')
    list_filter = ('status', 'organization', 'created_at')
    search_fields = ('title', 'description', 'comments', 'project__name')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(ClientProjectAccess)
class ClientProjectAccessAdmin(admin.ModelAdmin):
    list_display = ('project', 'user', 'organization', 'created_at')
    list_filter = ('organization', 'project')
    search_fields = ('user__email', 'project__name')
    readonly_fields = ('created_at',)

@admin.register(ClientDocument)
class ClientDocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'uploaded_by', 'is_client_visible', 'organization', 'created_at')
    list_filter = ('is_client_visible', 'organization', 'created_at')
    search_fields = ('title', 'description', 'file_url', 'project__name')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(ProjectActivity)
class ProjectActivityAdmin(admin.ModelAdmin):
    list_display = ('project', 'activity_type', 'title', 'created_by', 'organization', 'created_at')
    list_filter = ('activity_type', 'organization', 'created_at')
    search_fields = ('title', 'description', 'project__name')
    readonly_fields = ('created_at',)
