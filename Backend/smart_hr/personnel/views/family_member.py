from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import FamilyMember
from smart_hr.personnel.serializers import FamilyMemberSerializer
from smart_hr.users.permissions import IsRH


class FamilyMemberViewSet(viewsets.ModelViewSet):
    """CRUD des membres de la famille d'un employé.

    Endpoints :
        GET    /api/v1/personnel/family-members/?employee=<id>
        POST   /api/v1/personnel/family-members/
        GET    /api/v1/personnel/family-members/<id>/
        PATCH  /api/v1/personnel/family-members/<id>/
        DELETE /api/v1/personnel/family-members/<id>/
    """

    serializer_class = FamilyMemberSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role in ["ADMIN", "RH"]:
            queryset = FamilyMember.objects.select_related("employee").all()
        else:
            employee = Employee.objects.filter(user=user).first()
            queryset = FamilyMember.objects.filter(employee=employee) if employee else FamilyMember.objects.none()

        employee_id = self.request.query_params.get("employee")
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        return queryset

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsRH()]
