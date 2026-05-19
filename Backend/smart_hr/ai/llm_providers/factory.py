from __future__ import annotations

import logging
import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from smart_hr.ai.llm_providers.base import BaseLLMProvider

logger = logging.getLogger(__name__)

_PROVIDER_MAP = {
    "gemini": "smart_hr.ai.llm_providers.gemini_provider.GeminiProvider",
    "openai": "smart_hr.ai.llm_providers.openai_provider.OpenAIProvider",
    "claude": "smart_hr.ai.llm_providers.anthropic_provider.AnthropicProvider",
    "grok": "smart_hr.ai.llm_providers.grok_provider.GrokProvider",
}

_DEFAULT_PROVIDER = "gemini"


def get_llm_provider() -> BaseLLMProvider:
    """
    Retourne le fournisseur LLM actif selon la variable d'environnement LLM_PROVIDER.

    Valeurs acceptées : gemini (défaut), openai, claude, grok.
    Exemple .env : LLM_PROVIDER=claude
    """
    provider_name = os.environ.get("LLM_PROVIDER", _DEFAULT_PROVIDER).lower().strip()
    class_path = _PROVIDER_MAP.get(provider_name)

    if not class_path:
        logger.warning(
            "LLM_PROVIDER='%s' inconnu. Fournisseurs disponibles : %s. "
            "Repli sur '%s'.",
            provider_name,
            ", ".join(_PROVIDER_MAP.keys()),
            _DEFAULT_PROVIDER,
        )
        class_path = _PROVIDER_MAP[_DEFAULT_PROVIDER]

    module_path, class_name = class_path.rsplit(".", 1)
    import importlib

    module = importlib.import_module(module_path)
    provider_class = getattr(module, class_name)
    return provider_class()
