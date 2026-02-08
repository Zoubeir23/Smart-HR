from django.conf import settings
from django.db import models

from personnel.models import Employee


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = 'todo', 'A faire'
        IN_PROGRESS = 'in_progress', 'En cours'
        IN_REVIEW = 'in_review', 'En revue'
        DONE = 'done', 'Terminée'

    class Priority(models.TextChoices):
        LOW = 'low', 'Basse'
        MEDIUM = 'medium', 'Moyenne'
        HIGH = 'high', 'Haute'

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    assignee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='tasks',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_tasks',
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TODO,
    )
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Tâche'
        verbose_name_plural = 'Tâches'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_status_display()}) - {self.assignee}"
