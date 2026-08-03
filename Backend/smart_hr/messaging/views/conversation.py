from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.shortcuts import get_object_or_404
from rest_framework import mixins
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.core.pagination import LargeResultsSetPagination
from smart_hr.messaging import services
from smart_hr.messaging.contact_rules import can_start_conversation
from smart_hr.messaging.serializers import ConversationCreateSerializer
from smart_hr.messaging.serializers import ConversationSerializer
from smart_hr.messaging.serializers import MessageCreateSerializer
from smart_hr.messaging.serializers import MessageSerializer
from smart_hr.messaging.throttles import MessageSendThrottle
from smart_hr.users.models import User

if TYPE_CHECKING:
    from smart_hr.messaging.models import Conversation

logger = logging.getLogger(__name__)

DEFAULT_THREAD_PAGE_SIZE = 50
MAX_THREAD_PAGE_SIZE = 200

# Réponse volontairement identique que le destinataire soit inexistant ou
# simplement interdit : distinguer 404 et 403 permettrait à un candidat de
# cartographier les comptes existants en énumérant les identifiants.
UNREACHABLE_RECIPIENT_DETAIL = "Ce destinataire n'est pas accessible depuis votre compte."


class ConversationViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Fils de discussion de l'utilisateur courant.

    Un utilisateur ne voit que les conversations auxquelles il participe :
    le queryset est filtré sur `participant_links__user`, ce qui rend
    l'accès à une conversation tierce impossible (404).

    Les mixins sont composés explicitement plutôt qu'hérités de
    `ReadOnlyModelViewSet` : `create` y était surchargé sans mixin
    correspondant, ce qui laissait croire — à la lecture comme aux analyseurs
    statiques — que la route POST n'existait pas. Aucune route de
    modification ou de suppression n'est exposée : une conversation et ses
    messages sont immuables une fois postés.
    """

    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = LargeResultsSetPagination

    def get_queryset(self):
        search_term = self.request.query_params.get("search", "").strip()
        return services.search_conversations(self.request.user, search_term)

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        # Les compteurs ne servent qu'aux vues qui exposent des conversations.
        if self.action in {"list", "retrieve", "create"}:
            context["unread_counts"] = services.unread_counts_by_conversation(self.request.user)
        return context

    def get_throttles(self):
        """`create` peut poster un premier message : il doit subir la même limite.

        Sans cela, un appel répété à `POST /conversations/` avec un corps de
        message contournerait `MessageSendThrottle` en retombant sur la limite
        générique, bien plus permissive.
        """
        posts_a_message = self.action == "create" or (self.action == "messages" and self.request.method == "POST")
        if posts_a_message:
            return [MessageSendThrottle()]
        return super().get_throttles()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        conversations = page if page is not None else list(queryset)

        context = self.get_serializer_context()
        context["last_messages"] = services.last_messages_by_conversation([c.pk for c in conversations])
        serializer = self.get_serializer_class()(conversations, many=True, context=context)

        unread_total = services.count_total_unread_messages(request.user)
        if page is None:
            return Response({"results": serializer.data, "unread_total": unread_total})

        response = self.get_paginated_response(serializer.data)
        response.data["unread_total"] = unread_total
        return response

    def create(self, request, *args, **kwargs):
        """Ouvre (ou réutilise) une conversation directe avec un interlocuteur.

        `subject` n'est appliqué qu'à la création : sur une conversation déjà
        existante, le fil garde le sujet posé à son ouverture et la valeur
        transmise est ignorée.
        """
        serializer = ConversationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        recipient = User.objects.filter(pk=payload["participant_id"]).first()
        if recipient is None or not can_start_conversation(request.user, recipient):
            return Response(
                {"detail": UNREACHABLE_RECIPIENT_DETAIL},
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
            return self._read_thread(request, conversation)

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

    def _read_thread(self, request, conversation: Conversation) -> Response:
        """Renvoie la fenêtre des derniers messages et avance la date de lecture."""
        limit = self._resolve_thread_limit(request)
        total_count = conversation.messages.count()
        messages = services.recent_messages(conversation, limit)

        # On ne marque lu que jusqu'au dernier message réellement renvoyé :
        # un message arrivé pendant la requête reste non lu.
        if messages:
            services.mark_conversation_read(
                conversation=conversation,
                user=request.user,
                read_until=messages[-1].created_at,
            )

        return Response(
            {
                "results": MessageSerializer(messages, many=True, context={"request": request}).data,
                "total": total_count,
                "has_more": total_count > len(messages),
            },
        )

    @staticmethod
    def _resolve_thread_limit(request) -> int:
        """Taille de fenêtre demandée, bornée pour protéger le serveur."""
        raw_limit = request.query_params.get("limit", "")
        if not raw_limit.isdigit():
            return DEFAULT_THREAD_PAGE_SIZE
        return max(1, min(int(raw_limit), MAX_THREAD_PAGE_SIZE))

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
        conversation = get_object_or_404(
            services.conversations_for_user(self.request.user),
            pk=self.kwargs["pk"],
        )
        self.check_object_permissions(self.request, conversation)
        return conversation
