from rest_framework import filters
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.tache.models import Task
from smart_hr.tache.serializers import TaskSerializer
from smart_hr.users.permissions import IsRH


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
        serializer.save(created_by=self.request.user)

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
