from __future__ import annotations

import logging
import os

from smart_hr.ai.llm_providers.base import BaseLLMProvider

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "grok-3"
_GROK_BASE_URL = "https://api.x.ai/v1"


class GrokProvider(BaseLLMProvider):
    """
    Fournisseur xAI Grok.
    Grok expose une API compatible OpenAI — on utilise le SDK openai
    avec une base URL personnalisée.
    """

    def __init__(self) -> None:
        self._api_key = os.environ.get("GROK_API_KEY")
        self._model = os.environ.get("GROK_MODEL", _DEFAULT_MODEL)

    def _get_client(self):
        from openai import OpenAI

        return OpenAI(api_key=self._api_key, base_url=_GROK_BASE_URL)

    def generate_response(
        self,
        system_prompt: str,
        history: list[dict],
        question: str,
    ) -> str:
        if not self._api_key:
            return "GROK_API_KEY non configurée."
        try:
            client = self._get_client()
            messages = [{"role": "system", "content": system_prompt}]
            messages.extend({"role": m["role"], "content": m["content"]} for m in history)
            messages.append({"role": "user", "content": question})

            response = client.chat.completions.create(
                model=self._model,
                messages=messages,
            )
            return response.choices[0].message.content
        except Exception as exc:
            logger.error("GrokProvider.generate_response error: %s", exc)
            raise

    def extract_json(self, prompt: str) -> str:
        if not self._api_key:
            return "{}"
        try:
            client = self._get_client()
            response = client.chat.completions.create(
                model=self._model,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.choices[0].message.content.strip()
        except Exception as exc:
            logger.error("GrokProvider.extract_json error: %s", exc)
            raise
