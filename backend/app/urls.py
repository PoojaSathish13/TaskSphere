from django.contrib import admin
from django.urls import path, include
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('features.auth_module.urls')),
    path('api/v1/rbac/', include('features.rbac_module.urls')),
    path('api/v1/organizations/', include('features.tenant_module.urls')),
    path('api/v1/notifications/', include('features.notification_module.urls')),
    path('api/v1/planner/', include('features.planner_module.urls')),
    path('api/v1/tasks/', include('features.task_module.urls')),
    path('api/v1/focus/', include('features.focus_module.urls')),
    path('api/v1/blockers/', include('features.blocker_module.urls')),
    path('api/v1/standups/', include('features.standup_module.urls')),
    path('api/v1/timesheets/', include('features.timesheet_module.urls')),
    path('api/v1/client/', include('features.timesheet_module.client_urls')),
]

urlpatterns += staticfiles_urlpatterns()

