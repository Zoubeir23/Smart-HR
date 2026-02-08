from datetime import date

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from utilisateur.permissions import IsRH
from .models import Attendance
from .serializers import AttendanceSerializer, AttendanceCreateSerializer


class AttendanceViewSet(viewsets.ModelViewSet):
    """
    CRUD complet pour la gestion des présences.

    - list / retrieve : tous les utilisateurs authentifiés (employé voit les siens, RH voit tout)
    - create / update / delete : RH uniquement
    - today : action personnalisée pour récupérer les enregistrements du jour
    """

    queryset = Attendance.objects.select_related(
        'employee__user', 'employee__department',
    ).all()

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return AttendanceCreateSerializer
        return AttendanceSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsRH()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # Employees can only see their own attendance
        if user.role not in ('ADMIN', 'RH'):
            qs = qs.filter(employee__user=user)

        # Filters
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)

        filter_date = self.request.query_params.get('date')
        if filter_date:
            qs = qs.filter(date=filter_date)

        filter_status = self.request.query_params.get('status')
        if filter_status:
            qs = qs.filter(status=filter_status)

        return qs

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Retourne les enregistrements de présence du jour."""
        qs = self.get_queryset().filter(date=date.today())
        serializer = AttendanceSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
