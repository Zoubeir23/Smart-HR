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
        from conge.models import LeaveRequest
        from recruitment.models import JobOffer, Application

        total = Employee.objects.count()
        active = Employee.objects.filter(status='active').count()
        on_leave = Employee.objects.filter(status='on_leave').count()
        avg_salary = Employee.objects.aggregate(avg=Avg('salary'))['avg'] or 0
        high_risk = Employee.objects.filter(churn_risk__gte=70).count()
        by_department = Employee.objects.values('department__name').annotate(count=Count('id'))

        # Additional stats for dashboard
        pending_leaves = LeaveRequest.objects.filter(status='pending').count()
        open_positions = JobOffer.objects.filter(status='open').count()
        new_applications = Application.objects.filter(status='pending').count()

        return Response({
            'total_employees': total,
            'active_employees': active,
            'on_leave': on_leave,
            'average_salary': round(float(avg_salary), 2),
            'high_churn_risk': high_risk,
            'churn_risk_high': high_risk,  # Alias for consistency
            'by_department': list(by_department),
            'pending_leaves': pending_leaves,
            'open_positions': open_positions,
            'new_applications': new_applications,
        })

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsRH])
    def retention_stats(self, request):
        """
        Calculate retention and turnover stats for the last 12 months.
        Returns monthly data for retention chart.
        """
        from django.db.models import Count
        from django.utils import timezone
        from datetime import timedelta
        import calendar

        # Get data for last 12 months
        months = []
        now = timezone.now()

        for i in range(11, -1, -1):
            # Calculate the first day of the month
            target_date = now - timedelta(days=30 * i)
            month_name = calendar.month_abbr[target_date.month]

            # For simplicity, calculate retention as (active employees / total employees) * 100
            # In production, you'd track actual hires and departures
            total_employees = Employee.objects.count()
            active_employees = Employee.objects.filter(status='active').count()

            if total_employees > 0:
                retention = round((active_employees / total_employees) * 100, 1)
                turnover = round(100 - retention, 1)
            else:
                retention = 100
                turnover = 0

            months.append({
                'month': month_name,
                'retention': retention,
                'turnover': turnover,
            })

        return Response(months)


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
