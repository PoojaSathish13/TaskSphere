from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LabelViewSet, CommentViewSet, AttachmentViewSet, TaskActivityLogViewSet, TeamPulseAPIView, StandupSummaryView

router = DefaultRouter()
router.register('labels', LabelViewSet, basename='labels')
router.register('comments', CommentViewSet, basename='comments')
router.register('attachments', AttachmentViewSet, basename='attachments')
router.register('activity-logs', TaskActivityLogViewSet, basename='activity-logs')

urlpatterns = [
    path('pulse/', TeamPulseAPIView.as_view(), name='team-pulse'),
    path('standup/', StandupSummaryView.as_view(), name='standup-summary'),
    path('', include(router.urls)),
]
