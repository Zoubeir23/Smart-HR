from rest_framework import viewsets

from smart_hr.personnel.models import Contract
from smart_hr.personnel.serializers import ContractSerializer
from smart_hr.users.permissions import IsRH


class ContractViewSet(viewsets.ModelViewSet):
    """API CRUD des contrats employés."""

    queryset = Contract.objects.select_related("employee__user").all()
    serializer_class = ContractSerializer
    permission_classes = [IsRH]

    def get_queryset(self):
        queryset = super().get_queryset()
        employee_id = self.request.query_params.get("employee")
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        return queryset
