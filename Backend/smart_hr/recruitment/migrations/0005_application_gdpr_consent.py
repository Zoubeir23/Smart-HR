from django.db import migrations
from django.db import models


class Migration(migrations.Migration):
    dependencies = [
        ("recruitment", "0004_alter_application_cv"),
    ]

    operations = [
        migrations.AddField(
            model_name="application",
            name="gdpr_consent",
            field=models.BooleanField(
                default=False,
                help_text="Le candidat a consenti au traitement de son CV par l'IA (RGPD).",
            ),
        ),
    ]
