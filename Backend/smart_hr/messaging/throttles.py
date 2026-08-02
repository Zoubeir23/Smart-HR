from rest_framework.throttling import UserRateThrottle


class MessageSendThrottle(UserRateThrottle):
    """Limite l'envoi de messages à 120/heure par utilisateur — anti-spam."""

    scope = "messaging_send"
