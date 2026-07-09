from __future__ import annotations

from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from smart_hr.personnel.models import SuccessionCandidate
from smart_hr.personnel.models import SuccessionPlan
from smart_hr.personnel.serializers import SuccessionCandidateSerializer
from smart_hr.personnel.serializers import SuccessionPlanSerializer
from smart_hr.users.permissions import IsRH


class SuccessionPlanViewSet(viewsets.ModelViewSet):
    """Matrice de succession/talents : un plan par poste clé, avec ses successeurs
    potentiels et leur niveau de préparation. Réservé RH/Admin (données sensibles
    sur l'évolution de carrière des employés)."""

    serializer_class = SuccessionPlanSerializer
    permission_classes = [IsRH]
    queryset = SuccessionPlan.objects.select_related("position").prefetch_related("candidates__employee__user")

    @action(detail=True, methods=["post"], url_path="candidates")
    def add_candidate(self, request, pk=None):
        """POST /succession-plans/{id}/candidates/ — Body: { employee, readiness, notes }"""
        plan = self.get_object()
        serializer = SuccessionCandidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if SuccessionCandidate.objects.filter(plan=plan, employee=serializer.validated_data["employee"]).exists():
            return Response(
                {"detail": "Cet employé est déjà candidat sur ce plan de succession."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer.save(plan=plan)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
