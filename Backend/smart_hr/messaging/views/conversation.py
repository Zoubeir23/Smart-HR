from __future__ import annotations

import logging

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.messaging import services
from smart_hr.messaging.contact_rules import can_start_conversation
from smart_hr.messaging.models import Conversation
from smart_hr.messaging.serializers import ConversationCreateSerializer
from smart_hr.messaging.serializers import ConversationSerializer
from smart_hr.messaging.serializers import MessageCreateSerializer
from smart_hr.messaging.serializers import MessageSerializer
from smart_hr.messaging.throttles import MessageSendThrottle
from smart_hr.users.models import User

logger = logging.getLogger(__name__)


class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    """Fils de discussion de l'utilisateur courant.

    Un utilisateur ne voit que les conversations auxquelles il participe :
    le queryset est filtré sur `participant_links__user`, ce qui rend
    l'accès à une conversation tierce impossible (404).
    """

    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        search_term = self.request.query_params.get("search", "").strip()
        return services.search_conversations(self.request.user, search_term)

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        context["unread_counts"] = services.unread_counts_by_conversation(self.request.user)
        return context

    def list(self, request, *args, **kwargs):
        conversations = list(self.get_queryset())
        context = self.get_serializer_context()
        context["last_messages"] = services.last_messages_by_conversation([c.pk for c in conversations])
        serializer = self.get_serializer_class()(conversations, many=True, context=context)
        return Response(
            {
                "results": serializer.data,
                "unread_total": services.count_total_unread_messages(request.user),
            },
        )

    def create(self, request, *args, **kwargs):
        """Ouvre (ou réutilise) une conversation directe avec un interlocuteur."""
        serializer = ConversationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        recipient = User.objects.filter(pk=payload["participant_id"]).first()
        if recipient is None:
            return Response(
                {"detail": "Destinataire introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not can_start_conversation(request.user, recipient):
            return Response(
                {"detail": "Votre rôle ne vous autorise pas à contacter cet utilisateur."},
                status=status.HTTP_403_FORBIDDEN,
            )

        conversation, created = services.get_or_create_direct_conversation(request.user, recipient)

        subject = payload.get("subject", "").strip()
        if created and subject:
            conversation.subject = subject
            conversation.save(update_fields=["subject", "updated_at"])

        body = payload.get("body", "").strip()
        if body:
            services.post_message(conversation=conversation, sender=request.user, body=body)

        output = ConversationSerializer(conversation, context=self.get_serializer_context())
        return Response(
            output.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get", "post"], url_path="messages")
    def messages(self, request, pk=None):
        """Consulte le fil (GET) ou y poste un message (POST)."""
        conversation = self.get_object()

        if request.method == "GET":
            queryset = conversation.messages.select_related("sender")
            serializer = MessageSerializer(queryset, many=True, context={"request": request})
            services.mark_conversation_read(conversation=conversation, user=request.user)
            return Response({"results": serializer.data})

        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = services.post_message(
            conversation=conversation,
            sender=request.user,
            body=serializer.validated_data["body"],
        )
        return Response(
            MessageSerializer(message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def get_throttles(self):
        if self.action == "messages" and self.request.method == "POST":
            return [MessageSendThrottle()]
        return super().get_throttles()

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        """Marque la conversation comme lue pour l'utilisateur courant."""
        conversation = self.get_object()
        services.mark_conversation_read(conversation=conversation, user=request.user)
        return Response({"unread_total": services.count_total_unread_messages(request.user)})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """Compteur global pour le badge de la barre latérale."""
        return Response({"unread_total": services.count_total_unread_messages(request.user)})

    def get_object(self) -> Conversation:
        """Restreint l'accès aux conversations de l'utilisateur courant."""
        return get_object_or_404(
            services.conversations_for_user(self.request.user),
            pk=self.kwargs["pk"],
        )
