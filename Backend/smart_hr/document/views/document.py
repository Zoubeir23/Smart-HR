from rest_framework import filters
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.document.models import Document
from smart_hr.document.serializers import DocumentSerializer
from smart_hr.users.permissions import IsRH


class DocumentViewSet(viewsets.ModelViewSet):
    """Gestion des documents RH avec contrôle d'accès par rôle."""

    serializer_class = DocumentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "document_type", "category"]
    ordering_fields = ["created_at", "version", "category", "document_type"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Expose tous les documents à RH/Admin, sinon uniquement ceux de l'employé connecté.

        Filtres query params :
        - category : filtre par catégorie métier (administrative, legal, training, medical, financial, other)
        - document_type : filtre par type de document
        - employee_id : RH/Admin uniquement
        """
        user = self.request.user
        qs = Document.objects.select_related("employee__user", "uploaded_by")
        qs = qs.all() if user.role in ["ADMIN", "RH"] else qs.filter(employee__user=user)

        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        document_type = self.request.query_params.get("document_type")
        if document_type:
            qs = qs.filter(document_type=document_type)

        employee_id = self.request.query_params.get("employee_id")
        if employee_id and user.role in ["ADMIN", "RH"]:
            qs = qs.filter(employee_id=employee_id)

        return qs

    def get_permissions(self):
        """Réserve les opérations d'écriture aux responsables RH."""
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Associe l'utilisateur courant comme auteur du document créé."""
        serializer.save(uploaded_by=self.request.user)
