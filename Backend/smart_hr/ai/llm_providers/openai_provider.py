from __future__ import annotations

import logging
import os

from smart_hr.ai.llm_providers.base import BaseLLMProvider

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "gpt-4o"


class OpenAIProvider(BaseLLMProvider):
    """Fournisseur OpenAI (SDK openai >= 1.x)."""

    def __init__(self) -> None:
        self._api_key = os.environ.get("OPENAI_API_KEY")
        self._model = os.environ.get("OPENAI_MODEL", _DEFAULT_MODEL)

    def _get_client(self):
        from openai import OpenAI

        return OpenAI(api_key=self._api_key)

    def generate_response(
        self,
        system_prompt: str,
        history: list[dict],
        question: str,
    ) -> str:
        if not self._api_key:
            return "OPENAI_API_KEY non configurée."
        try:
            client = self._get_client()
            messages = [{"role": "system", "content": system_prompt}]
            for message in history:
                messages.append({"role": message["role"], "content": message["content"]})
            messages.append({"role": "user", "content": question})

            response = client.chat.completions.create(
                model=self._model,
                messages=messages,
            )
            return response.choices[0].message.content
        except Exception as exc:
            logger.error("OpenAIProvider.generate_response error: %s", exc)
            raise

    def extract_json(self, prompt: str) -> str:
        if not self._api_key:
            return "{}"
        try:
            client = self._get_client()
            response = client.chat.completions.create(
                model=self._model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            return response.choices[0].message.content.strip()
        except Exception as exc:
            logger.error("OpenAIProvider.extract_json error: %s", exc)
            raise
