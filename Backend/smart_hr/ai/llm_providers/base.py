from __future__ import annotations

from abc import ABC
from abc import abstractmethod


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
