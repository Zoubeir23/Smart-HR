from __future__ import annotations

from rest_framework import serializers

from smart_hr.messaging.models import Conversation
from smart_hr.messaging.models import Message
from smart_hr.messaging.services import visible_participants
from smart_hr.users.models import User


class ContactSerializer(serializers.ModelSerializer):
    """Interlocuteur autorisé, exposé sans donnée RH sensible."""

    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = ["id", "full_name", "email", "role", "role_display"]

    def get_full_name(self, obj: User) -> str:
        return obj.get_full_name() or obj.email


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.CharField(source="sender.role", read_only=True, default="")
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "sender_name",
            "sender_role",
            "body",
            "is_mine",
            "created_at",
        ]
        read_only_fields = ["id", "conversation", "sender", "created_at"]

    def get_sender_name(self, obj: Message) -> str:
        if obj.sender is None:
            return "Utilisateur supprimé"
        return obj.sender.get_full_name() or obj.sender.email

    def get_is_mine(self, obj: Message) -> bool:
        request = self.context.get("request")
        return bool(request and obj.sender_id == request.user.pk)


class MessageCreateSerializer(serializers.Serializer):
    """Validation du corps d'un message entrant."""

    body = serializers.CharField(
        max_length=Message.MAX_BODY_LENGTH,
        trim_whitespace=True,
        allow_blank=False,
    )

    def validate_body(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            msg = "Le message ne peut pas être vide."
            raise serializers.ValidationError(msg)
        return cleaned


class ConversationSerializer(serializers.ModelSerializer):
    participants_detail = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    display_title = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "kind",
            "subject",
            "display_title",
            "participants_detail",
            "last_message",
            "unread_count",
            "last_message_at",
            "created_at",
        ]

    def _current_user(self) -> User | None:
        request = self.context.get("request")
        return request.user if request else None

    def get_participants_detail(self, obj: Conversation) -> list[dict]:
        user = self._current_user()
        if user is None:
            return []
        return ContactSerializer(visible_participants(obj, user), many=True).data

    def get_display_title(self, obj: Conversation) -> str:
        if obj.subject:
            return obj.subject
        user = self._current_user()
        if user is None:
            return str(obj)
        others = visible_participants(obj, user)
        if not others:
            return "Conversation"
        return ", ".join(other.get_full_name() or other.email for other in others)

    def get_last_message(self, obj: Conversation) -> dict | None:
        """Utilise la carte pré-calculée par la vue liste, sinon requête unitaire."""
        last_messages: dict[int, Message] | None = self.context.get("last_messages")
        message = last_messages.get(obj.pk) if last_messages is not None else obj.messages.order_by("-created_at", "-id").first()
        if message is None:
            return None
        return MessageSerializer(message, context=self.context).data

    def get_unread_count(self, obj: Conversation) -> int:
        unread_map: dict[int, int] = self.context.get("unread_counts", {})
        return unread_map.get(obj.pk, 0)


class ConversationCreateSerializer(serializers.Serializer):
    """Ouverture d'une conversation directe, avec un premier message optionnel."""

    participant_id = serializers.IntegerField()
    subject = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    body = serializers.CharField(
        max_length=Message.MAX_BODY_LENGTH,
        required=False,
        allow_blank=True,
        default="",
        trim_whitespace=True,
    )
