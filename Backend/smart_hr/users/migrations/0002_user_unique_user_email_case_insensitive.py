import django.db.models.functions.text
from django.db import migrations
from django.db import models

DUPLICATE_EMAIL_SUFFIX = "+doublon"


def rename_duplicate_emails(apps, schema_editor):
    """Désamorce les doublons d'email avant la pose de la contrainte d'unicité.

    Le compte le plus ancien (celui qui a servi à s'inscrire) conserve son
    adresse ; les suivants reçoivent une adresse suffixée afin qu'aucune donnée
    ne soit détruite. Un administrateur peut ensuite les fusionner ou les
    supprimer depuis l'admin Django.
    """
    user_model = apps.get_model("users", "User")
    seen_emails: set[str] = set()

    for user in user_model.objects.exclude(email="").order_by("date_joined", "pk").iterator():
        normalized_email = user.email.lower()
        if normalized_email not in seen_emails:
            seen_emails.add(normalized_email)
            continue

        local_part, _, domain = user.email.partition("@")
        renamed_email = f"{local_part}{DUPLICATE_EMAIL_SUFFIX}{user.pk}@{domain}" if domain else f"{user.email}{DUPLICATE_EMAIL_SUFFIX}{user.pk}"
        user.email = renamed_email
        user.save(update_fields=["email"])
        seen_emails.add(renamed_email.lower())


def restore_duplicate_emails(apps, schema_editor):
    """Retire le suffixe posé par la migration avant (opération réversible)."""
    user_model = apps.get_model("users", "User")
    for user in user_model.objects.filter(email__contains=DUPLICATE_EMAIL_SUFFIX).iterator():
        local_part, _, domain = user.email.partition("@")
        original_local_part = local_part.split(DUPLICATE_EMAIL_SUFFIX)[0]
        user.email = f"{original_local_part}@{domain}" if domain else original_local_part
        user.save(update_fields=["email"])


class Migration(migrations.Migration):
    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(rename_duplicate_emails, restore_duplicate_emails),
        migrations.AddConstraint(
            model_name="user",
            constraint=models.UniqueConstraint(
                django.db.models.functions.text.Lower("email"),
                condition=models.Q(("email", ""), _negated=True),
                name="unique_user_email_case_insensitive",
            ),
        ),
    ]
