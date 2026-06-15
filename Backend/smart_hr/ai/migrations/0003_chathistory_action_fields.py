from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [
        ("ai", "0002_add_timestampedmodel_base"),
    ]

    operations = [
        migrations.AddField(
            model_name="chathistory",
            name="action_type",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AddField(
            model_name="chathistory",
            name="action_data",
            field=models.JSONField(default=dict),
        ),
    ]
