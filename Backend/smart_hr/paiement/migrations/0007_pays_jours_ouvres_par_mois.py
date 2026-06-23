from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("paiement", "0006_heures_sup_anciennete_licenciement"),
    ]

    operations = [
        migrations.AddField(
            model_name="pays",
            name="jours_ouvres_par_mois",
            field=models.IntegerField(
                default=26,
                help_text="Nombre de jours ouvrés de référence par mois (26 au Sénégal/Comores, 22 en France).",
            ),
        ),
    ]
