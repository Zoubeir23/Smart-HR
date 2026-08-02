"""Services métier de la messagerie interne.

Toute la logique d'écriture passe par ce module : les vues restent minces et
les invariants (unicité des conversations directes, mise à jour de
`last_message_at`, notification des destinataires) sont garantis en un seul
endroit.
"""

from __future__ import annotations

import logging

from django.db import transaction
from django.db.models import Count
from django.db.models import F
from django.db.models import IntegerField
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import QuerySet
from django.db.models import Subquery
from django.utils import timezone

from smart_hr.core.models import Notification
from smart_hr.messaging.models import Conversation
from smart_hr.messaging.models import ConversationParticipant
from smart_hr.messaging.models import Message
from smart_hr.users.models import User

logger = logging.getLogger(__name__)

NOTIFICATION_PREVIEW_LENGTH = 120


def find_direct_conversation(first_user: User, second_user: User) -> Conversation | None:
    """Retourne la conversation directe reliant exactement ces deux utilisateurs.

    Le total de participants est calculé par sous-requête : une agrégation
    directe compterait les lignes déjà restreintes par les `filter()` sur
    `participant_links` et renverrait toujours 1.
    """
    participant_total = Subquery(
        ConversationParticipant.objects.filter(conversation=OuterRef("pk"))
        .values("conversation")
        .annotate(total=Count("id"))
        .values("total")[:1],
        output_field=IntegerField(),
    )
    return (
        Conversation.objects.filter(kind=Conversation.Kind.DIRECT)
        .filter(participant_links__user=first_user)
        .filter(participant_links__user=second_user)
        .annotate(participant_total=participant_total)
        .filter(participant_total=2)
        .first()
    )


@transaction.atomic
def get_or_create_direct_conversation(initiator: User, recipient: User) -> tuple[Conversation, bool]:
    """Récupère ou crée la conversation directe entre deux utilisateurs.

    Retourne `(conversation, created)`. L'appelant est responsable d'avoir
    vérifié au préalable les droits via `contact_rules.can_start_conversation`.
    """
    existing = find_direct_conversation(initiator, recipient)
    if existing is not None:
        return existing, False

    conversation = Conversation.objects.create(
        kind=Conversation.Kind.DIRECT,
        created_by=initiator,
    )
    ConversationParticipant.objects.bulk_create(
        [
            ConversationParticipant(conversation=conversation, user=initiator),
            ConversationParticipant(conversation=conversation, user=recipient),
        ],
    )
    return conversation, True


@transaction.atomic
def post_message(*, conversation: Conversation, sender: User, body: str) -> Message:
    """Ajoute un message au fil, marque l'expéditeur à jour et notifie les autres."""
    message = Message.objects.create(conversation=conversation, sender=sender, body=body)

    now = timezone.now()
    Conversation.objects.filter(pk=conversation.pk).update(last_message_at=now)
    conversation.last_message_at = now
    ConversationParticipant.objects.filter(conversation=conversation, user=sender).update(last_read_at=now)

    transaction.on_commit(lambda: notify_recipients(message))
    return message


def notify_recipients(message: Message) -> None:
    """Crée une notification in-app pour chaque destinataire du message."""
    sender = message.sender
    sender_name = (sender.get_full_name() or sender.email) if sender else "Un utilisateur"
    recipient_ids = (
        ConversationParticipant.objects.filter(conversation_id=message.conversation_id)
        .exclude(user_id=getattr(sender, "pk", None))
        .values_list("user_id", flat=True)
    )

    preview = message.body[:NOTIFICATION_PREVIEW_LENGTH]
    if len(message.body) > NOTIFICATION_PREVIEW_LENGTH:
        preview = f"{preview}…"

    notifications = [
        Notification(
            recipient_id=recipient_id,
            notification_type=Notification.NotificationType.MESSAGE_RECEIVED,
            title=f"Nouveau message de {sender_name}",
            message=preview,
            target_url=f"/messages?conversation={message.conversation_id}",
        )
        for recipient_id in recipient_ids
    ]
    if not notifications:
        return

    try:
        Notification.objects.bulk_create(notifications)
    except Exception:
        logger.exception("Échec création des notifications pour le message %s", message.pk)


def mark_conversation_read(*, conversation: Conversation, user: User) -> None:
    """Marque tous les messages de la conversation comme lus pour cet utilisateur."""
    ConversationParticipant.objects.filter(conversation=conversation, user=user).update(
        last_read_at=timezone.now(),
    )


def unread_messages_queryset(user: User) -> QuerySet[Message]:
    """Messages non lus par `user`, tous fils confondus.

    Les deux conditions sont posées dans un unique `filter()` afin que Django
    réutilise la même jointure sur `participant_links` : la date de dernière
    lecture comparée est bien celle de l'utilisateur courant.
    """
    return Message.objects.filter(
        Q(conversation__participant_links__user=user)
        & (
            Q(conversation__participant_links__last_read_at__isnull=True)
            | Q(created_at__gt=F("conversation__participant_links__last_read_at"))
        )
        & (Q(sender__isnull=True) | ~Q(sender_id=user.pk)),
    )


def unread_counts_by_conversation(user: User) -> dict[int, int]:
    """Nombre de messages non lus par conversation, en une seule requête."""
    rows = unread_messages_queryset(user).values("conversation_id").annotate(unread=Count("id"))
    return {row["conversation_id"]: row["unread"] for row in rows}


def count_total_unread_messages(user: User) -> int:
    """Total des messages non lus, toutes conversations confondues (badge)."""
    return unread_messages_queryset(user).count()


def conversations_for_user(user: User) -> QuerySet[Conversation]:
    """Conversations auxquelles l'utilisateur participe, prêtes à être sérialisées."""
    return (
        Conversation.objects.filter(participant_links__user=user)
        .prefetch_related("participant_links__user")
        .distinct()
    )


def search_conversations(user: User, search_term: str) -> QuerySet[Conversation]:
    """Filtre les conversations sur le sujet, le nom ou l'email des participants."""
    queryset = conversations_for_user(user)
    if not search_term:
        return queryset
    return queryset.filter(
        Q(subject__icontains=search_term)
        | Q(participant_links__user__first_name__icontains=search_term)
        | Q(participant_links__user__last_name__icontains=search_term)
        | Q(participant_links__user__email__icontains=search_term),
    ).distinct()


def last_messages_by_conversation(conversation_ids: list[int]) -> dict[int, Message]:
    """Dernier message de chaque conversation, en deux requêtes au total.

    `Max("id")` sert de proxy portable au dernier message : les identifiants
    étant monotones, ils suivent l'ordre chronologique d'insertion. Évite le
    `DISTINCT ON` réservé à PostgreSQL.
    """
    if not conversation_ids:
        return {}

    latest_ids = (
        Message.objects.filter(conversation_id__in=conversation_ids)
        .values("conversation_id")
        .annotate(latest_id=Max("id"))
        .values_list("latest_id", flat=True)
    )
    messages = Message.objects.filter(id__in=list(latest_ids)).select_related("sender")
    return {message.conversation_id: message for message in messages}


def visible_participants(conversation: Conversation, user: User) -> list[User]:
    """Autres participants d'une conversation, hors utilisateur courant."""
    return [link.user for link in conversation.participant_links.all() if link.user_id != user.pk]
