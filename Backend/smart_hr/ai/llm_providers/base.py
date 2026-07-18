from __future__ import annotations

import re
from abc import ABC
from abc import abstractmethod

_CODE_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)


def strip_llm_code_fences(raw: str) -> str:
    """Extrait le contenu d'un bloc markdown ```json...``` retourné par un LLM.

    Gère les variantes : ```json, ```, et le JSON brut sans balises.
    """
    raw = raw.strip()
    match = _CODE_FENCE_RE.search(raw)
    if match:
        return match.group(1).strip()
    return raw


class BaseLLMProvider(ABC):
    """
    Interface commune pour tous les fournisseurs LLM de Smart-HR.

    Chaque implémentation doit gérer son propre SDK et formater
    l'historique de conversation dans le format attendu par son API.
    """

    @abstractmethod
    def generate_response(
        self,
        system_prompt: str,
        history: list[dict],
        question: str,
    ) -> str:
        """
        Génère une réponse textuelle.

        Args:
            system_prompt: Instructions système (rôle, contexte utilisateur).
            history: Liste de dicts {"role": "user"|"assistant", "content": str}.
            question: Message courant de l'utilisateur.

        Returns:
            Réponse texte du modèle.
        """

    @abstractmethod
    def extract_json(self, prompt: str) -> str:
        """
        Envoie un prompt simple et retourne la réponse brute (attendue en JSON).
        Utilisé par actions.py pour l'extraction de paramètres.

        Args:
            prompt: Prompt complet incluant les instructions de format JSON.

        Returns:
            Chaîne JSON brute retournée par le modèle.
        """

    @abstractmethod
    def detect_action(
        self,
        system_prompt: str,
        question: str,
        tools: list[dict],
    ) -> tuple[str | None, dict]:
        """
        Détecte si la question de l'utilisateur correspond à l'appel d'un des
        `tools` fournis (function-calling natif du fournisseur) et en extrait
        les arguments — en un seul appel structuré, sans détection par mots-clés
        ni prompt d'extraction JSON séparé par action.

        Args:
            system_prompt: contexte utilisateur (nom, rôle) pour guider la décision.
            question: message courant de l'utilisateur.
            tools: liste de schémas {"name", "description", "parameters"} — le
                dict "parameters" suit le format JSON Schema standard.

        Returns:
            (nom_de_l_action, arguments) si un tool a été appelé, sinon (None, {}).
            Ne lève jamais d'exception : un échec (API indisponible, réponse
            invalide) retourne (None, {}) pour ne pas casser la réponse chat
            normale qui suit.
        """
