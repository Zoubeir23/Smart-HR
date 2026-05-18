"""
Moteur d'actions métier du chatbot Smart-HR.

Flux :
  1. detect_action_intent()   — détecte si le message contient une intention d'action
  2. extract_action_parameters() — extrait les paramètres via Gemini (dates, type, etc.)
  3. execute_action()         — exécute l'action Django (crée le congé, etc.)
  4. Retourne un dict structuré {success, type, label, data} pour la réponse API
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import date

logger = logging.getLogger(__name__)

# ─── Intents supportés ───────────────────────────────────────────────────────

_LEAVE_INTENT_KEYWORDS = (
    "congé", "conge", "vacances", "absent", "absence",
    "malade", "maladie", "arrêt maladie", "repos", "arret",
    "poser un congé", "demande de congé", "je veux prendre",
    "jour de repos", "partir en vacances", "jours de vacances",
    "congé maternité", "congé personnel", "congé annuel",
)


def detect_action_intent(question: str) -> str | None:
    """
    Détecte l'intention d'action dans la question de l'utilisateur.
    Retourne le nom de l'action si détectée, None sinon.

    Actions supportées : 'leave_request'
    """
    lower = question.lower()
    if any(kw in lower for kw in _LEAVE_INTENT_KEYWORDS):
        return "leave_request"
    return None


# ─── Extraction de paramètres via Gemini ─────────────────────────────────────

def extract_leave_parameters(question: str) -> dict:
    """
    Extrait les paramètres de congé depuis le message via Gemini.
    Fallback sur regex si l'API est indisponible.

    Retourne :
        {
            "leave_type": "vacation|sick|personal|maternity|other",
            "start_date": "YYYY-MM-DD" ou None,
            "end_date":   "YYYY-MM-DD" ou None,
            "reason":     str,
        }
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    today = date.today().isoformat()

    prompt = (
        f"Aujourd'hui nous sommes le {today}.\n"
        "Analyse ce message et extrait les informations de demande de congé.\n"
        "Retourne UNIQUEMENT un JSON valide, sans markdown ni backticks.\n\n"
        f'Message : "{question}"\n\n'
        "JSON attendu :\n"
        "{\n"
        '  "leave_type": "vacation|sick|personal|maternity|other",\n'
        '  "start_date": "YYYY-MM-DD ou null",\n'
        '  "end_date": "YYYY-MM-DD ou null",\n'
        '  "reason": "raison extraite ou vide"\n'
        "}\n\n"
        "Règles :\n"
        "- Si 'demain' → start_date = demain, end_date = demain\n"
        "- Si 'semaine prochaine' → start_date = lundi prochain, end_date = vendredi prochain\n"
        "- Si les dates ne sont pas précisées → null\n"
        "- leave_type 'sick' si maladie/malade/médical, 'personal' si personnel/famille, sinon 'vacation'"
    )

    if api_key:
        try:
            from google import genai

            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=os.environ.get("GEMINI_MODEL", "gemini-2.0-flash"),
                contents=prompt,
            )
            raw = response.text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()
            return json.loads(raw)
        except Exception as exc:
            logger.warning("Extraction Gemini des paramètres congé échouée : %s", exc)

    return _regex_extract_leave_parameters(question)


def _regex_extract_leave_parameters(question: str) -> dict:
    """Extraction de dates par regex — fallback si Gemini indisponible."""
    result: dict = {
        "leave_type": "vacation",
        "start_date": None,
        "end_date": None,
        "reason": "",
    }

    date_pattern = r"\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})\b"
    dates_found = re.findall(date_pattern, question)
    if dates_found:
        try:
            day, month, year = dates_found[0]
            result["start_date"] = f"{year}-{int(month):02d}-{int(day):02d}"
        except ValueError:
            pass
    if len(dates_found) >= 2:
        try:
            day, month, year = dates_found[1]
            result["end_date"] = f"{year}-{int(month):02d}-{int(day):02d}"
        except ValueError:
            pass

    lower = question.lower()
    if any(w in lower for w in ("malade", "maladie", "arrêt", "médical", "médecin")):
        result["leave_type"] = "sick"
    elif any(w in lower for w in ("personnel", "familial", "famille", "personnel")):
        result["leave_type"] = "personal"
    elif any(w in lower for w in ("maternité",)):
        result["leave_type"] = "maternity"

    return result


# ─── Exécution d'actions ─────────────────────────────────────────────────────

def execute_action(action_intent: str, user, params: dict) -> dict:
    """
    Dispatche et exécute l'action détectée.
    Retourne un dict {success, type, label, data} ou {success, error}.
    """
    if action_intent == "leave_request":
        return _execute_leave_request(user, params)
    return {"success": False, "error": f"Action '{action_intent}' non supportée."}


def _execute_leave_request(user, params: dict) -> dict:
    """Crée une demande de congé via Django ORM."""
    from smart_hr.conge.models import LeaveRequest
    from smart_hr.personnel.models import Employee

    try:
        employee = Employee.objects.get(user=user)
    except Employee.DoesNotExist:
        return {
            "success": False,
            "error": "Aucun profil employé trouvé pour votre compte. Contactez le service RH.",
        }

    start_date_str = params.get("start_date")
    end_date_str = params.get("end_date")

    if not start_date_str or not end_date_str:
        return {"success": False, "error": "dates_missing"}

    try:
        start = date.fromisoformat(start_date_str)
        end = date.fromisoformat(end_date_str)
    except ValueError:
        return {"success": False, "error": "Format de date invalide. Utilisez JJ/MM/AAAA."}

    if end < start:
        return {"success": False, "error": "La date de fin est antérieure à la date de début."}

    if start < date.today():
        return {"success": False, "error": "La date de début est dans le passé."}

    overlap_exists = LeaveRequest.objects.filter(
        employee=employee,
        status__in=[LeaveRequest.Status.PENDING, LeaveRequest.Status.APPROVED],
        start_date__lte=end,
        end_date__gte=start,
    ).exists()
    if overlap_exists:
        return {
            "success": False,
            "error": "Une demande de congé active existe déjà pour cette période.",
        }

    try:
        leave = LeaveRequest.objects.create(
            employee=employee,
            leave_type=params.get("leave_type", LeaveRequest.LeaveType.VACATION),
            start_date=start,
            end_date=end,
            reason=params.get("reason") or "Demande créée via l'assistant IA Smart-HR",
        )

        return {
            "success": True,
            "type": "leave_created",
            "label": "Demande de congé créée",
            "data": {
                "leave_id": leave.pk,
                "leave_type": leave.get_leave_type_display(),
                "start_date": leave.start_date.strftime("%d/%m/%Y"),
                "end_date": leave.end_date.strftime("%d/%m/%Y"),
                "duration_days": leave.duration_days,
                "status": leave.get_status_display(),
            },
        }

    except Exception as exc:
        logger.exception("Erreur création congé via chatbot pour %s : %s", user.email, exc)
        return {"success": False, "error": "Erreur interne. Veuillez réessayer."}
