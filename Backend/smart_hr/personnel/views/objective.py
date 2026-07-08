from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.personnel.models import KeyResult
from smart_hr.personnel.models import Objective
from smart_hr.personnel.serializers import KeyResultSerializer
from smart_hr.personnel.serializers import ObjectiveSerializer
from smart_hr.users.permissions import IsRH


class ObjectiveViewSet(viewsets.ModelViewSet):
    """OKR : objectifs et résultats clés portés par un employé.

    La progression et le statut d'un objectif sont dérivés de ses Key Results
    (jamais saisis manuellement) — voir Objective.progress / Objective.status.
    """

    serializer_class = ObjectiveSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action == "destroy":
            return [IsRH()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = Objective.objects.select_related("employee__user").prefetch_related("key_results").order_by("-created_at")
        if user.role in ["ADMIN", "RH"]:
            employee_id = self.request.query_params.get("employee")
            if employee_id:
                qs = qs.filter(employee_id=employee_id)
            return qs
        return qs.filter(employee__user=user)

    def create(self, request, *args, **kwargs):
        """
        POST /api/v1/personnel/objectives/
        Body: { employee, title, description, period, key_results: [{title, unit, target_value}, ...] }

        RH/Admin peuvent créer un objectif pour n'importe quel employé.
        Un employé ne peut créer un objectif que pour lui-même.
        """
        user = request.user
        employee_id = request.data.get("employee")

        if user.role not in ["ADMIN", "RH"]:
            owned_employee_id = getattr(getattr(user, "employee_profile", None), "pk", None)
            if str(employee_id) != str(owned_employee_id):
                return Response(
                    {"detail": "Vous ne pouvez créer un objectif que pour vous-même."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        key_results_payload = request.data.get("key_results") or []
        valid_key_results = [kr for kr in key_results_payload if kr.get("title")]
        if not valid_key_results:
            return Response({"key_results": ["Au moins un résultat clé est requis."]}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        objective = serializer.save(created_by=user)

        KeyResult.objects.bulk_create(
            [
                KeyResult(
                    objective=objective,
                    title=kr.get("title", ""),
                    unit=kr.get("unit", ""),
                    target_value=kr.get("target_value") or 0,
                    order=index,
                )
                for index, kr in enumerate(valid_key_results)
            ]
        )

        objective = self.get_queryset().get(pk=objective.pk)
        output = self.get_serializer(objective)
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"], url_path=r"key-results/(?P<key_result_id>\d+)")
    def update_key_result(self, request, pk=None, key_result_id=None):
        """PATCH /objectives/{id}/key-results/{key_result_id}/ — met à jour la valeur atteinte."""
        objective = self.get_object()
        try:
            key_result = objective.key_results.get(pk=key_result_id)
        except KeyResult.DoesNotExist:
            return Response({"detail": "Résultat clé introuvable."}, status=status.HTTP_404_NOT_FOUND)

        current_value = request.data.get("current_value")
        if current_value is not None:
            key_result.current_value = current_value
            key_result.save(update_fields=["current_value", "updated_at"])

        serializer = KeyResultSerializer(key_result)
        return Response(serializer.data)
