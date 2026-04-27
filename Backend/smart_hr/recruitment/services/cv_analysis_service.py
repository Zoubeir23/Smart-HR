"""
Service d'analyse de CV par IA (NLP).

Extrait le texte du PDF, puis appelle Google Gemini pour :
- identifier les compétences du candidat
- calculer un score de matching avec l'offre d'emploi
- générer un résumé de la candidature
"""

from __future__ import annotations

import io
import json
import logging
import os
from typing import TypedDict

logger = logging.getLogger(__name__)


class CVAnalysisResult(TypedDict):
    skills_extracted: list[str]
    matching_score: float
    ai_summary: str


def extract_text_from_pdf(file_field) -> str:
    """Extrait le texte brut d'un FileField PDF via PyPDF2."""
    try:
        import PyPDF2

        file_field.seek(0)
        reader = PyPDF2.PdfReader(io.BytesIO(file_field.read()))
        pages_text = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages_text).strip()
    except Exception as exc:
        logger.warning("Impossible d'extraire le texte du PDF : %s", exc)
        return ""
    finally:
        try:
            file_field.seek(0)
        except Exception:
            pass


def analyze_cv_against_job_offer(
    cv_text: str,
    cover_letter: str,
    job_title: str,
    job_requirements: str,
    job_description: str,
) -> CVAnalysisResult:
    """
    Analyse un CV par rapport à une offre d'emploi via Gemini.

    Retourne CVAnalysisResult avec skills_extracted, matching_score (0-100), ai_summary.
    En cas d'erreur ou d'API absente, retourne des valeurs par défaut neutres.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

    if not api_key:
        logger.warning("GEMINI_API_KEY absent — analyse CV désactivée.")
        return _default_result()

    candidate_content = f"CV :\n{cv_text}\n\nLettre de motivation :\n{cover_letter}"

    intro = (
        "Tu es un expert RH en analyse de CV. Analyse ce candidat pour le poste suivant "
        "et retourne UNIQUEMENT un JSON valide, sans texte avant ou après."
    )
    prompt = f"""{intro}

OFFRE D'EMPLOI :
Titre : {job_title}
Description : {job_description}
Prérequis : {job_requirements}

CANDIDATURE :
{candidate_content[:3000]}

Retourne ce JSON exact (sans markdown, sans backticks) :
{{
  "skills_extracted": ["liste", "des", "compétences", "identifiées"],
  "matching_score": 75.5,
  "ai_summary": "Résumé professionnel de la candidature en 2-3 phrases."
}}

- matching_score : nombre décimal entre 0 et 100 représentant l'adéquation candidat/poste
- skills_extracted : maximum 10 compétences techniques et soft skills détectées
- ai_summary : synthèse concise en français"""

    try:
        from google import genai

        gemini_model_name = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=gemini_model_name,
            contents=prompt,
        )
        raw_text = response.text.strip()

        # Nettoyer les balises markdown si présentes
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        parsed = json.loads(raw_text)

        return CVAnalysisResult(
            skills_extracted=parsed.get("skills_extracted", []),
            matching_score=float(parsed.get("matching_score", 50.0)),
            ai_summary=parsed.get("ai_summary", ""),
        )

    except json.JSONDecodeError as exc:
        logger.error("JSON invalide reçu de Gemini pour l'analyse CV : %s", exc)
        return _default_result()
    except Exception as exc:
        logger.error("Erreur lors de l'analyse CV par Gemini : %s", exc)
        return _default_result()


def _default_result() -> CVAnalysisResult:
    return CVAnalysisResult(
        skills_extracted=[],
        matching_score=0.0,
        ai_summary="",
    )
