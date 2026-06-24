from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoleViewSet, PermissionGroupViewSet, MembershipViewSet, SeedRBACView

router = DefaultRouter()
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'groups', PermissionGroupViewSet, basename='permission-group')
router.register(r'members', MembershipViewSet, basename='membership')

urlpatterns = [
    path('seed/', SeedRBACView.as_view(), name='rbac_seed'),
    path('', include(router.urls)),
]
