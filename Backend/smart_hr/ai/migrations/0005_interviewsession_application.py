import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ai", "0004_interview_session"),
        ("recruitment", "0005_application_gdpr_consent"),
    ]

    operations = [
        migrations.AddField(
            model_name="interviewsession",
            name="application",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="interview_sessions",
                to="recruitment.application",
            ),
        ),
    ]
