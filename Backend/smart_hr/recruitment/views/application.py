from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.recruitment.models import Application
from smart_hr.recruitment.serializers import ApplicationSerializer
from smart_hr.users.permissions import IsCandidate
from smart_hr.users.permissions import IsRH


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role in ["ADMIN", "RH"]:
            return Application.objects.select_related("job_offer", "candidate").all()
        return Application.objects.filter(candidate=user)

    def get_permissions(self):
        if self.action == "create":
            return [IsCandidate()]
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsRH()]

    def perform_create(self, serializer):
        serializer.save(candidate=self.request.user)

    @action(detail=True, methods=["patch"], url_path="update-status")
    def update_status(self, request, pk=None):
        """Met à jour le statut d'une candidature (RH seulement)."""
        application = self.get_object()
        new_status = request.data.get("status")
        if new_status not in Application.Status.values:
            return Response(
                {"detail": f"Statut invalide. Valeurs acceptées : {Application.Status.values}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        application.status = new_status
        application.save(update_fields=["status", "updated_at"])
        serializer = self.get_serializer(application)
        return Response(serializer.data)
