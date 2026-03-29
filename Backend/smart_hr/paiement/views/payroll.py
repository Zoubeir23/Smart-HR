from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.paiement.models import Payroll
from smart_hr.paiement.serializers import PayrollSerializer
from smart_hr.users.permissions import IsRH


class PayrollViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Payroll.objects.select_related("employee__user")
        if user.role in ["ADMIN", "RH"]:
            return qs.all()
        return qs.filter(employee__user=user)

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]
