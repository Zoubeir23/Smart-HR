from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0003_user_is_email_verified_otpcode"),
    ]

    operations = [
        migrations.AddField(
            model_name="otpcode",
            name="failed_attempts",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="otpcode",
            name="locked_until",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
