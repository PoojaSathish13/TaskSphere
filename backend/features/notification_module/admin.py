from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'organization', 'verb', 'is_read', 'created_at')
    list_filter = ('is_read', 'organization', 'created_at')
    search_fields = ('recipient__email', 'verb', 'description')
    readonly_fields = ('created_at', 'updated_at')
