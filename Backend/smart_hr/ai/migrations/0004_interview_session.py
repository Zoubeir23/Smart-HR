import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ai", "0003_chathistory_action_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="InterviewSession",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "token",
                    models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
                ),
                ("job_position", models.CharField(max_length=255)),
                ("job_description", models.TextField(blank=True)),
                ("duration", models.CharField(default="30 Min", max_length=20)),
                ("interview_type", models.CharField(default="Technique", max_length=50)),
                ("questions", models.JSONField(default=list)),
                (
                    "status",
                    models.CharField(
                        choices=[("active", "Actif"), ("closed", "Fermé")],
                        default="active",
                        max_length=20,
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="interview_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Session d'entretien",
                "verbose_name_plural": "Sessions d'entretien",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="InterviewSessionFeedback",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("candidate_name", models.CharField(max_length=255)),
                ("candidate_email", models.EmailField(max_length=254)),
                ("conversation", models.JSONField(default=list)),
                ("feedback", models.JSONField(default=dict)),
                ("recommended", models.BooleanField(default=False)),
                (
                    "session",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="feedbacks",
                        to="ai.interviewsession",
                    ),
                ),
            ],
            options={
                "verbose_name": "Feedback entretien",
                "verbose_name_plural": "Feedbacks entretien",
                "ordering": ["-created_at"],
            },
        ),
    ]
