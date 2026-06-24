import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.utils import timezone
from rest_framework import viewsets, status, permissions, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models_session import UserSession
from .services import (
    generate_totp_secret,
    verify_totp,
    generate_backup_codes,
    verify_backup_code,
    register_user_session
)
from .serializers import (
    CustomTokenObtainPairSerializer,
    MFAConfirmSerializer,
    MFAVerifySerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    ChangePasswordSerializer,
    UserSessionSerializer,
    UserSerializer,
    UserRegisterSerializer
)
from features.tenant_module.context import get_current_organization
from features.audit_module.services import log_action

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Handles secure authentication. 
    Redirects to intermediate MFA if enabled; otherwise returns JWT credentials.
    """
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            # Audit failed attempt if user email exists
            email = request.data.get('email')
            user = User.objects.filter(email=email).first()
            log_action(
                actor=user,
                organization=None,
                action='ACCESS',
                target_instance=user,
                payload={'event': 'login_failed', 'error': str(e)},
                ip_address=request.META.get('REMOTE_ADDR')
            )
            raise e

        validated_data = serializer.validated_data

        if validated_data.get("mfa_required"):
            return Response({
                "success": True,
                "data": {
                    "mfa_required": True,
                    "mfa_token": validated_data["mfa_token"]
                },
                "meta": None,
                "errors": None
            })

        # Capture IP & User Agent context
        ip_addr = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Successful login context resolution
        user = User.objects.get(email=request.data['email'])
        
        # Register Session
        refresh_token = validated_data['refresh']
        register_user_session(user, ip_addr, user_agent, refresh_token)

        # Audit successful event
        log_action(
            actor=user,
            organization=None,
            action='ACCESS',
            target_instance=user,
            payload={'event': 'login_success'},
            ip_address=ip_addr
        )

        return Response({
            "success": True,
            "data": {
                "mfa_required": False,
                "access": validated_data["access"],
                "refresh": validated_data["refresh"]
            },
            "meta": None,
            "errors": None
        })


class LogoutView(APIView):
    """
    Blacklists the active Refresh token and deactivates the corresponding UserSession.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response({
                    'success': False,
                    'data': None,
                    'meta': None,
                    'errors': [{'code': 'MISSING_TOKEN', 'message': 'Refresh token is required.', 'field': 'refresh'}]
                }, status=status.HTTP_400_BAD_REQUEST)
                
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            # Deactivate session matching token JTI
            UserSession.objects.filter(refresh_token_jti=token['jti']).update(is_active=False)
            
            return Response({
                'success': True,
                'data': {'message': 'Successfully logged out.'},
                'meta': None,
                'errors': None
            })
        except TokenError as e:
            return Response({
                'success': False,
                'data': None,
                'meta': None,
                'errors': [{'code': 'INVALID_TOKEN', 'message': str(e), 'field': 'refresh'}]
            }, status=status.HTTP_400_BAD_REQUEST)



class MFAVerifyView(APIView):
    """
    API validating TOTP codes or recovery codes to issue JWT tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = MFAVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        mfa_token = serializer.validated_data['mfa_token']
        code = serializer.validated_data['code']

        # 1. Decode intermediate token
        try:
            payload = jwt.decode(mfa_token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload['user_id']
            user = User.objects.get(id=user_id, is_active=True)
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, User.DoesNotExist):
            return Response({
                'success': False,
                'data': None,
                'meta': None,
                'errors': [{'code': 'INVALID_TOKEN', 'message': 'MFA session has expired or is invalid.', 'field': 'mfa_token'}]
            }, status=status.HTTP_400_BAD_REQUEST)

        # 2. Check TOTP or backup recovery code
        is_verified = False
        is_recovery_code = len(code) == 8
        
        if is_recovery_code:
            is_verified = verify_backup_code(user, code)
        else:
            is_verified = verify_totp(user.mfa_secret, code)

        if not is_verified:
            user.track_failed_login()
            log_action(
                actor=user,
                organization=None,
                action='ACCESS',
                target_instance=user,
                payload={'event': 'mfa_verification_failed', 'is_recovery_code': is_recovery_code},
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response({
                'success': False,
                'data': None,
                'meta': None,
                'errors': [{'code': 'INVALID_CODE', 'message': 'Verification code is invalid.', 'field': 'code'}]
            }, status=status.HTTP_400_BAD_REQUEST)

        # Reset locks on verification success
        user.reset_lockout()

        # 3. Issue Token Pair
        refresh = RefreshToken.get_token(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Register Session
        ip_addr = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        register_user_session(user, ip_addr, user_agent, refresh_token)

        # Audit successful login
        log_action(
            actor=user,
            organization=None,
            action='ACCESS',
            target_instance=user,
            payload={'event': 'login_success_mfa', 'is_recovery_code': is_recovery_code},
            ip_address=ip_addr
        )

        return Response({
            'success': True,
            'data': {
                'access': access_token,
                'refresh': refresh_token
            },
            'meta': None,
            'errors': None
        })


class MFAEnableView(APIView):
    """
    Initiates MFA enrollment. Generates secret and returns TOTP setup QR content details.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.mfa_enabled:
            return Response({
                'success': False,
                'data': None,
                'meta': None,
                'errors': [{'code': 'ALREADY_ENABLED', 'message': 'MFA is already active on this account.', 'field': None}]
            }, status=status.HTTP_400_BAD_REQUEST)

        secret = generate_totp_secret()
        user.mfa_secret = secret
        user.save(update_fields=['mfa_secret'])

        # Create TOTP provisioning URI for Google Authenticator / Microsoft Authenticator / Apple Keychain
        issuer = "TaskSphere"
        provisioning_uri = f"otpauth://totp/{issuer}:{user.email}?secret={secret}&issuer={issuer}"

        return Response({
            'success': True,
            'data': {
                'secret': secret,
                'provisioning_uri': provisioning_uri
            },
            'meta': None,
            'errors': None
        })


