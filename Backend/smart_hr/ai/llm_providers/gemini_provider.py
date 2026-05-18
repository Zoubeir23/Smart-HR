from __future__ import annotations

import logging
import os

from smart_hr.ai.llm_providers.base import BaseLLMProvider

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "gemini-2.0-flash"


class GeminiProvider(BaseLLMProvider):
    """Fournisseur Google Gemini (SDK google-genai v1.x)."""

    def __init__(self) -> None:
        self._api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self._model = os.environ.get("GEMINI_MODEL", _DEFAULT_MODEL)

    def _get_client(self):
        from google import genai

        return genai.Client(api_key=self._api_key)

    def generate_response(
        self,
        system_prompt: str,
        history: list[dict],
        question: str,
    ) -> str:
        if not self._api_key:
            return "GEMINI_API_KEY non configurée."
        try:
            from google.genai import types

            client = self._get_client()
            contents = []
            for message in history:
                role = "user" if message["role"] == "user" else "model"
                contents.append(
                    types.Content(role=role, parts=[types.Part(text=message["content"])])
                )
            contents.append(types.Content(role="user", parts=[types.Part(text=question)]))

            response = client.models.generate_content(
                model=self._model,
                contents=contents,
                config=types.GenerateContentConfig(system_instruction=system_prompt),
            )
            return response.text
        except Exception as exc:
            logger.error("GeminiProvider.generate_response error: %s", exc)
            raise

    def extract_json(self, prompt: str) -> str:
        if not self._api_key:
            return "{}"
        try:
            client = self._get_client()
            response = client.models.generate_content(
                model=self._model,
                contents=prompt,
            )
            return response.text.strip()
        except Exception as exc:
            logger.error("GeminiProvider.extract_json error: %s", exc)
            raise
