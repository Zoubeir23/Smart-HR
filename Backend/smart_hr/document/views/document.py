from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.document.models import Document
from smart_hr.document.serializers import DocumentSerializer
from smart_hr.users.permissions import IsRH


class DocumentViewSet(viewsets.ModelViewSet):
    """Gestion des documents RH avec contrôle d'accès par rôle."""

    serializer_class = DocumentSerializer

    def get_queryset(self):
        """Expose tous les documents à RH/Admin, sinon uniquement ceux de l'employé connecté."""
        user = self.request.user
        qs = Document.objects.select_related("employee__user", "uploaded_by")
        if user.role in ["ADMIN", "RH"]:
            return qs.all()
        return qs.filter(employee__user=user)

    def get_permissions(self):
        """Réserve les opérations d'écriture aux responsables RH."""
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Associe l'utilisateur courant comme auteur du document créé."""
        serializer.save(uploaded_by=self.request.user)
