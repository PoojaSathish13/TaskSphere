from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from django.utils import timezone
from .models_session import UserSession
from features.tenant_module.serializers import OrganizationSerializer

from shared.authentication import get_current_request

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends simplejwt token generation to enforce account lockout protection,
    multi-factor authentication (MFA) intermediate flows, and inject RBAC claims.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        
        # Inject Device Fingerprint hash (User-Agent binding)
        request = get_current_request()
        if request:
            import hashlib
            ua = request.META.get('HTTP_USER_AGENT', '')
            ua_hash = hashlib.sha256(ua.encode('utf-8')).hexdigest()
            token['ua_hash'] = ua_hash
        
        # Inject RBAC claims directly into the Access token payload
        memberships_data = {}
        # Prefetch to avoid N+1 queries
        for membership in user.memberships.all().select_related('role').prefetch_related('role__permissions'):
            memberships_data[str(membership.organization_id)] = {
                'role_code': membership.role.code,
                'permissions': list(membership.role.permissions.values_list('code', flat=True))
            }
        token['org_memberships'] = memberships_data
        return token


    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise AuthenticationFailed("No active account found with the given credentials.")

        # 1. Enforce Account Lockout Protection
        if user.is_locked_out:
            minutes_remaining = int((user.locked_until - timezone.now()).total_seconds() / 60)
            raise AuthenticationFailed(
                f"This account has been temporarily locked due to consecutive login failures. "
                f"Please try again in {max(1, minutes_remaining)} minute(s)."
            )

        # 2. Check credentials
        if not user.check_password(password):
            user.track_failed_login()
            raise AuthenticationFailed("Authentication failed. Invalid password credentials.")

        # 3. Successful authentication: Reset failed counters
        user.reset_lockout()

        # 4. MFA check
        if user.mfa_enabled:
            # Generate short-lived intermediate payload containing pending ID
            import jwt
            from django.conf import settings
            mfa_payload = {
                'user_id': str(user.id),
                'mfa_pending': True,
                'exp': timezone.now() + timezone.timedelta(minutes=5)
            }
            mfa_token = jwt.encode(mfa_payload, settings.SECRET_KEY, algorithm='HS256')
            
            # Raise exception-like custom payload return or let the view process it.
            # In DRF, raising AuthenticationFailed can pass extra contexts if we format it.
            # However, we can construct the response in the view instead by overriding.
            # We'll attach mfa_required parameters to the validated data for view processing.
            return {
                "mfa_required": True,
                "mfa_token": mfa_token
            }

        # 5. Non-MFA fallback: Return standard tokens
        data = super().validate(attrs)
        data["mfa_required"] = False
        return data


class MFAConfirmSerializer(serializers.Serializer):
    """Validates the first verification code to activate MFA."""
    code = serializers.CharField(max_length=6, min_length=6)


class MFAVerifySerializer(serializers.Serializer):
    """Validates the intermediate verification token and TOTP/recovery codes."""
    mfa_token = serializers.CharField()
    code = serializers.CharField(max_length=8) # Supports 6-digit TOTP or 8-digit recovery code


class ForgotPasswordSerializer(serializers.Serializer):
    """Validates password recovery email requests."""
    email = serializers.EmailField()


class TenantMembershipDetailSerializer(serializers.Serializer):
    """Auxiliary serializer to display a user's role mapping in an organization."""
    organization = OrganizationSerializer()
    role_name = serializers.CharField(source='role.name')
    role_code = serializers.CharField(source='role.code')
    permissions = serializers.SerializerMethodField()

    def get_permissions(self, obj):
        return [p.code for p in obj.role.permissions.all()]


class ResetPasswordSerializer(serializers.Serializer):
    """Validates parameters for token-based password updates."""
    uidb64 = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])


class ChangePasswordSerializer(serializers.Serializer):
    """Validates in-session password updates."""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])


class UserSessionSerializer(serializers.ModelSerializer):
    """Renders auditable active user sessions and devices."""
    class Meta:
        model = UserSession
        fields = ['id', 'ip_address', 'user_agent', 'is_active', 'last_active', 'created_at']
        read_only_fields = ['id', 'ip_address', 'user_agent', 'is_active', 'last_active', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    memberships = TenantMembershipDetailSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'mfa_enabled', 'memberships', 'created_at']
        read_only_fields = ['id', 'mfa_enabled', 'created_at']


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    org_name = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'first_name', 'last_name', 'org_name']

    def create(self, validated_data):
        org_name = validated_data.pop('org_name', None)
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()

        from features.tenant_module.models import Organization
        from features.rbac_module.models import Role, TenantMembership
        
        name = org_name or f"{user.first_name or 'My'}'s Workspace"
        slug = name.lower().replace(' ', '-').replace("'", '')[:50]
        base_slug = slug
        counter = 1
        while Organization.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
            
        org = Organization.objects.create(name=name, slug=slug)
        
        admin_role, _ = Role.objects.get_or_create(
            code='SUPER_ADMIN',
            defaults={'name': 'Super Admin'}
        )
        
        TenantMembership.objects.create(
            user=user,
            organization=org,
            role=admin_role
        )
        
        return user
