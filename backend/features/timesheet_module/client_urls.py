from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .client_views import (
    ClientProjectViewSet,
    ClientTaskViewSet,
    ClientReleaseViewSet,
    ClientApprovalRequestViewSet,
    ClientDocumentViewSet,
    ProjectActivityViewSet,
    ClientNotificationViewSet,
    ClientReportsAPIView
)

router = DefaultRouter()
router.register('projects', ClientProjectViewSet, basename='client-projects')
router.register('tasks', ClientTaskViewSet, basename='client-tasks')
router.register('releases', ClientReleaseViewSet, basename='client-releases')
router.register('approvals', ClientApprovalRequestViewSet, basename='client-approvals')
router.register('documents', ClientDocumentViewSet, basename='client-documents')
router.register('activities', ProjectActivityViewSet, basename='client-activities')
router.register('notifications', ClientNotificationViewSet, basename='client-notifications')

urlpatterns = [
    path('reports/', ClientReportsAPIView.as_view(), name='client-reports'),
    path('reports/export_pdf/', ClientReportsAPIView.as_view(http_method_names=['get']), {'action': 'export_pdf'}, name='client-reports-pdf'),
    path('reports/export_excel/', ClientReportsAPIView.as_view(http_method_names=['get']), {'action': 'export_excel'}, name='client-reports-excel'),
    path('', include(router.urls)),
]
