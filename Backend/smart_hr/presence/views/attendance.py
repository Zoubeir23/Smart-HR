import logging

from django.db.models import Count
from django.db.models import Q
from django.utils import timezone
from rest_framework import filters
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.personnel.models import Employee
from smart_hr.presence.models import Attendance
from smart_hr.presence.serializers import AttendanceCheckInSerializer
from smart_hr.presence.serializers import AttendanceCheckOutSerializer
from smart_hr.presence.serializers import AttendanceSerializer
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class AttendanceViewSet(viewsets.ModelViewSet):
    """Suivi complet des présences : CRUD, check-in/out, stats mensuelles, filtrage avancé."""

    serializer_class = AttendanceSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["employee__user__first_name", "employee__user__last_name", "note"]
    ordering_fields = ["date", "check_in", "status"]
    ordering = ["-date"]

    def get_queryset(self):
        """Expose toutes les présences à RH/Admin, sinon celles de l'employé connecté.

        Filtres disponibles via query params (RH/Admin) :
        - date, date_start, date_end, status, employee_id, department_id
        """
        user = self.request.user
        qs = Attendance.objects.select_related(
            "employee__user",
            "employee__department",
        )

        if user.role in ["ADMIN", "RH"]:
            # Filtres avancés
            date = self.request.query_params.get("date")
            date_start = self.request.query_params.get("date_start")
            date_end = self.request.query_params.get("date_end")
            att_status = self.request.query_params.get("status")
            employee_id = self.request.query_params.get("employee_id")
            dept_id = self.request.query_params.get("department_id")

            if date:
                qs = qs.filter(date=date)
            if date_start:
                qs = qs.filter(date__gte=date_start)
            if date_end:
                qs = qs.filter(date__lte=date_end)
            if att_status:
                qs = qs.filter(status=att_status)
            if employee_id:
                qs = qs.filter(employee_id=employee_id)
            if dept_id:
                qs = qs.filter(employee__department_id=dept_id)
            return qs.all()

        return qs.filter(employee__user=user)

    def get_permissions(self):
        """Accès en lecture pour tous les authentifiés, écriture réservée aux RH/Admin."""
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    # ─── Actions métier ──────────────────────────────────────────────

    @action(detail=False, methods=["get"])
    def today(self, request):
        """Retourne les présences du jour courant (filtrées par rôle)."""
        today = timezone.now().date()
        qs = Attendance.objects.filter(date=today).select_related(
            "employee__user",
            "employee__department",
        )
        if request.user.role not in ["ADMIN", "RH"]:
            qs = qs.filter(employee__user=request.user)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="check-in")
    def check_in(self, request):
        """Pointe l'arrivée d'un employé pour aujourd'hui (RH/Admin).

        Crée ou met à jour l'enregistrement du jour avec check_in = maintenant.
        """
        if request.user.role not in ["ADMIN", "RH"]:
            return Response(status=status.HTTP_403_FORBIDDEN)

        serializer_in = AttendanceCheckInSerializer(data=request.data)
        serializer_in.is_valid(raise_exception=True)

        employee_id = serializer_in.validated_data["employee_id"]
        note = serializer_in.validated_data.get("note", "")
        today = timezone.now().date()
        now_time = timezone.now().time()

        try:
            employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response(
                {"detail": "Employé introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        attendance, created = Attendance.objects.get_or_create(
            employee=employee,
            date=today,
            defaults={"check_in": now_time, "status": Attendance.Status.PRESENT, "note": note},
        )
        if not created:
            # Mise à jour du check_in si déjà existant
            attendance.check_in = now_time
            if note:
                attendance.note = note
            attendance.save(update_fields=["check_in", "note", "updated_at"])

        out_serializer = self.get_serializer(attendance)
        return Response(out_serializer.data, status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="check-out")
    def check_out(self, request, pk=None):
        """Enregistre l'heure de sortie pour une présence existante (RH/Admin)."""
        if request.user.role not in ["ADMIN", "RH"]:
            return Response(status=status.HTTP_403_FORBIDDEN)

        attendance = self.get_object()
        serializer_in = AttendanceCheckOutSerializer(data=request.data)
        serializer_in.is_valid(raise_exception=True)

        now_time = timezone.now().time()
        note = serializer_in.validated_data.get("note", "")

        if attendance.check_in and now_time <= attendance.check_in:
            return Response(
                {"detail": "L'heure de sortie doit être après l'heure d'arrivée."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attendance.check_out = now_time
        if note:
            attendance.note = note
        attendance.save(update_fields=["check_out", "note", "updated_at"])

        out_serializer = self.get_serializer(attendance)
        return Response(out_serializer.data)

    @action(detail=False, methods=["get"], url_path="monthly-stats")
    def monthly_stats(self, request):
        """Statistiques de présence mensuelles (réservé RH/Admin).

        Query params :
        - year (int): Année, défaut = année courante
        - month (int): Mois (1-12), défaut = mois courant
        """
        if request.user.role not in ["ADMIN", "RH"]:
            return Response(status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        try:
            year = int(request.query_params.get("year", now.year))
            month = int(request.query_params.get("month", now.month))
        except ValueError:
            return Response(
                {"detail": "Les paramètres year et month doivent être des entiers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = Attendance.objects.filter(date__year=year, date__month=month)
        total = qs.count()

        by_status = {s: qs.filter(status=s).count() for s in ["present", "absent", "late", "half_day"]}

        by_department = list(
            qs.values("employee__department__name")
            .annotate(
                total=Count("id"),
                present=Count("id", filter=Q(status="present")),
                absent=Count("id", filter=Q(status="absent")),
                late=Count("id", filter=Q(status="late")),
            )
            .order_by("-total"),
        )

        return Response(
            {
                "year": year,
                "month": month,
                "total_records": total,
                "by_status": by_status,
                "by_department": by_department,
            },
        )
