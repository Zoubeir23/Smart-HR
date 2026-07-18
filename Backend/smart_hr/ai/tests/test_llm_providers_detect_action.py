"""Tests du function-calling natif (`BaseLLMProvider.detect_action`) pour les
4 fournisseurs LLM — chacun adapte le même schéma neutre {"name", "description",
"parameters"} à son SDK, mais tous doivent retourner (nom, arguments) ou (None, {})
sans jamais lever d'exception (dégradation gracieuse vers la réponse chat normale)."""

from __future__ import annotations

from unittest.mock import MagicMock
from unittest.mock import patch

from smart_hr.ai.llm_providers.anthropic_provider import AnthropicProvider
from smart_hr.ai.llm_providers.gemini_provider import GeminiProvider
from smart_hr.ai.llm_providers.grok_provider import GrokProvider
from smart_hr.ai.llm_providers.openai_provider import OpenAIProvider

_SAMPLE_TOOLS = [
    {
        "name": "leave_request",
        "description": "Poser un congé",
        "parameters": {
            "type": "object",
            "properties": {"start_date": {"type": "string"}, "end_date": {"type": "string"}},
            "required": ["start_date", "end_date"],
        },
    }
]


class TestGeminiDetectAction:
    def test_no_api_key_returns_none(self, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
        provider = GeminiProvider()
        assert provider.detect_action("system", "question", _SAMPLE_TOOLS) == (None, {})

    def test_empty_tools_returns_none(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
        provider = GeminiProvider()
        assert provider.detect_action("system", "question", []) == (None, {})

    def test_function_call_returns_name_and_args(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
        provider = GeminiProvider()

        fake_call = MagicMock(name="leave_request")
        fake_call.name = "leave_request"
        fake_call.args = {"start_date": "2026-08-12", "end_date": "2026-08-15"}
        fake_response = MagicMock(function_calls=[fake_call])

        fake_client = MagicMock()
        fake_client.models.generate_content.return_value = fake_response

        with patch.object(GeminiProvider, "_get_client", return_value=fake_client):
            action_intent, params = provider.detect_action("system", "Pose un congé du 12 au 15 août", _SAMPLE_TOOLS)

        assert action_intent == "leave_request"
        assert params == {"start_date": "2026-08-12", "end_date": "2026-08-15"}

    def test_no_function_call_returns_none(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
        provider = GeminiProvider()
        fake_response = MagicMock(function_calls=[])
        fake_client = MagicMock()
        fake_client.models.generate_content.return_value = fake_response

        with patch.object(GeminiProvider, "_get_client", return_value=fake_client):
            assert provider.detect_action("system", "Bonjour", _SAMPLE_TOOLS) == (None, {})

    def test_sdk_error_returns_none_gracefully(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "fake-key")
        provider = GeminiProvider()
        with patch.object(GeminiProvider, "_get_client", side_effect=RuntimeError("boom")):
            assert provider.detect_action("system", "question", _SAMPLE_TOOLS) == (None, {})


class TestOpenAIDetectAction:
    def test_no_api_key_returns_none(self, monkeypatch):
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        provider = OpenAIProvider()
        assert provider.detect_action("system", "question", _SAMPLE_TOOLS) == (None, {})

    def test_tool_call_returns_name_and_args(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "fake-key")
        provider = OpenAIProvider()

        fake_tool_call = MagicMock()
        fake_tool_call.function.name = "leave_request"
        fake_tool_call.function.arguments = '{"start_date": "2026-08-12", "end_date": "2026-08-15"}'
        fake_message = MagicMock(tool_calls=[fake_tool_call])
        fake_response = MagicMock(choices=[MagicMock(message=fake_message)])

        fake_client = MagicMock()
        fake_client.chat.completions.create.return_value = fake_response

        with patch.object(OpenAIProvider, "_get_client", return_value=fake_client):
            action_intent, params = provider.detect_action("system", "Pose un congé du 12 au 15 août", _SAMPLE_TOOLS)

        assert action_intent == "leave_request"
        assert params == {"start_date": "2026-08-12", "end_date": "2026-08-15"}

    def test_no_tool_call_returns_none(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "fake-key")
        provider = OpenAIProvider()
        fake_message = MagicMock(tool_calls=None)
        fake_response = MagicMock(choices=[MagicMock(message=fake_message)])
        fake_client = MagicMock()
        fake_client.chat.completions.create.return_value = fake_response

        with patch.object(OpenAIProvider, "_get_client", return_value=fake_client):
            assert provider.detect_action("system", "Bonjour", _SAMPLE_TOOLS) == (None, {})

    def test_sdk_error_returns_none_gracefully(self, monkeypatch):
        monkeypatch.setenv("OPENAI_API_KEY", "fake-key")
        provider = OpenAIProvider()
        with patch.object(OpenAIProvider, "_get_client", side_effect=RuntimeError("boom")):
            assert provider.detect_action("system", "question", _SAMPLE_TOOLS) == (None, {})


class TestGrokDetectAction:
    def test_no_api_key_returns_none(self, monkeypatch):
        monkeypatch.delenv("GROK_API_KEY", raising=False)
        provider = GrokProvider()
        assert provider.detect_action("system", "question", _SAMPLE_TOOLS) == (None, {})

    def test_tool_call_returns_name_and_args(self, monkeypatch):
        monkeypatch.setenv("GROK_API_KEY", "fake-key")
        provider = GrokProvider()

        fake_tool_call = MagicMock()
        fake_tool_call.function.name = "leave_request"
        fake_tool_call.function.arguments = '{"start_date": "2026-08-12", "end_date": "2026-08-15"}'
        fake_message = MagicMock(tool_calls=[fake_tool_call])
        fake_response = MagicMock(choices=[MagicMock(message=fake_message)])

        fake_client = MagicMock()
        fake_client.chat.completions.create.return_value = fake_response

        with patch.object(GrokProvider, "_get_client", return_value=fake_client):
            action_intent, params = provider.detect_action("system", "Pose un congé du 12 au 15 août", _SAMPLE_TOOLS)

        assert action_intent == "leave_request"
        assert params == {"start_date": "2026-08-12", "end_date": "2026-08-15"}


class TestAnthropicDetectAction:
    def test_no_api_key_returns_none(self, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        provider = AnthropicProvider()
        assert provider.detect_action("system", "question", _SAMPLE_TOOLS) == (None, {})

    def test_tool_use_block_returns_name_and_args(self, monkeypatch):
        monkeypatch.setenv("ANTHROPIC_API_KEY", "fake-key")
        provider = AnthropicProvider()

        fake_block = MagicMock()
        fake_block.type = "tool_use"
        fake_block.name = "leave_request"
        fake_block.input = {"start_date": "2026-08-12", "end_date": "2026-08-15"}
        fake_response = MagicMock(content=[fake_block])

        fake_client = MagicMock()
        fake_client.messages.create.return_value = fake_response

        with patch.object(AnthropicProvider, "_get_client", return_value=fake_client):
            action_intent, params = provider.detect_action("system", "Pose un congé du 12 au 15 août", _SAMPLE_TOOLS)

        assert action_intent == "leave_request"
        assert params == {"start_date": "2026-08-12", "end_date": "2026-08-15"}

    def test_no_tool_use_block_returns_none(self, monkeypatch):
        monkeypatch.setenv("ANTHROPIC_API_KEY", "fake-key")
        provider = AnthropicProvider()
        fake_block = MagicMock()
        fake_block.type = "text"
        fake_response = MagicMock(content=[fake_block])
        fake_client = MagicMock()
        fake_client.messages.create.return_value = fake_response

        with patch.object(AnthropicProvider, "_get_client", return_value=fake_client):
            assert provider.detect_action("system", "Bonjour", _SAMPLE_TOOLS) == (None, {})

    def test_sdk_error_returns_none_gracefully(self, monkeypatch):
        monkeypatch.setenv("ANTHROPIC_API_KEY", "fake-key")
        provider = AnthropicProvider()
        with patch.object(AnthropicProvider, "_get_client", side_effect=RuntimeError("boom")):
            assert provider.detect_action("system", "question", _SAMPLE_TOOLS) == (None, {})
