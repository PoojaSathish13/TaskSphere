import base64
import hashlib
import hmac
import os
import struct
import time
import secrets
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models_session import UserSession

User = get_user_model()


def generate_totp_secret():
    """Generates a secure 32-character base32 TOTP secret."""
    random_bytes = secrets.token_bytes(20)
    return base64.b32encode(random_bytes).decode('utf-8')


def verify_totp(secret_key, code, interval=30):
    """
    Verifies a 6-digit TOTP validation code using pure-Python SHA-1 HMAC (RFC 6238).
    Includes clock-drift tolerance of ±1 step (30 seconds).
    """
    try:
        # Normalize code
        code_str = str(code).strip().replace(" ", "")
        if len(code_str) != 6 or not code_str.isdigit():
            return False
            
        # Ensure base32 padding
        missing_padding = len(secret_key) % 8
        if missing_padding:
            secret_key += '=' * (8 - missing_padding)
            
        key = base64.b32decode(secret_key, casefold=True)
    except Exception:
        return False

    # Get current time interval
    current_time_step = int(time.time() / interval)
    
    # Check steps with drift tolerance
    for step in [current_time_step - 1, current_time_step, current_time_step + 1]:
        msg = struct.pack(">Q", step)
        hmac_digest = hmac.new(key, msg, hashlib.sha1).digest()
        
        # Dynamic truncation (RFC 4226)
        offset = hmac_digest[-1] & 0x0f
        truncated = struct.unpack(">I", hmac_digest[offset:offset+4])[0] & 0x7fffffff
        calculated_code = truncated % 1000000
        
        if int(code_str) == calculated_code:
            return True
            
    return False


def generate_backup_codes(count=8):
    """
    Generates backup recovery codes.
    Returns:
        - raw_codes: List of raw strings to display once to user.
        - hashed_codes: List of hashed values to persist securely.
    """
    raw_codes = []
    hashed_codes = []
    
    for _ in range(count):
        # Generate 8 digit secure code
        code = "".join([str(secrets.randbelow(10)) for _ in range(8)])
        raw_codes.append(code)
        
        # Hash code using SHA-256 for secure DB comparison
        hashed = hashlib.sha256(code.encode()).hexdigest()
        hashed_codes.append(hashed)
        
    return raw_codes, hashed_codes


def verify_backup_code(user, raw_code):
    """
    Validates a recovery backup code against the user's saved codes.
    If valid, consumes the backup code (deletes it) and returns True.
    """
    if not user.mfa_backup_codes:
        return False
        
    hashed = hashlib.sha256(str(raw_code).strip().encode()).hexdigest()
    
    if hashed in user.mfa_backup_codes:
        # Consume code (security best practice: backup codes are single-use)
        remaining = [c for c in user.mfa_backup_codes if c != hashed]
        user.mfa_backup_codes = remaining
        user.save(update_fields=['mfa_backup_codes'])
        return True
        
    return False


def register_user_session(user, ip_address, user_agent, refresh_token_string):
    """
    Binds a new authenticated session to the user.
    Extracts the JTI claim from the token string to enable backend revokes.
    """
    try:
        from rest_framework_simplejwt.tokens import RefreshToken
        token = RefreshToken(refresh_token_string)
        jti = token['jti']
    except Exception:
        jti = ''

    return UserSession.objects.create(
        user=user,
        ip_address=ip_address,
        user_agent=user_agent,
        refresh_token_jti=jti
    )
