from django.db.models import Q
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
    """OKR en cascade Entreprise → Département → Individu, et résultats clés.

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
        qs = (
            Objective.objects.select_related("employee__user", "department")
            .prefetch_related("key_results")
            .order_by("-created_at")
        )
        if user.role in ["ADMIN", "RH"]:
            employee_id = self.request.query_params.get("employee")
            if employee_id:
                qs = qs.filter(employee_id=employee_id)
            level = self.request.query_params.get("level")
            valid_levels = {c[0] for c in Objective.Level.choices}
            if level in valid_levels:
                qs = qs.filter(level=level)
            return qs

        employee = getattr(user, "employee_profile", None)
        department_id = getattr(employee, "department_id", None)
        return qs.filter(
            Q(employee__user=user)
            | Q(level=Objective.Level.COMPANY)
            | (Q(level=Objective.Level.DEPARTMENT) & Q(department_id=department_id))
        )

    def create(self, request, *args, **kwargs):
        """
        POST /api/v1/personnel/objectives/
        Body: { level, employee, department, parent, title, description, period,
                key_results: [{title, unit, target_value}, ...] }

        - level=individual : RH/Admin peuvent créer pour n'importe quel employé ;
          un employé ne peut créer un objectif que pour lui-même.
        - level=department / company : réservé RH/Admin (pilotage stratégique).
        """
        user = request.user
        level = request.data.get("level", Objective.Level.INDIVIDUAL)
        employee_id = request.data.get("employee")

        if level != Objective.Level.INDIVIDUAL and user.role not in ["ADMIN", "RH"]:
            return Response(
                {"detail": "Seuls RH/Admin peuvent créer un objectif de niveau Département ou Entreprise."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if level == Objective.Level.INDIVIDUAL and user.role not in ["ADMIN", "RH"]:
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
