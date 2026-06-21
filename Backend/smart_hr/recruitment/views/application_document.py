from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from smart_hr.recruitment.models import ApplicationDocument
from smart_hr.recruitment.serializers import ApplicationDocumentSerializer
from smart_hr.users.permissions import IsRH


class ApplicationDocumentViewSet(viewsets.ModelViewSet):
    """GED Recrutement — pièces jointes complémentaires d'une candidature.

    Endpoints :
        GET    /api/v1/recruitment/application-documents/?application=<id>
        POST   /api/v1/recruitment/application-documents/
        GET    /api/v1/recruitment/application-documents/<id>/
        DELETE /api/v1/recruitment/application-documents/<id>/
    """

    serializer_class = ApplicationDocumentSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role in ["ADMIN", "RH"]:
            queryset = ApplicationDocument.objects.select_related("application").all()
        else:
            queryset = ApplicationDocument.objects.filter(application__candidate=user)

        application_id = self.request.query_params.get("application")
        if application_id:
            queryset = queryset.filter(application_id=application_id)

        return queryset.order_by("document_type", "created_at")

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        if self.action == "create":
            return [IsAuthenticated()]
        return [IsRH()]

    def perform_create(self, serializer):
        user = self.request.user
        application = serializer.validated_data["application"]
        if user.role not in ["ADMIN", "RH"] and application.candidate != user:
            raise PermissionDenied(
                "Vous ne pouvez déposer des documents que pour votre propre candidature.",
            )
        serializer.save()
