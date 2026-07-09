from __future__ import annotations

from django.db.models import Q
from rest_framework import filters
from rest_framework import status
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.performance.models import Feedback360
from smart_hr.performance.serializers import Feedback360Serializer
from smart_hr.users.models import User


class Feedback360ViewSet(viewsets.ModelViewSet):
    """Feedback qualitatif entre collègues (évaluation 360°) : tout employé peut
    laisser un feedback à un collègue ; RH/Admin voient tout, un employé ne voit
    que les feedbacks qu'il a donnés ou reçus."""

    serializer_class = Feedback360Serializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["comment", "context"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        base = Feedback360.objects.select_related("author__user", "recipient__user")

        if user.role in [User.Role.ADMIN, User.Role.RH]:
            recipient_id = self.request.query_params.get("recipient")
            if recipient_id:
                base = base.filter(recipient_id=recipient_id)
            return base

        employee = getattr(user, "employee_profile", None)
        if employee is None:
            return base.none()
        return base.filter(Q(author=employee) | Q(recipient=employee))

    def create(self, request, *args, **kwargs):
        if getattr(request.user, "employee_profile", None) is None:
            return Response(
                {"detail": "Seul un utilisateur ayant un profil employé peut laisser un feedback."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user.employee_profile)
