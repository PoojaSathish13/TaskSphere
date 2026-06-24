from django.db import models
from .models import TenantBaseModel


class Invoice(TenantBaseModel):
    """
    Simulated Billing Invoice records synced from payment gateways.
    """
    STATUS_CHOICES = (
        ('PAID', 'Paid'),
        ('UNPAID', 'Unpaid'),
        ('FAILED', 'Failed'),
    )

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='UNPAID')
    stripe_invoice_id = models.CharField(max_length=255, blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Invoice {self.id} : {self.amount} ({self.status})"
