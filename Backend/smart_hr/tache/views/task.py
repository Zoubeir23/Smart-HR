import logging

from rest_framework import filters
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.core.email_service import send_task_assigned_email
from smart_hr.tache.models import Task
from smart_hr.tache.serializers import TaskSerializer
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class TaskViewSet(viewsets.ModelViewSet):
    """Gestion des tâches RH avec attribution et suivi de statut."""

    serializer_class = TaskSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["due_date", "priority", "status"]

    def get_queryset(self):
        """Expose toutes les tâches à RH/Admin, sinon celles de l'assigné."""
        user = self.request.user
        qs = Task.objects.select_related("assignee__user", "created_by")
        if user.role in ["ADMIN", "RH"]:
            return qs.all()
        return qs.filter(assignee__user=user)

    def get_permissions(self):
        """Restreint les opérations d'écriture aux rôles RH/Admin."""
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Crée une tâche et envoie un email d'assignation."""
        task = serializer.save(created_by=self.request.user)
        self._notify_assignee_task_created(task)

    def _notify_assignee_task_created(self, task: Task) -> None:
        """Notifie l'employé assigné avec les détails clés de la tâche."""
        assignee_user = task.assignee.user
        assigned_by_name = self.request.user.get_full_name() or self.request.user.email
        due_date_str = task.due_date.strftime("%d/%m/%Y") if task.due_date else ""

        try:
            send_task_assigned_email(
                employee_email=assignee_user.email,
                first_name=assignee_user.first_name or "",
                task_title=task.title,
                priority=task.priority,
                assigned_by=assigned_by_name,
                description=task.description or "",
                due_date=due_date_str,
            )
        except Exception:
            logger.exception(
                "Échec envoi email tâche assignée à %s",
                assignee_user.email,
            )

    @action(detail=True, methods=["patch"], url_path="update-status")
    def update_status(self, request, pk=None):
        """Met à jour uniquement le statut d'une tâche."""
        task = self.get_object()
        new_status = request.data.get("status")
        if new_status not in Task.Status.values:
            return Response(
                {
                    "detail": f"Statut invalide. Valeurs acceptées : {Task.Status.values}",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        task.status = new_status
        task.save(update_fields=["status", "updated_at"])
        serializer = self.get_serializer(task)
        return Response(serializer.data)
