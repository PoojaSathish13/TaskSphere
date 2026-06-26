from django.contrib import admin
from .models import FocusSession, ProductivityMetric

@admin.register(FocusSession)
class FocusSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'task', 'started_at', 'completed_at', 'duration_seconds', 'completed', 'organization')
    list_filter = ('completed', 'organization', 'started_at')
    search_fields = ('user__email', 'task__title')
    readonly_fields = ('started_at', 'created_at', 'updated_at')

@admin.register(ProductivityMetric)
class ProductivityMetricAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'focus_seconds', 'productivity_score', 'organization')
    list_filter = ('organization', 'date')
    search_fields = ('user__email',)
    readonly_fields = ('created_at', 'updated_at')
