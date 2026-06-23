from django.contrib import admin
from django.utils.timezone import now

from smart_hr.paiement.models import AbattementRegle
from smart_hr.paiement.models import AllocationEmploye
from smart_hr.paiement.models import AllocationRegle
from smart_hr.paiement.models import BaremeImpot
from smart_hr.paiement.models import BulletinPaie
from smart_hr.paiement.models import CategorieConvention
from smart_hr.paiement.models import ChargesFamiliales
from smart_hr.paiement.models import HistoriqueSalaire
from smart_hr.paiement.models import LigneBulletin
from smart_hr.paiement.models import Payroll
from smart_hr.paiement.models import Pays
from smart_hr.paiement.models import RegleCotisation
from smart_hr.paiement.models import SalaireMinimum
from smart_hr.paiement.models import TaxeMinimaleForfaitaire

# ===========================================================================
# REFERENTIELS PAYS
# ===========================================================================


@admin.register(Pays)
class PaysAdmin(admin.ModelAdmin):
    list_display = ["nom", "code_iso", "devise", "arrondi_impot", "methode_arrondi"]
    search_fields = ["nom", "code_iso"]


@admin.register(CategorieConvention)
class CategorieConventionAdmin(admin.ModelAdmin):
    list_display = ["nom", "pays"]
    list_filter = ["pays"]
    search_fields = ["nom"]


@admin.register(SalaireMinimum)
class SalaireMinimumAdmin(admin.ModelAdmin):
    list_display = ["pays", "valeur", "date_debut_validite", "date_fin_validite"]
    list_filter = ["pays"]
    ordering = ["pays", "-date_debut_validite"]


# ===========================================================================
# REGLES FISCALES
# ===========================================================================


@admin.register(RegleCotisation)
class RegleCotisationAdmin(admin.ModelAdmin):
    list_display = [
        "nom_cotisation",
        "pays",
        "categorie",
        "taux_salarial",
        "taux_patronal",
        "plafond_assiette",
        "est_deductible_base_imposable",
        "date_debut_validite",
        "date_fin_validite",
    ]
    list_filter = ["pays", "categorie", "est_deductible_base_imposable"]
    search_fields = ["nom_cotisation", "code_declaration"]
    ordering = ["pays", "nom_cotisation", "-date_debut_validite"]


@admin.register(BaremeImpot)
class BaremeImpotAdmin(admin.ModelAdmin):
    list_display = ["pays", "plancher", "plafond", "taux", "date_debut_validite", "date_fin_validite"]
    list_filter = ["pays"]
    ordering = ["pays", "-date_debut_validite", "plancher"]


@admin.register(TaxeMinimaleForfaitaire)
class TaxeMinimaleForfaitaireAdmin(admin.ModelAdmin):
    list_display = ["pays", "plancher", "plafond", "montant_mensuel", "date_debut_validite"]
    list_filter = ["pays"]
    ordering = ["pays", "-date_debut_validite", "plancher"]


@admin.register(ChargesFamiliales)
class ChargesFamilialesAdmin(admin.ModelAdmin):
    list_display = [
        "pays",
        "situation_matrimoniale",
        "nombre_enfants",
        "nombre_parts",
        "reduction_impot_fixe",
        "date_debut_validite",
        "date_fin_validite",
    ]
    list_filter = ["pays", "situation_matrimoniale"]


@admin.register(AbattementRegle)
class AbattementRegleAdmin(admin.ModelAdmin):
    list_display = ["nom", "pays", "taux", "montant_fixe", "plafond_annuel", "plancher_annuel", "date_debut_validite"]
    list_filter = ["pays"]


@admin.register(AllocationRegle)
class AllocationRegleAdmin(admin.ModelAdmin):
    list_display = [
        "nom_allocation",
        "pays",
        "seuil_exoneration",
        "taux_imposable_excedent",
        "taux_cotisable_excedent",
        "date_debut_validite",
    ]
    list_filter = ["pays"]


# ===========================================================================
# SUIVI SALARIAL EMPLOYE
# ===========================================================================


