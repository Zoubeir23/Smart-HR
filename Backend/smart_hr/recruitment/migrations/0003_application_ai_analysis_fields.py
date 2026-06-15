from django.db import migrations
import django.db.models.fields
import django.db.models.fields.json


class Migration(migrations.Migration):

    dependencies = [
        ('recruitment', '0002_add_timestampedmodel_base'),
    ]

    operations = [
        migrations.AddField(
            model_name='application',
            name='skills_extracted',
            field=django.db.models.fields.json.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='application',
            name='ai_summary',
            field=django.db.models.fields.TextField(blank=True, default=''),
            preserve_default=False,
        ),
    ]
