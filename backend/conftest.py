import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from features.tenant_module.models import Organization

User = get_user_model()


@pytest.fixture
def api_client():
    """Fixture providing configured DRF test API Client."""
    return APIClient()


@pytest.fixture
def test_user(db):
    """Fixture creating standard user instance."""
    return User.objects.create_user(
        email='testuser@tasksphere.com',
        password='testpassword123',
        first_name='Test',
        last_name='User'
    )


@pytest.fixture
def test_organization(db):
    """Fixture creating tenant Organization instance."""
    return Organization.objects.create(
        name='Acme Corp',
        slug='acme'
    )


@pytest.fixture(autouse=True)
def use_dummy_cache(settings):
    """Configure Django cache to use in-memory backend during tests."""
    settings.CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }
