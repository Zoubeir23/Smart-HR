from rest_framework import filters
from rest_framework import viewsets

from smart_hr.personnel.models import Department
from smart_hr.personnel.serializers import DepartmentSerializer
from smart_hr.users.permissions import IsRH


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsRH]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]
