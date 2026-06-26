from django.contrib import admin
from .models import Task, TaskDependency, DailyPlan

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'organization', 'project', 'priority', 'status', 'assignee', 'due_date', 'created_at')
    list_filter = ('status', 'priority', 'organization', 'project', 'due_date')
    search_fields = ('title', 'description', 'assignee__email')
    filter_horizontal = ('labels',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(TaskDependency)
class TaskDependencyAdmin(admin.ModelAdmin):
    list_display = ('task', 'depends_on', 'organization')
    list_filter = ('organization',)
    search_fields = ('task__title', 'depends_on__title')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(DailyPlan)
class DailyPlanAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'organization', 'created_at')
    list_filter = ('organization', 'date')
    search_fields = ('user__email',)
    readonly_fields = ('created_at', 'updated_at')
