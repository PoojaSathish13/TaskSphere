from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DailyStandupViewSet

router = DefaultRouter()
router.register('', DailyStandupViewSet, basename='daily-standups')

urlpatterns = [
    path('', include(router.urls)),
]
