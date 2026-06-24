import uuid
from django.db import models
from django.conf import settings


class UserSession(models.Model):
    """
    Tracks active user authentication sessions and client device signatures.
    Supports remote logout actions by mapping simplejwt Refresh token JTIs.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, null=True, blank=True)
    refresh_token_jti = models.CharField(max_length=255, db_index=True)
    
    is_active = models.BooleanField(default=True, db_index=True)
    last_active = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-last_active']

    def __str__(self):
        return f"Session for {self.user.email} from {self.ip_address or 'unknown'}"

    def revoke(self):
        """Invalidates active session flag and blacklists SimpleJWT token if possible."""
        self.is_active = False
        self.save(update_fields=['is_active'])
        
        # Blacklist the token JTI inSimpleJWT if simplejwt token blacklist is installed
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            outstanding = OutstandingToken.objects.filter(jti=self.refresh_token_jti).first()
            if outstanding and not hasattr(outstanding, 'blacklistedtoken'):
                BlacklistedToken.objects.create(token=outstanding)
        except Exception:
            pass # simplejwt blacklist app might not contain these entries yet or fail silently
