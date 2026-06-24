from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, TaskDependencyViewSet, DailyPlanViewSet, SuggestedPlanView

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'dependencies', TaskDependencyViewSet, basename='task-dependency')
router.register(r'plans', DailyPlanViewSet, basename='daily-plan')

urlpatterns = [
    path('suggest/', SuggestedPlanView.as_view(), name='planner_suggest'),
    path('', include(router.urls)),
]
