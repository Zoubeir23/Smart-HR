from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from utilisateur.permissions import IsRH, IsEmployee, IsOwnerOrRH
from .models import LeaveRequest
from .serializers import (
    LeaveRequestListSerializer,
    LeaveRequestCreateSerializer,
    LeaveRequestSerializer,
)


class LeaveRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing leave requests.

    - Employees can list their own leaves and create new requests.
    - RH / Admin can list all leaves and approve or reject them.
    """

    def get_queryset(self):
        user = self.request.user
        qs = LeaveRequest.objects.select_related(
            'employee__user',
            'employee__department',
            'employee__position',
            'approved_by',
        )
        if user.role in ('ADMIN', 'RH'):
            return qs.all()
        # Regular employees see only their own leaves
        return qs.filter(employee__user=user)

    def get_permissions(self):
        if self.action in ('approve', 'reject'):
            return [IsAuthenticated(), IsRH()]
        if self.action == 'destroy':
            return [IsAuthenticated(), IsRH()]
        return [IsAuthenticated(), IsEmployee()]

    def get_serializer_class(self):
        if self.action == 'list':
            return LeaveRequestListSerializer
        if self.action == 'create':
            return LeaveRequestCreateSerializer
        return LeaveRequestSerializer

    @action(detail=True, methods=['patch'], url_path='approve')
    def approve(self, request, pk=None):
        leave = self.get_object()
        if leave.status != LeaveRequest.Status.PENDING:
            return Response(
                {'detail': 'Seules les demandes en attente peuvent être approuvées.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        leave.status = LeaveRequest.Status.APPROVED
        leave.approved_by = request.user
        leave.save(update_fields=['status', 'approved_by'])
        serializer = LeaveRequestSerializer(leave)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='reject')
    def reject(self, request, pk=None):
        leave = self.get_object()
        if leave.status != LeaveRequest.Status.PENDING:
            return Response(
                {'detail': 'Seules les demandes en attente peuvent être refusées.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        leave.status = LeaveRequest.Status.REJECTED
        leave.approved_by = request.user
        leave.save(update_fields=['status', 'approved_by'])
        serializer = LeaveRequestSerializer(leave)
        return Response(serializer.data)
