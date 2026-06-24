import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class BaseQuerySet(models.QuerySet):
    def delete(self):
        """Perform soft delete on bulk querysets."""
        return self.update(is_deleted=True, deleted_at=timezone.now())

    def hard_delete(self):
        """Force database-level deletion."""
        return super().delete()


class BaseModelManager(models.Manager):
    def get_queryset(self):
        """By default, filter out soft-deleted items."""
        return BaseQuerySet(self.model, using=self._db).filter(is_deleted=False)


class BaseModel(models.Model):
    """
    Abstract BaseModel providing:
    - UUID primary key
    - Creation/Modification timestamp auditing
    - Creator/Modifier tracking
    - Logical soft-delete mechanics
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='%(class)s_created',
        null=True,
        blank=True
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='%(class)s_updated',
        null=True,
        blank=True
    )
    
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = BaseModelManager()
    all_objects = models.Manager() # Exposes soft-deleted records too if needed

    class Meta:
        abstract = True

    def delete(self, *args, **kwargs):
        """Soft delete: mark as deleted instead of physical removal."""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])

    def hard_delete(self, *args, **kwargs):
        """Perform actual database level deletion."""
        super().delete(*args, **kwargs)
