from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.conge.models import LeaveRequest
from smart_hr.conge.serializers import LeaveRequestSerializer
from smart_hr.users.permissions import IsRH


class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role in ["ADMIN", "RH"]:
            return LeaveRequest.objects.select_related("employee__user", "approved_by").all()
        return LeaveRequest.objects.select_related("employee__user").filter(employee__user=user)

    def get_permissions(self):
        if self.action in ["approve", "reject"]:
            return [IsRH()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        leave = self.get_object()
        leave.status = LeaveRequest.Status.APPROVED
        leave.approved_by = request.user
        leave.save()
        return Response({"status": "approved"})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        leave = self.get_object()
        leave.status = LeaveRequest.Status.REJECTED
        leave.approved_by = request.user
        leave.save()
        return Response({"status": "rejected"})