class MFAConfirmView(APIView):
    """
    Validates first TOTP code to turn on MFA status and generate backup recovery codes.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = MFAConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        code = serializer.validated_data['code']

        if not user.mfa_secret:
            return Response({
                'success': False,
                'data': None,
                'meta': None,
                'errors': [{'code': 'SETUP_NOT_INITIATED', 'message': 'MFA activation setup not initialized.', 'field': None}]
            }, status=status.HTTP_400_BAD_REQUEST)

        if not verify_totp(user.mfa_secret, code):
            return Response({
                'success': False,
                'data': None,
                'meta': None,
                'errors': [{'code': 'INVALID_CODE', 'message': 'Verification code is invalid. Check system time synchronization.', 'field': 'code'}]
            }, status=status.HTTP_400_BAD_REQUEST)

        # MFA Enabled: Generate Backup recovery codes
        raw_backups, hashed_backups = generate_backup_codes()
        
        user.mfa_enabled = True
        user.mfa_backup_codes = hashed_backups
        user.save(update_fields=['mfa_enabled', 'mfa_backup_codes'])

        log_action(
            actor=user,
            organization=None,
            action='UPDATE',
            target_instance=user,
            payload={'event': 'mfa_enabled'},
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            'success': True,
            'data': {
                'mfa_enabled': True,
                'backup_recovery_codes': raw_backups
            },
            'meta': None,
            'errors': None
        })


class ForgotPasswordView(APIView):
    """
    Generates a recovery token and triggers a Celery email notification.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        user = User.objects.filter(email=email, is_active=True).first()

        if user:
            # Generate Reset Context
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.id))
            
            # Reset URL placeholder links to frontend
            reset_url = f"http://localhost:3000/auth/reset-password?uid={uid}&token={token}"
            
            # Dispatch Async Celery email task
            from features.notification_module.tasks import send_email_notification
            send_email_notification.delay(
                recipient_email=user.email,
                subject="TaskSphere Password Reset Request",
                message_body=f"Click the link below to securely reset your account credentials:\n\n{reset_url}"
            )
            
            log_action(
                actor=user,
                organization=None,
                action='UPDATE',
                target_instance=user,
                payload={'event': 'password_reset_requested'},
                ip_address=request.META.get('REMOTE_ADDR')
            )

        # Return status success regardless of user existence (OWASP security details leakage prevention)
        return Response({
            'success': True,
            'data': {'message': 'If the email matches an active account, reset instructions have been emailed.'},
            'meta': None,
            'errors': None
        })


class ResetPasswordView(APIView):
    """
    Completes password token updates.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uidb64 = serializer.validated_data['uidb64']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(id=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({
                'success': False,
                'data': None,
                'meta': None,
                'errors': [{'code': 'INVALID_TOKEN', 'message': 'The reset token parameters are invalid.', 'field': None}]
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate token
        if not default_token_generator.check_token(user, token):
            return Response({
                'success': False,
                'data': None,
                'meta': None,
                'errors': [{'code': 'INVALID_TOKEN', 'message': 'The reset token is invalid or has expired.', 'field': None}]
            }, status=status.HTTP_400_BAD_REQUEST)

        # Apply Password change
        user.set_password(new_password)
        user.reset_lockout() # Reset lockouts
        user.save()

        # Revoke all current active user sessions (Security standard)
        UserSession.objects.filter(user=user, is_active=True).update(is_active=False)

        log_action(
            actor=user,
            organization=None,
            action='UPDATE',
            target_instance=user,
            payload={'event': 'password_reset_completed'},
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            'success': True,
            'data': {'message': 'Password has been updated successfully.'},
            'meta': None,
            'errors': None
        })


class ChangePasswordView(APIView):
    """
    In-session password change API.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        old_password = serializer.validated_data['old_password']
        new_password = serializer.validated_data['new_password']

        if not user.check_password(old_password):
            return Response({
                'success': False,
                'data': None,
                'meta': None,
                'errors': [{'code': 'INVALID_PASSWORD', 'message': 'Current password credentials mismatch.', 'field': 'old_password'}]
            }, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        # Invalidate other active sessions, keeping only the current one if desired
        # Here we invalidate all sessions, forcing re-authentication
        UserSession.objects.filter(user=user, is_active=True).update(is_active=False)

        log_action(
            actor=user,
            organization=None,
            action='UPDATE',
            target_instance=user,
            payload={'event': 'password_changed'},
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            'success': True,
            'data': {'message': 'Password changed successfully. Please log back in on all devices.'},
            'meta': None,
            'errors': None
        })


class UserSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Exposes active login sessions and device tracking lists.
    Allows remote session revocation.
    """
    serializer_class = UserSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserSession.objects.filter(user=self.request.user, is_active=True)

    @action(detail=True, methods=['post'], url_path='revoke')
    def revoke(self, request, pk=None):
        """Terminates a specific active session and blacklists simplejwt keys."""
        session = self.get_object()
        session.revoke()
        
        log_action(
            actor=request.user,
            organization=get_current_organization(),
            action='UPDATE',
            target_instance=session,
            payload={'event': 'session_revoked', 'revoked_session_id': str(session.id)},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return Response({
            'success': True,
            'data': {'id': session.id, 'is_active': False},
            'meta': None,
            'errors': None
        })


class UserRegisterView(generics.CreateAPIView):
    """
    Registers a new user and creates their default workspace tenant organization.
    """
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Retrieves or updates the authenticated user's profile info.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
