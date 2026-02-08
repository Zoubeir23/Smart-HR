from rest_framework import serializers
from utilisateur.serializers import UserSerializer
from .models import Task


class TaskListSerializer(serializers.ModelSerializer):
    """Serializer for listing tasks with nested read-only info."""

    assignee_id = serializers.IntegerField(source='assignee.id', read_only=True)
    assignee_name = serializers.CharField(
        source='assignee.user.get_full_name', read_only=True,
    )
    assignee_email = serializers.EmailField(
        source='assignee.user.email', read_only=True,
    )
    department = serializers.CharField(
        source='assignee.department.name', read_only=True, default=None,
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True,
    )
    priority_display = serializers.CharField(
        source='get_priority_display', read_only=True,
    )
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', read_only=True, default=None,
    )

    class Meta:
        model = Task
        fields = [
            'id',
            'title', 'description',
            'assignee', 'assignee_id', 'assignee_name', 'assignee_email',
            'department',
            'created_by', 'created_by_name',
            'status', 'status_display',
            'priority', 'priority_display',
            'due_date',
            'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at']


class TaskCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating tasks."""

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'assignee',
            'status', 'priority', 'due_date',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class TaskSerializer(serializers.ModelSerializer):
    """Full detail serializer for a single task."""

    assignee_user = UserSerializer(source='assignee.user', read_only=True)
    created_by_user = UserSerializer(source='created_by', read_only=True)
    status_display = serializers.CharField(
        source='get_status_display', read_only=True,
    )
    priority_display = serializers.CharField(
        source='get_priority_display', read_only=True,
    )
    department = serializers.CharField(
        source='assignee.department.name', read_only=True, default=None,
    )
    position = serializers.CharField(
        source='assignee.position.title', read_only=True, default=None,
    )

    class Meta:
        model = Task
        fields = [
            'id',
            'title', 'description',
            'assignee', 'assignee_user',
            'department', 'position',
            'created_by', 'created_by_user',
            'status', 'status_display',
            'priority', 'priority_display',
            'due_date',
            'created_at',
        ]
        read_only_fields = fields
