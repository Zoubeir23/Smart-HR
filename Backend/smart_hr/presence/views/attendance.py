from django.utils import timezone
from rest_framework import filters
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.presence.models import Attendance
from smart_hr.presence.serializers import AttendanceSerializer
from smart_hr.users.permissions import IsRH


class AttendanceViewSet(viewsets.ModelViewSet):
    """Suivi des présences quotidiennes avec filtrage par rôle."""

    serializer_class = AttendanceSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["date"]

    def get_queryset(self):
        """Expose toutes les présences à RH/Admin, sinon celles de l'employé connecté."""
        user = self.request.user
        qs = Attendance.objects.select_related("employee__user")
        if user.role in ["ADMIN", "RH"]:
            return qs.all()
        return qs.filter(employee__user=user)

    def get_permissions(self):
        """Limite les modifications de présence aux profils RH/Admin."""
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    @action(detail=False, methods=["get"])
    def today(self, request):
        """Retourne les présences du jour (filtré par rôle)."""
        today = timezone.now().date()
        qs = Attendance.objects.filter(date=today).select_related("employee__user")
        if request.user.role not in ["ADMIN", "RH"]:
            qs = qs.filter(employee__user=request.user)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)
