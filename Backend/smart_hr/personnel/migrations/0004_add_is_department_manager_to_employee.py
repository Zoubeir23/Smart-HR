from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("personnel", "0003_add_contract_model"),
    ]

    operations = [
        migrations.AddField(
            model_name="employee",
            name="is_department_manager",
            field=models.BooleanField(
                default=False,
                help_text="Désigne cet employé comme responsable de son département (N+1).",
            ),
        ),
    ]
