# Generated manually for stripe_price_id addition to SubscriptionPlan

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tenant_module', '0003_organizationsubscription_stripe_customer_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='subscriptionplan',
            name='stripe_price_id',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
