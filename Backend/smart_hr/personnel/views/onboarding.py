import logging

from django.utils import timezone
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.personnel.models import OnboardingProgram
from smart_hr.personnel.models import OnboardingStep
from smart_hr.personnel.serializers import OnboardingProgramSerializer
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class OnboardingProgramViewSet(viewsets.ModelViewSet):
    """Programmes structurés d'intégration (onboarding) et de départ (offboarding).

    Chaque programme est une liste d'étapes à cocher au fur et à mesure.
    Le programme passe automatiquement à "Terminé" quand toutes ses étapes
    sont complétées (et rouvre si l'une est décochée).
    """

    serializer_class = OnboardingProgramSerializer
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        qs = OnboardingProgram.objects.select_related("employee__user").prefetch_related("steps").order_by("-created_at")
        if user.role in ["ADMIN", "RH"]:
            employee_id = self.request.query_params.get("employee")
            if employee_id:
                qs = qs.filter(employee_id=employee_id)
            return qs
        return qs.filter(employee__user=user)

    def get_permissions(self):
        if self.action in ["create", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """
        POST /api/v1/personnel/onboarding-programs/
        Body: { employee, program_type, title, steps: [{title, description}, ...] }
        """
        steps_payload = request.data.get("steps") or []
        valid_steps = [step for step in steps_payload if step.get("title")]
        if not valid_steps:
            return Response({"steps": ["Au moins une étape est requise."]}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        program = serializer.save(created_by=request.user)

        OnboardingStep.objects.bulk_create(
            [
                OnboardingStep(
                    program=program,
                    title=step.get("title", ""),
                    description=step.get("description", ""),
                    order=index,
                )
                for index, step in enumerate(valid_steps)
            ]
        )

        output = self.get_serializer(program)
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path=r"steps/(?P<step_id>\d+)/toggle")
    def toggle_step(self, request, pk=None, step_id=None):
        """POST /onboarding-programs/{id}/steps/{step_id}/toggle/ — coche/décoche une étape."""
        program = self.get_object()
        try:
            step = program.steps.get(pk=step_id)
        except OnboardingStep.DoesNotExist:
            return Response({"detail": "Étape introuvable."}, status=status.HTTP_404_NOT_FOUND)

        step.is_completed = not step.is_completed
        step.completed_at = timezone.now() if step.is_completed else None
        step.save(update_fields=["is_completed", "completed_at", "updated_at"])

        program.refresh_status()

        serializer = self.get_serializer(program)
        return Response(serializer.data)
