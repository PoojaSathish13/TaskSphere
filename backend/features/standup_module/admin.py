from django.contrib import admin
from .models import DailyStandup

@admin.register(DailyStandup)
class DailyStandupAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'organization', 'created_at')
    list_filter = ('organization', 'date')
    search_fields = ('user__email', 'yesterday_text', 'today_text', 'blockers_text')
    readonly_fields = ('created_at', 'updated_at')
