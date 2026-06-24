import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_user_creation():
    """Verify that custom user creation stores email correctly."""
    user = User.objects.create_user(
        email='dev@tasksphere.com',
        password='strong_password_123'
    )
    assert user.email == 'dev@tasksphere.com'
    assert user.is_active is True
    assert user.is_staff is False
    assert user.is_superuser is False
