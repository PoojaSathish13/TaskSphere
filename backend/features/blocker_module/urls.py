from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskBlockerViewSet, BlockerAuditLogViewSet

router = DefaultRouter()
router.register('audit-logs', BlockerAuditLogViewSet, basename='blocker-audit-logs')
router.register('', TaskBlockerViewSet, basename='task-blockers')

urlpatterns = [
    path('', include(router.urls)),
]