@admin.register(HistoriqueSalaire)
class HistoriqueSalaireAdmin(admin.ModelAdmin):
    list_display = ["employee", "salaire_de_base", "date_debut", "date_fin", "motif"]
    list_filter = ["employee__department"]
    search_fields = [
        "employee__user__first_name",
        "employee__user__last_name",
        "employee__matricule",
    ]
    raw_id_fields = ["employee"]
    ordering = ["employee", "-date_debut"]


@admin.register(AllocationEmploye)
class AllocationEmployeAdmin(admin.ModelAdmin):
    list_display = ["employee", "regle", "montant_personnalise", "date_debut", "date_fin"]
    raw_id_fields = ["employee"]
    list_filter = ["regle__pays"]


# ===========================================================================
# BULLETIN DE PAIE
# ===========================================================================


class LigneBulletinInline(admin.TabularInline):
    model = LigneBulletin
    extra = 0
    readonly_fields = ["libelle", "nature", "base", "taux", "montant", "ordre_affichage"]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(BulletinPaie)
class BulletinPaieAdmin(admin.ModelAdmin):
    list_display = [
        "employee",
        "periode",
        "salaire_brut",
        "cotisations_salariales",
        "net_imposable",
        "impot",
        "net_a_payer",
        "statut",
    ]
    list_filter = ["statut", "periode", "employee__department"]
    search_fields = [
        "employee__user__first_name",
        "employee__user__last_name",
        "employee__matricule",
    ]
    readonly_fields = [
        "salaire_brut",
        "cotisations_salariales",
        "cotisations_patronales",
        "net_imposable",
        "impot",
        "net_a_payer",
        "regles_snapshot",
        "bulletin_remplace",
        "created_at",
        "updated_at",
    ]
    raw_id_fields = ["employee"]
    inlines = [LigneBulletinInline]
    ordering = ["-periode", "employee"]

    actions = ["verrouiller_bulletins", "emettre_bulletins"]

    @admin.action(description="🔒 Verrouiller les bulletins sélectionnés")
    def verrouiller_bulletins(self, request, queryset):
        verrouillables = queryset.filter(statut=BulletinPaie.Statut.EMIS)
        nombre = verrouillables.update(statut=BulletinPaie.Statut.VERROUILLE)
        self.message_user(request, f"{nombre} bulletin(s) verrouillé(s).")

    @admin.action(description="📤 Émettre les bulletins validés")
    def emettre_bulletins(self, request, queryset):
        emettables = queryset.filter(statut=BulletinPaie.Statut.VALIDE)
        nombre = emettables.update(statut=BulletinPaie.Statut.EMIS)
        self.message_user(request, f"{nombre} bulletin(s) émis.")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("employee__user", "employee__department")


# ===========================================================================
# COMPATIBILITE ASCENDANTE (Payroll legacy)
# ===========================================================================


@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = [
        "employee",
        "month",
        "base_salary",
        "bonuses",
        "deductions",
        "net_salary",
        "status",
        "created_at",
    ]
    list_filter = ["status", "month", "employee__department"]
    search_fields = [
        "employee__user__first_name",
        "employee__user__last_name",
        "employee__user__email",
        "month",
    ]
    readonly_fields = ["net_salary", "created_at", "updated_at"]
    raw_id_fields = ["employee"]
    ordering = ["-month"]
    actions = ["mark_as_paid", "mark_as_processed"]

    @admin.action(description="Marquer comme Payé")
    def mark_as_paid(self, request, queryset):
        updated = queryset.update(status=Payroll.Status.PAID, updated_at=now())
        self.message_user(request, f"{updated} fiche(s) de paie marquée(s) comme payée(s).")

    @admin.action(description="Marquer comme Traité")
    def mark_as_processed(self, request, queryset):
        updated = queryset.update(status=Payroll.Status.PROCESSED, updated_at=now())
        self.message_user(request, f"{updated} fiche(s) de paie marquée(s) comme traitée(s).")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("employee__user", "employee__department")
