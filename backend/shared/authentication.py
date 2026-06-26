import threading
import hashlib
from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

_thread_locals = threading.local()

class RequestMiddleware(MiddlewareMixin):
    """
    Stores the current request object in thread-local storage 
    to make it accessible in model methods or serializers.
    """
    def process_request(self, request):
        _thread_locals.request = request

    def process_response(self, request, response):
        if hasattr(_thread_locals, 'request'):
            del _thread_locals.request
        return response

    def process_exception(self, request, exception):
        if hasattr(_thread_locals, 'request'):
            del _thread_locals.request
        return None

def get_current_request():
    return getattr(_thread_locals, 'request', None)


class DeviceBindingJWTAuthentication(JWTAuthentication):
    """
    Extends JWTAuthentication to enforce strict device fingerprinting 
    and User-Agent binding verification.
    """
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        
        # Enforce User-Agent binding
        ua = request.META.get('HTTP_USER_AGENT', '')
        ua_hash = hashlib.sha256(ua.encode('utf-8')).hexdigest()
        
        token_ua_hash = validated_token.get('ua_hash')
        if token_ua_hash and token_ua_hash != ua_hash:
            raise InvalidToken("Token is bound to a different device or user agent.")
            
        return self.get_user(validated_token), validated_token
