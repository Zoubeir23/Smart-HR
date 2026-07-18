"""Tests de la pièce jointe du chat IA : un fichier PDF/TXT/MD joint à la
question est lu et son contenu est fourni au LLM comme contexte."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from smart_hr.ai.models import ChatHistory
from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db

CHAT_URL = "/api/v1/ai/chat/"


class _RecordingChatProvider:
    """Capture la question réellement envoyée au LLM pour vérifier
    que le contenu du fichier joint y a bien été injecté."""

    def __init__(self):
        self.last_question = ""

    def generate_response(self, system_prompt, history, question):
        self.last_question = question
        return "Voici l'offre d'emploi générée à partir de votre fiche de poste."

    def detect_action(self, system_prompt, question, tools):
        return None, {}


@pytest.fixture
def rh_user(db) -> User:
    return UserFactory.create(role=User.Role.RH)


def _authenticated_client(as_user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=as_user)
    return client


def _fiche_de_poste_file(name: str = "fiche_poste.txt") -> SimpleUploadedFile:
    content = "Poste : Développeur Django senior. Missions : APIs REST, tests, CI/CD."
    return SimpleUploadedFile(name, content.encode("utf-8"), content_type="text/plain")


class TestChatFileAttachment:
    def test_file_content_is_injected_into_llm_prompt(self, rh_user):
        provider = _RecordingChatProvider()
        client = _authenticated_client(rh_user)
        with patch("smart_hr.ai.views.chat.get_llm_provider", return_value=provider):
            response = client.post(
                CHAT_URL,
                {"question": "Crée une offre d'emploi à partir de ce fichier", "file": _fiche_de_poste_file()},
                format="multipart",
            )

        assert response.status_code == status.HTTP_201_CREATED
        assert "Développeur Django senior" in provider.last_question
        assert "fiche_poste.txt" in provider.last_question

    def test_stored_question_keeps_marker_not_full_content(self, rh_user):
        client = _authenticated_client(rh_user)
        with patch("smart_hr.ai.views.chat.get_llm_provider", return_value=_RecordingChatProvider()):
            client.post(
                CHAT_URL,
                {"question": "Analyse cette fiche", "file": _fiche_de_poste_file()},
                format="multipart",
            )

        chat = ChatHistory.objects.get(user=rh_user)
        assert "📎 fiche_poste.txt" in chat.question
        assert "Développeur Django senior" not in chat.question

    def test_file_without_question_uses_default_question(self, rh_user):
        client = _authenticated_client(rh_user)
        with patch("smart_hr.ai.views.chat.get_llm_provider", return_value=_RecordingChatProvider()):
            response = client.post(
                CHAT_URL,
                {"file": _fiche_de_poste_file()},
                format="multipart",
            )

        assert response.status_code == status.HTTP_201_CREATED
        assert "Analyse le document joint" in ChatHistory.objects.get(user=rh_user).question

    def test_unsupported_extension_is_rejected(self, rh_user):
        client = _authenticated_client(rh_user)
        bad_file = SimpleUploadedFile("virus.exe", b"binaire", content_type="application/octet-stream")
        response = client.post(
            CHAT_URL,
            {"question": "Lis ce fichier", "file": bad_file},
            format="multipart",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "non supportée" in response.data["detail"]
        assert not ChatHistory.objects.filter(user=rh_user).exists()

    def test_unreadable_file_is_rejected_with_explicit_error(self, rh_user):
        client = _authenticated_client(rh_user)
        empty_file = SimpleUploadedFile("vide.txt", b"", content_type="text/plain")
        response = client.post(
            CHAT_URL,
            {"question": "Lis ce fichier", "file": empty_file},
            format="multipart",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Impossible de lire" in response.data["detail"]

    def test_question_without_file_still_works(self, rh_user):
        client = _authenticated_client(rh_user)
        with patch("smart_hr.ai.views.chat.get_llm_provider", return_value=_RecordingChatProvider()):
            response = client.post(CHAT_URL, {"question": "Bonjour"}, format="json")

        assert response.status_code == status.HTTP_201_CREATED
