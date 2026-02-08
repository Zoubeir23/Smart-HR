from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from utilisateur.permissions import IsRH
from .models import Payroll
from .serializers import PayrollListSerializer, PayrollCreateSerializer


class PayrollViewSet(viewsets.ModelViewSet):
    """
    CRUD complet pour la gestion des fiches de paie.

    - list / retrieve : RH et Admin voient tout, employé voit les siens
    - create / update / delete : RH uniquement
    - Filtres : month, status, employee (query params)
    """

    queryset = Payroll.objects.select_related(
        'employee__user', 'employee__department',
    ).all()

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return PayrollCreateSerializer
        return PayrollListSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsRH()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # Employees can only see their own payrolls
        if user.role not in ('ADMIN', 'RH'):
            qs = qs.filter(employee__user=user)

        # Filters
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)

        month = self.request.query_params.get('month')
        if month:
            qs = qs.filter(month=month)

        filter_status = self.request.query_params.get('status')
        if filter_status:
            qs = qs.filter(status=filter_status)

        return qs
