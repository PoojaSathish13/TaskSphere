from django.apps import AppConfig


class TenantModuleConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'features.tenant_module'
