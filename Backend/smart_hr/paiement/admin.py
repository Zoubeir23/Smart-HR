from django.contrib import admin
from django.db.models import Sum

from smart_hr.paiement.models import Payroll


@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    """Admin enrichi pour les fiches de paie."""

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

    @admin.action(description="✅ Marquer comme Payé")
    def mark_as_paid(self, request, queryset):
        """Action en masse : passe les fiches sélectionnées à l'état 'paid'."""
        updated = queryset.update(status=Payroll.Status.PAID)
        self.message_user(request, f"{updated} fiche(s) de paie marquée(s) comme payée(s).")

    @admin.action(description="⚙️ Marquer comme Traité")
    def mark_as_processed(self, request, queryset):
        """Action en masse : passe les fiches sélectionnées à l'état 'processed'."""
        updated = queryset.update(status=Payroll.Status.PROCESSED)
        self.message_user(request, f"{updated} fiche(s) de paie marquée(s) comme traitée(s).")

    def get_queryset(self, request):
        """Optimise avec select_related pour éviter les N+1."""
        return super().get_queryset(request).select_related(
            "employee__user", "employee__department"
        )
