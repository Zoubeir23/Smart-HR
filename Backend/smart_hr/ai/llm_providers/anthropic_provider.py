from __future__ import annotations

import logging
import os

from smart_hr.ai.llm_providers.base import BaseLLMProvider

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "claude-sonnet-4-6"
_MAX_TOKENS = 2048


class AnthropicProvider(BaseLLMProvider):
    """Fournisseur Anthropic Claude (SDK anthropic >= 0.40)."""

    def __init__(self) -> None:
        self._api_key = os.environ.get("ANTHROPIC_API_KEY")
        self._model = os.environ.get("ANTHROPIC_MODEL", _DEFAULT_MODEL)

    def _get_client(self):
        import anthropic

        return anthropic.Anthropic(api_key=self._api_key)

    def generate_response(
        self,
        system_prompt: str,
        history: list[dict],
        question: str,
    ) -> str:
        if not self._api_key:
            return "ANTHROPIC_API_KEY non configurée."
        try:
            client = self._get_client()
            messages = []
            for message in history:
                messages.append({"role": message["role"], "content": message["content"]})
            messages.append({"role": "user", "content": question})

            response = client.messages.create(
                model=self._model,
                max_tokens=_MAX_TOKENS,
                system=system_prompt,
                messages=messages,
            )
            return response.content[0].text
        except Exception as exc:
            logger.error("AnthropicProvider.generate_response error: %s", exc)
            raise

    def extract_json(self, prompt: str) -> str:
        if not self._api_key:
            return "{}"
        try:
            client = self._get_client()
            response = client.messages.create(
                model=self._model,
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text.strip()
        except Exception as exc:
            logger.error("AnthropicProvider.extract_json error: %s", exc)
            raise
