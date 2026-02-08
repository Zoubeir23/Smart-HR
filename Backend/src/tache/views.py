from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from utilisateur.permissions import IsRH, IsEmployee, IsOwnerOrRH
from .models import Task
from .serializers import (
    TaskListSerializer,
    TaskCreateUpdateSerializer,
    TaskSerializer,
)


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tasks.

    - Employees see only tasks assigned to them.
    - RH / Admin can see and manage all tasks.
    """

    def get_queryset(self):
        user = self.request.user
        qs = Task.objects.select_related(
            'assignee__user',
            'assignee__department',
            'assignee__position',
            'created_by',
        )
        if user.role in ('ADMIN', 'RH'):
            return qs.all()
        # Regular employees see only tasks assigned to them
        return qs.filter(assignee__user=user)

    def get_permissions(self):
        if self.action in ('create', 'destroy'):
            return [IsAuthenticated(), IsRH()]
        return [IsAuthenticated(), IsEmployee()]

    def get_serializer_class(self):
        if self.action == 'list':
            return TaskListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return TaskCreateUpdateSerializer
        return TaskSerializer

    @action(detail=True, methods=['patch'], url_path='update-status')
    def update_status(self, request, pk=None):
        """Allow updating only the status field of a task."""
        task = self.get_object()
        new_status = request.data.get('status')
        valid_statuses = [choice[0] for choice in Task.Status.choices]

        if not new_status:
            return Response(
                {'detail': 'Le champ "status" est requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if new_status not in valid_statuses:
            return Response(
                {'detail': f'Statut invalide. Choix valides : {valid_statuses}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task.status = new_status
        task.save(update_fields=['status'])
        serializer = TaskSerializer(task)
        return Response(serializer.data)
