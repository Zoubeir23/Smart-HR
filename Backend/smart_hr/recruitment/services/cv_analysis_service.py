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


def generate_interview_questions_from_cv(
    cv_text: str,
    skills_extracted: list,
    ai_summary: str,
    job_title: str,
    job_description: str,
    job_requirements: str,
    duration: str = "30 Min",
    interview_type: str = "Technique",
    questions_count: int = 8,
) -> list[dict]:
    """
    Génère des questions d'entretien personnalisées basées sur le CV du candidat et l'offre.

    Utilise Google Gemini pour créer des questions ciblées combinant le profil du candidat
    (compétences extraites, résumé IA) et les exigences du poste.

    Retourne une liste de dicts : [{"question": "...", "type": "Technique|Comportemental|..."}]
    En cas d'erreur, retourne des questions génériques basées sur le poste.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

    if not api_key:
        logger.warning("GEMINI_API_KEY absent — génération de questions désactivée, questions génériques utilisées.")
        return _default_interview_questions(job_title, interview_type, questions_count)

    skills_text = ", ".join(skills_extracted) if skills_extracted else "Non renseignées"

    prompt = f"""Tu es un expert RH spécialisé en conduite d'entretiens. Génère exactement {questions_count} questions d'entretien PERSONNALISÉES pour ce candidat.

POSTE VISÉ :
Titre : {job_title}
Description : {job_description[:1000]}
Prérequis : {job_requirements[:500]}

PROFIL DU CANDIDAT :
CV (extrait) : {cv_text[:3000]}
Compétences identifiées : {skills_text}
Résumé IA : {ai_summary}

PARAMÈTRES :
Durée de l'entretien : {duration}
Type d'entretien : {interview_type}

INSTRUCTIONS :
- Les questions doivent être SPÉCIFIQUES au profil du candidat (mentionner ses compétences, son parcours)
- Varie les types : Technique, Comportemental, Expérience, Motivation, Mise en situation
- Adapte la difficulté au profil et au poste
- Questions ouvertes, formulées en français

Retourne UNIQUEMENT ce JSON exact (sans markdown, sans backticks) :
{{"interviewQuestions": [{{"question": "...", "type": "Technique"}}]}}"""

    try:
        from google import genai

        gemini_model_name = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=gemini_model_name,
            contents=prompt,
        )
        raw_text = response.text.strip()

        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        parsed = json.loads(raw_text)
        questions = parsed.get("interviewQuestions", [])

        if not isinstance(questions, list) or not questions:
            logger.warning("Gemini a retourné une liste vide de questions, utilisation des questions génériques.")
            return _default_interview_questions(job_title, interview_type, questions_count)

        return questions

    except json.JSONDecodeError as exc:
        logger.error("JSON invalide reçu de Gemini pour la génération de questions : %s", exc)
        return _default_interview_questions(job_title, interview_type, questions_count)
    except Exception as exc:
        logger.exception("Erreur lors de la génération de questions d'entretien via Gemini : %s", exc)
        return _default_interview_questions(job_title, interview_type, questions_count)


def _default_interview_questions(
    job_title: str,
    interview_type: str,
    questions_count: int,
) -> list[dict]:
    """Retourne des questions génériques de secours basées sur le titre du poste."""
    generic_questions = [
        {"question": f"Pouvez-vous vous présenter et expliquer pourquoi vous postulez au poste de {job_title} ?", "type": "Motivation"},
        {"question": "Quelles sont vos principales compétences techniques en lien avec ce poste ?", "type": "Technique"},
        {"question": "Décrivez un projet dont vous êtes particulièrement fier. Quel était votre rôle ?", "type": "Expérience"},
        {"question": "Comment gérez-vous les situations de stress ou les délais serrés ?", "type": "Comportemental"},
        {"question": "Donnez un exemple de problème complexe que vous avez résolu. Quelle était votre approche ?", "type": "Mise en situation"},
        {"question": "Comment vous tenez-vous informé des dernières évolutions de votre domaine ?", "type": "Motivation"},
        {"question": "Décrivez votre façon de travailler en équipe. Avez-vous déjà géré un conflit avec un collègue ?", "type": "Comportemental"},
        {"question": f"Où vous voyez-vous dans 3 ans ? Comment ce poste de {job_title} s'inscrit-il dans votre projet professionnel ?", "type": "Motivation"},
        {"question": "Quelles sont selon vous vos principales forces et axes d'amélioration ?", "type": "Comportemental"},
        {"question": "Avez-vous des questions sur le poste ou sur l'entreprise ?", "type": "Motivation"},
    ]
    return generic_questions[:questions_count]


def _default_result() -> CVAnalysisResult:
    return CVAnalysisResult(
        skills_extracted=[],
        matching_score=0.0,
        ai_summary="",
    )
