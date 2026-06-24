from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TimesheetEntryViewSet, ProjectViewSet

router = DefaultRouter()
router.register('projects', ProjectViewSet, basename='projects')
router.register('', TimesheetEntryViewSet, basename='timesheets')

urlpatterns = [
    path('', include(router.urls)),
]
