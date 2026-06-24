import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone


class UserManager(BaseUserManager):
    """Custom manager enforcing email-based user creation."""
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        extra_fields.setdefault('is_active', True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom Enterprise User model with MFA support and account lockout protection.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Multi-tenant link: a user belongs to organizations via tenant membership with roles
    organizations = models.ManyToManyField(
        'tenant_module.Organization',
        through='rbac_module.TenantMembership',
        through_fields=('user', 'organization'),
        related_name='members'
    )

    # --- MFA Ready Infrastructure ---
    mfa_enabled = models.BooleanField(default=False)
    mfa_secret = models.CharField(max_length=255, null=True, blank=True)
    mfa_backup_codes = models.JSONField(default=list, blank=True)

    # --- Account Lockout Protection ---
    login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email

    @property
    def is_locked_out(self):
        """Verifies if the account is currently blocked due to multiple invalid password attempts."""
        if self.locked_until and self.locked_until > timezone.now():
            return True
        return False

    def reset_lockout(self):
        """Reset failed login credentials counters."""
        self.login_attempts = 0
        self.locked_until = None
        self.save(update_fields=['login_attempts', 'locked_until'])

    def track_failed_login(self):
        """Increment failed attempts and apply temporal lockouts if threshold exceeded."""
        self.login_attempts += 1
        if self.login_attempts >= 5: # Lockout after 5 failed entries
            self.locked_until = timezone.now() + timezone.timedelta(minutes=15)
        self.save(update_fields=['login_attempts', 'locked_until'])

    def has_org_permission(self, org_id, permission_code):
        """
        Validates if the user possesses the requested permission code 
        within the scope of a specific tenant Organization.
        """
        if self.is_superuser:
            return True
            
        from features.rbac_module.models import TenantMembership
        return TenantMembership.objects.filter(
            user=self,
            organization_id=org_id,
            role__permissions__code=permission_code
        ).exists()
