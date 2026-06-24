from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FocusSessionViewSet, ProductivityMetricViewSet

router = DefaultRouter()
router.register('sessions', FocusSessionViewSet, basename='focus-sessions')
router.register('metrics', ProductivityMetricViewSet, basename='productivity-metrics')

urlpatterns = [
    path('', include(router.urls)),
]
