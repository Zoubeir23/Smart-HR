from django.db.models import Count
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.formation.models import Formation
from smart_hr.formation.models import Participation
from smart_hr.formation.serializers import FormationSerializer
from smart_hr.users.permissions import IsRH


def _completion_rate(completed: int, total: int) -> float:
    if not total:
        return 0.0
    return round((completed / total) * 100, 1)


class FormationViewSet(viewsets.ModelViewSet):
    """API CRUD des formations et de leurs réunions associées."""

    queryset = Formation.objects.prefetch_related("meetings", "participations").all()
    serializer_class = FormationSerializer

    def get_permissions(self):
        """Réserve l'écriture aux rôles RH/Admin et autorise la lecture authentifiée."""
        if self.action in ["create", "update", "partial_update", "destroy", "completion_stats"]:
            return [IsRH()]
        return [IsAuthenticated()]

    @action(detail=False, methods=["get"], url_path="completion-stats")
    def completion_stats(self, request):
        """Taux de complétion des formations — global et par formation.

        Basé sur Participation.completed_at (renseigné automatiquement
        dès que le statut passe à "Terminé" — voir Participation.save()).
        """
        totals = Participation.objects.aggregate(
            total=Count("id"),
            completed=Count("id", filter=Q(status=Participation.Status.COMPLETED)),
        )

        formations = Formation.objects.annotate(
            total_participations=Count("participations"),
            completed_participations=Count(
                "participations",
                filter=Q(participations__status=Participation.Status.COMPLETED),
            ),
        ).order_by("-start_date")

        by_formation = [
            {
                "id": f.pk,
                "title": f.title,
                "total_participations": f.total_participations,
                "completed": f.completed_participations,
                "completion_rate": _completion_rate(f.completed_participations, f.total_participations),
            }
            for f in formations
        ]

        return Response(
            {
                "global": {
                    "total_participations": totals["total"],
                    "completed": totals["completed"],
                    "completion_rate": _completion_rate(totals["completed"], totals["total"]),
                },
                "by_formation": by_formation,
            }
        )
