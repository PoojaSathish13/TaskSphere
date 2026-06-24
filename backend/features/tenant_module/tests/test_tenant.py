import pytest
from features.tenant_module.models import Organization
from features.tenant_module.context import set_current_organization, clear_current_organization


@pytest.mark.django_db
def test_organization_creation():
    """Verify organization details store successfully."""
    org = Organization.objects.create(name='Global Corp', slug='global')
    assert org.name == 'Global Corp'
    assert org.slug == 'global'
    assert org.is_active is True
