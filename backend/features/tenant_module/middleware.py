import logging
from django.utils.deprecation import MiddlewareMixin
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from .context import set_current_organization, clear_current_organization
from .models import Organization

logger = logging.getLogger('tasksphere.tenant')


class TenantContextMiddleware(MiddlewareMixin):
    """
    Middleware that reads the tenant (Organization) context from the
    custom request header `X-Organization-ID` and verifies the current 
    user's authorization to access that tenant.
    """
    def process_request(self, request):
        org_id = request.headers.get('X-Organization-ID')
        
        if not org_id:
            clear_current_organization()
            return None

        try:
            # Resolve organization
            organization = Organization.objects.get(id=org_id, is_active=True)
            
            # Save organization context to thread local store
            set_current_organization(organization)
            request.organization = organization
            
        except (Organization.DoesNotExist, ValidationError):
            clear_current_organization()
            return JsonResponse({
                'success': False,
                'data': None,
                'meta': None,
                'errors': [{
                    'code': 'INVALID_TENANT_CONTEXT',
                    'message': 'The organization specified in X-Organization-ID is invalid or inactive.',
                    'field': 'X-Organization-ID'
                }]
            }, status=400)

        return None

    def process_response(self, request, response):
        """Teardown context variables on exit."""
        clear_current_organization()
        return response

    def process_exception(self, request, exception):
        """Teardown context variables on exceptions."""
        clear_current_organization()
        return None
