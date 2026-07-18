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
            messages = [{"role": m["role"], "content": m["content"]} for m in history]
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

    def detect_action(
        self,
        system_prompt: str,
        question: str,
        tools: list[dict],
    ) -> tuple[str | None, dict]:
        if not self._api_key or not tools:
            return None, {}
        try:
            client = self._get_client()
            response = client.messages.create(
                model=self._model,
                max_tokens=_MAX_TOKENS,
                system=system_prompt,
                messages=[{"role": "user", "content": question}],
                tools=[
                    {
                        "name": tool["name"],
                        "description": tool["description"],
                        "input_schema": tool["parameters"],
                    }
                    for tool in tools
                ],
            )
            for block in response.content:
                if block.type == "tool_use":
                    return block.name, dict(block.input or {})
            return None, {}
        except Exception as exc:
            logger.error("AnthropicProvider.detect_action error: %s", exc)
            return None, {}
