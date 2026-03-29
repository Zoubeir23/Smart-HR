from rest_framework import serializers

from smart_hr.tache.models import Task


class TaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.CharField(source="assignee.user.get_full_name", read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "assignee",
            "assignee_name",
            "created_by",
            "status",
            "priority",
            "due_date",
            "created_at",
        ]
        read_only_fields = ["created_at"]
