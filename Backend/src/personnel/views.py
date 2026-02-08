from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from utilisateur.permissions import IsRH, IsOwnerOrRH
from .models import Employee, Department, Position
from .serializers import (
    EmployeeListSerializer,
    EmployeeDetailSerializer,
    EmployeeCreateUpdateSerializer,
    DepartmentSerializer,
    PositionSerializer,
)


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related('user', 'department', 'position').all()
    permission_classes = [IsAuthenticated, IsRH]

    def get_serializer_class(self):
        if self.action == 'list':
            return EmployeeListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return EmployeeCreateUpdateSerializer
        return EmployeeDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        dept = self.request.query_params.get('department')
        search = self.request.query_params.get('search')
        stat = self.request.query_params.get('status')
        if dept:
            qs = qs.filter(department_id=dept)
        if stat:
            qs = qs.filter(status=stat)
        if search:
            qs = qs.filter(
                models_Q(user__first_name__icontains=search) |
                models_Q(user__last_name__icontains=search) |
                models_Q(user__email__icontains=search)
            )
        return qs

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        try:
            employee = Employee.objects.select_related('user', 'department', 'position').get(user=request.user)
            return Response(EmployeeDetailSerializer(employee).data)
        except Employee.DoesNotExist:
            return Response({'detail': 'Profil employé non trouvé.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsRH])
    def stats(self, request):
        from django.db.models import Count, Avg
        total = Employee.objects.count()
        active = Employee.objects.filter(status='active').count()
        on_leave = Employee.objects.filter(status='on_leave').count()
        avg_salary = Employee.objects.aggregate(avg=Avg('salary'))['avg'] or 0
        high_risk = Employee.objects.filter(churn_risk__gte=70).count()
        by_department = Employee.objects.values('department__name').annotate(count=Count('id'))
        return Response({
            'total_employees': total,
            'active_employees': active,
            'on_leave': on_leave,
            'average_salary': round(float(avg_salary), 2),
            'high_churn_risk': high_risk,
            'by_department': list(by_department),
        })


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated, IsRH]


class PositionViewSet(viewsets.ModelViewSet):
    queryset = Position.objects.all()
    serializer_class = PositionSerializer
    permission_classes = [IsAuthenticated, IsRH]


# Helper for Q import
from django.db.models import Q as models_Q
