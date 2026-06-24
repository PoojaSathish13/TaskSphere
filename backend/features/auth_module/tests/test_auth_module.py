import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from features.auth_module.models_session import UserSession
from features.auth_module.services import (
    generate_totp_secret, 
    verify_totp, 
    generate_backup_codes,
    verify_backup_code
)

User = get_user_model()


@pytest.mark.django_db
def test_user_lockout_mechanics():
    """Verify that multiple failed logins trigger account lockouts."""
    user = User.objects.create_user(email='lockout@tasksphere.com', password='safe_password_123')
    
    # Simulate consecutive failed login attempts
    assert user.is_locked_out is False
    for _ in range(5):
        user.track_failed_login()
        
    assert user.is_locked_out is True
    assert user.locked_until > timezone.now()

    # Reset lockout check
    user.reset_lockout()
    assert user.is_locked_out is False
    assert user.login_attempts == 0


@pytest.mark.django_db
def test_mfa_cryptography_and_backup_codes():
    """Verify TOTP generation and backup code hashing workflows."""
    secret = generate_totp_secret()
    assert len(secret) >= 16
    
    # MFA confirms
    raw_backups, hashed_backups = generate_backup_codes()
    assert len(raw_backups) == 8
    assert len(hashed_backups) == 8
    
    user = User.objects.create_user(
        email='mfa@tasksphere.com', 
        password='safe_password_123',
        mfa_secret=secret,
        mfa_backup_codes=hashed_backups
    )
    
    # Test backup code consume verification
    assert verify_backup_code(user, raw_backups[0]) is True
    assert len(user.mfa_backup_codes) == 7 # single-use consumption check
    assert verify_backup_code(user, raw_backups[0]) is False # consume twice check


@pytest.mark.django_db
def test_active_user_session_tracking():
    """Verify session tracking registries and remote revocation actions."""
    user = User.objects.create_user(email='session@tasksphere.com', password='safe_password_123')
    
    session = UserSession.objects.create(
        user=user,
        ip_address='127.0.0.1',
        user_agent='Firefox/Linux',
        refresh_token_jti='mock_jwt_jti_string'
    )
    
    assert session.is_active is True
    assert UserSession.objects.filter(user=user, is_active=True).count() == 1
    
    # Remote Revoke session
    session.revoke()
    assert session.is_active is False
    assert UserSession.objects.filter(user=user, is_active=True).count() == 0
