"""
Extraction de texte brut depuis un fichier de fiche de poste uploadé
(PDF, TXT, MD) — utilisé par l'agent de génération d'offre d'emploi
(`JobOfferViewSet.generate`) pour laisser le recruteur joindre un document
plutôt que de recopier manuellement son contenu.
"""

from __future__ import annotations

import logging

from smart_hr.recruitment.services.cv_analysis_service import extract_text_from_pdf

logger = logging.getLogger(__name__)

SUPPORTED_DOCUMENT_EXTENSIONS = frozenset({".pdf", ".txt", ".md"})
_TEXT_EXTENSIONS = (".txt", ".md")


def extract_text_from_uploaded_document(uploaded_file) -> str:
    """Extrait le texte brut d'un fichier PDF/TXT/MD uploadé.

    Retourne une chaîne vide (avec un log d'avertissement) si l'extension
    n'est pas supportée ou si la lecture échoue — l'appelant décide comment
    réagir à un contenu vide plutôt que de faire planter la requête."""
    name = (getattr(uploaded_file, "name", "") or "").lower()

    if name.endswith(".pdf"):
        return extract_text_from_pdf(uploaded_file)

    if name.endswith(_TEXT_EXTENSIONS):
        try:
            uploaded_file.seek(0)
            raw_bytes = uploaded_file.read()
            return raw_bytes.decode("utf-8", errors="ignore").strip()
        except Exception as exc:
            logger.warning("Impossible de lire le fichier texte '%s' : %s", name, exc)
            return ""
        finally:
            try:
                uploaded_file.seek(0)
            except Exception:
                pass

    logger.warning("Extension de fichier non supportée pour la génération d'offre : %s", name)
    return ""
