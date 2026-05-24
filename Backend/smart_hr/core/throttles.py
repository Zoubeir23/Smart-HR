from rest_framework.throttling import AnonRateThrottle
from rest_framework.throttling import UserRateThrottle


class AILLMUserThrottle(UserRateThrottle):
    """Limite les appels LLM payants à 20/heure par utilisateur authentifié."""

    scope = "ai_llm"


class AILLMAnonThrottle(AnonRateThrottle):
    """Limite les appels LLM sur endpoints publics à 10/heure par IP."""

    scope = "ai_llm_anon"
