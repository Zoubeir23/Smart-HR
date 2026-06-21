from django.contrib import admin

from smart_hr.conge.models import LeaveRequest


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = [
        "employee",
        "leave_type",
        "status",
        "start_date",
        "end_date",
        "duration_working_days",
        "is_deductible",
        "approved_by",
        "created_at",
    ]
    list_filter = ["status", "leave_type", "start_date"]
    search_fields = [
        "employee__user__first_name",
        "employee__user__last_name",
        "reason",
    ]
    readonly_fields = ["duration_days", "duration_working_days", "is_deductible", "created_at", "updated_at"]
    raw_id_fields = ["employee", "approved_by"]
    date_hierarchy = "start_date"
    ordering = ["-created_at"]

    actions = ["bulk_approve", "bulk_reject"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "employee__user",
            "approved_by",
        )

    @admin.action(description="✅ Approuver les demandes sélectionnées")
    def bulk_approve(self, request, queryset):
        updated = queryset.filter(status=LeaveRequest.Status.PENDING).update(
            status=LeaveRequest.Status.APPROVED,
            approved_by=request.user,
        )
        self.message_user(request, f"{updated} demande(s) approuvée(s).")

    @admin.action(description="❌ Refuser les demandes sélectionnées")
    def bulk_reject(self, request, queryset):
        updated = queryset.filter(status=LeaveRequest.Status.PENDING).update(
            status=LeaveRequest.Status.REJECTED,
            approved_by=request.user,
        )
        self.message_user(request, f"{updated} demande(s) refusée(s).")
