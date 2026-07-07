from __future__ import annotations

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.ai.models import ChatHistory
from smart_hr.ai.models import Conversation
from smart_hr.ai.serializers import ChatHistorySerializer
from smart_hr.ai.serializers import ConversationSerializer


class ConversationViewSet(viewsets.ModelViewSet):
    """Fils de discussion du chat IA : liste, création, suppression, messages.

    Scopé par utilisateur — ``get_object()`` lève un 404 (pas un 403) sur le
    fil d'un autre utilisateur, évitant de confirmer son existence.
    """

    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        """GET /api/v1/ai/conversations/{id}/messages/ — échanges triés chronologiquement."""
        conversation = self.get_object()
        history = ChatHistory.objects.filter(conversation=conversation).order_by("created_at")
        serializer = ChatHistorySerializer(history, many=True)
        return Response(serializer.data)
