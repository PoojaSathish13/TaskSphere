import logging
from rest_framework.views import exception_handler
from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.core.exceptions import PermissionDenied
from django.http import Http404

logger = logging.getLogger('tasksphere.exceptions')


def custom_exception_handler(exc, context):
    """
    Custom exception handler matching enterprise envelope specs:
    {
        "success": false,
        "data": null,
        "meta": null,
        "errors": [
            {
                "code": "ERROR_CODE",
                "message": "User-friendly message",
                "field": "field_name_if_applicable"
            }
        ]
    }
    """
    # Let DRF handle standard errors first
    response = exception_handler(exc, context)

    # Standardize django's native exceptions to DRF format if not handled
    if response is None:
        if isinstance(exc, Http404):
            response = exception_handler(ValidationError("Not found"), context)
            response.status_code = status.HTTP_404_NOT_FOUND
        elif isinstance(exc, PermissionDenied):
            response = exception_handler(ValidationError("Permission denied"), context)
            response.status_code = status.HTTP_403_FORBIDDEN
        else:
            # Uncaught system exceptions (500 Internal Server Error)
            logger.exception("Uncaught server exception occurred", exc_info=exc)
            
            error_data = {
                'success': False,
                'data': None,
                'meta': None,
                'errors': [{
                    'code': 'INTERNAL_SERVER_ERROR',
                    'message': 'An unexpected error occurred on the server. Please try again later.',
                    'field': None
                }]
            }
            # Return custom 500 response
            from rest_framework.response import Response
            return Response(error_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Re-structure standard exceptions (validation, etc.)
    formatted_errors = []
    
    # Check if standard exception inherits from our BaseEnterpriseException
    from shared.exceptions import BaseEnterpriseException
    
    if isinstance(exc, BaseEnterpriseException):
        formatted_errors.append({
            'code': exc.detail.code if hasattr(exc.detail, 'code') else exc.default_code,
            'message': str(exc.detail),
            'field': None
        })
    elif isinstance(exc, ValidationError):
        # ValidationErrors might have dictionary, list, or string detail structure
        if isinstance(exc.detail, dict):
            for field, messages in exc.detail.items():
                # messages can be a list or a nested dict
                if isinstance(messages, list):
                    for msg in messages:
                        formatted_errors.append({
                            'code': getattr(msg, 'code', 'VALIDATION_ERROR'),
                            'message': str(msg),
                            'field': field
                        })
                else:
                    formatted_errors.append({
                        'code': 'VALIDATION_ERROR',
                        'message': str(messages),
                        'field': field
                    })
        elif isinstance(exc.detail, list):
            for msg in exc.detail:
                formatted_errors.append({
                    'code': getattr(msg, 'code', 'VALIDATION_ERROR'),
                    'message': str(msg),
                    'field': None
                })
        else:
            formatted_errors.append({
                'code': 'VALIDATION_ERROR',
                'message': str(exc.detail),
                'field': None
            })
    else:
        # Other standard rest framework exceptions (e.g. AuthenticationFailed, PermissionDenied)
        code = getattr(exc, 'default_code', 'API_ERROR')
        if response and 'detail' in response.data:
            msg = response.data['detail']
            code = getattr(response.data['detail'], 'code', code)
        else:
            msg = str(exc)
            
        formatted_errors.append({
            'code': str(code).upper(),
            'message': str(msg),
            'field': None
        })

    response.data = {
        'success': False,
        'data': None,
        'meta': None,
        'errors': formatted_errors
    }

    return response
