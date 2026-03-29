from django.db.models import Count

from rest_framework import filters
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.personnel.models import Employee
from smart_hr.personnel.serializers import EmployeeSerializer
from smart_hr.users.permissions import IsRH


class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["user__first_name", "user__last_name", "user__email", "cin"]
    ordering_fields = ["hire_date", "salary"]

    def get_queryset(self):
        user = self.request.user
        qs = Employee.objects.select_related("user", "department", "position")
        if user.role in ["ADMIN", "RH"]:
            return qs.all()
        return qs.filter(user=user)

    def get_permissions(self):
        if self.action in ["list", "retrieve", "me"]:
            return [IsAuthenticated()]
        return [IsRH()]

    @action(detail=False, methods=["get"])
    def me(self, request):
        """Retourne le profil employé de l'utilisateur connecté."""
        try:
            employee = Employee.objects.select_related(
                "user", "department", "position"
            ).get(user=request.user)
            serializer = self.get_serializer(employee)
            return Response(serializer.data)
        except Employee.DoesNotExist:
            return Response(
                {"detail": "Profil employé non trouvé pour cet utilisateur."},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """KPIs globaux sur les employés (réservé RH/Admin)."""
        if request.user.role not in ["ADMIN", "RH"]:
            return Response(status=status.HTTP_403_FORBIDDEN)

        total = Employee.objects.count()
        by_status = {
            s: Employee.objects.filter(status=s).count()
            for s in ["active", "inactive", "on_leave"]
        }
        by_department = list(
            Employee.objects.values("department__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        high_churn_risk = Employee.objects.filter(churn_risk__gte=70).count()

        return Response(
            {
                "total_employees": total,
                "by_status": by_status,
                "by_department": by_department,
                "high_churn_risk": high_churn_risk,
            }
        )

    @action(detail=False, methods=["get"], url_path="retention-stats")
    def retention_stats(self, request):
        """Statistiques de rétention par mois (réservé RH/Admin)."""
        if request.user.role not in ["ADMIN", "RH"]:
            return Response(status=status.HTTP_403_FORBIDDEN)

        from django.db.models.functions import TruncMonth
        from django.utils import timezone

        cutoff = timezone.now() - timezone.timedelta(days=365)
        monthly = (
            Employee.objects.filter(created_at__gte=cutoff)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(new_hires=Count("id"))
            .order_by("month")
        )

        data = [
            {
                "month": entry["month"].strftime("%Y-%m"),
                "new_hires": entry["new_hires"],
            }
            for entry in monthly
        ]
        return Response({"retention_stats": data})
