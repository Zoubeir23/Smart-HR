from __future__ import annotations

from rest_framework import status
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.personnel.models import CareerPath
from smart_hr.personnel.models import CareerPathStep
from smart_hr.personnel.serializers import CareerPathSerializer
from smart_hr.users.permissions import IsRH


class CareerPathViewSet(viewsets.ModelViewSet):
    """Parcours de carrière type (ex: "Parcours Directeur Général") : gérés par
    RH/Admin, consultables par tous les utilisateurs internes authentifiés."""

    serializer_class = CareerPathSerializer
    queryset = CareerPath.objects.prefetch_related("steps__position").order_by("title")

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """
        POST /api/v1/personnel/career-paths/
        Body: { title, description, steps: [{position, order}, ...] }
        """
        steps_payload = request.data.get("steps") or []
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        career_path = serializer.save()

        CareerPathStep.objects.bulk_create(
            [
                CareerPathStep(career_path=career_path, position_id=step.get("position"), order=index)
                for index, step in enumerate(steps_payload)
                if step.get("position")
            ]
        )

        output = self.get_serializer(career_path)
        return Response(output.data, status=status.HTTP_201_CREATED)
