from rest_framework.exceptions import APIException
from rest_framework import status


class BaseEnterpriseException(APIException):
    """Base exception for all enterprise domain logic errors."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "A business rule violation occurred."
    default_code = "BUSINESS_RULE_VIOLATION"

    def __init__(self, detail=None, code=None, status_code=None):
        if status_code is not None:
            self.status_code = status_code
        super().__init__(detail, code)


class TenantValidationError(BaseEnterpriseException):
    """Exception thrown for tenant context issues, e.g. cross-tenant data leaks."""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Invalid tenant access context."
    default_code = "TENANT_ACCESS_DENIED"


class RBACPermissionDenied(BaseEnterpriseException):
    """Exception thrown when access is blocked due to lack of role credentials."""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You do not have the required role to execute this action."
    default_code = "INSUFFICIENT_PERMISSIONS"


class ObjectNotFoundError(BaseEnterpriseException):
    """Specific entity resolution failure."""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "The requested object was not found."
    default_code = "OBJECT_NOT_FOUND"
