from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from .views import (
    UserRegisterView,
    CustomTokenObtainPairView,
    LogoutView,
    UserProfileView,
    MFAVerifyView,
    MFAEnableView,
    MFAConfirmView,
    ForgotPasswordView,
    ResetPasswordView,
    ChangePasswordView,
    UserSessionViewSet
)

router = DefaultRouter()
router.register(r'sessions', UserSessionViewSet, basename='user-session')

urlpatterns = [
    # General auth
    path('register/', UserRegisterView.as_view(), name='auth_register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserProfileView.as_view(), name='auth_me'),
    
    # Password management
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    
    # MFA ready mechanics
    path('mfa/enable/', MFAEnableView.as_view(), name='mfa_enable'),
    path('mfa/confirm/', MFAConfirmView.as_view(), name='mfa_confirm'),
    path('mfa/verify/', MFAVerifyView.as_view(), name='mfa_verify'),
    
    # Sessions list and revokes
    path('', include(router.urls)),
]
