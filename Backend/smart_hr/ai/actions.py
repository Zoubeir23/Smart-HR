"""
Moteur d'actions métier du chatbot Smart-HR.

Flux :
  1. detect_action_intent()      — détecte si le message contient une intention d'action
  2. extract_leave_parameters()  — extrait les paramètres via le LLM actif (dates, type, etc.)
  3. execute_action()            — exécute l'action Django (crée le congé, etc.)
  4. Retourne un dict structuré {success, type, label, data} pour la réponse API
"""

from __future__ import annotations

import json
import logging
import re
from datetime import date

logger = logging.getLogger(__name__)

# ─── Intents supportés ───────────────────────────────────────────────────────

_LEAVE_INTENT_KEYWORDS = (
    "congé",
    "conge",
    "vacances",
    "absent",
    "absence",
    "malade",
    "maladie",
    "arrêt maladie",
    "repos",
    "arret",
    "poser un congé",
    "demande de congé",
    "je veux prendre",
    "jour de repos",
    "partir en vacances",
    "jours de vacances",
    "congé maternité",
    "congé personnel",
    "congé annuel",
)


_LEAVE_APPROVAL_KEYWORDS = (
    "valider le congé",
    "valide le congé",
    "valider la demande de congé",
    "valide la demande de congé",
    "approuver le congé",
    "approuve le congé",
    "approuver la demande de congé",
    "approuve la demande de congé",
    "refuser le congé",
    "refuse le congé",
    "refuser la demande de congé",
    "refuse la demande de congé",
    "rejeter le congé",
    "rejette le congé",
    "rejeter la demande de congé",
    "rejette la demande de congé",
)


_OBJECTIVE_INTENT_KEYWORDS = (
    "objectif",
    "okr",
    "résultat clé",
    "resultat cle",
    "key result",
    "objectif stratégique",
    "objectif d'entreprise",
    "objectif de département",
)

_ONBOARDING_INTENT_KEYWORDS = (
    "onboarding",
    "programme d'intégration",
    "parcours d'intégration",
    "intégration du nouvel employé",
    "intégration de la nouvelle",
    "intégrer un nouvel employé",
    "intégrer une nouvelle recrue",
    "programme d'accueil",
    "parcours d'accueil",
    "offboarding",
    "programme de départ",
    "nouvel employé",
    "nouvelle recrue",
)


def detect_action_intent(question: str) -> str | None:
    """
    Détecte l'intention d'action dans la question de l'utilisateur.
    Retourne le nom de l'action si détectée, None sinon.

    Actions supportées : 'leave_request', 'leave_approval', 'objective_creation',
    'onboarding_creation'

    `leave_approval` (RH valide/refuse la demande d'un tiers) est vérifié avant
    `leave_request` (un employé pose son propre congé) car les deux formulations
    contiennent toutes deux le mot "congé" — la plus spécifique doit gagner.
    """
    lower = question.lower()
    if any(kw in lower for kw in _LEAVE_APPROVAL_KEYWORDS):
        return "leave_approval"
    if any(kw in lower for kw in _LEAVE_INTENT_KEYWORDS):
        return "leave_request"
    if any(kw in lower for kw in _OBJECTIVE_INTENT_KEYWORDS):
        return "objective_creation"
    if any(kw in lower for kw in _ONBOARDING_INTENT_KEYWORDS):
        return "onboarding_creation"
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

    try:
        from smart_hr.ai.llm_providers import get_llm_provider
        from smart_hr.ai.llm_providers.base import strip_llm_code_fences

        provider = get_llm_provider()
        raw = strip_llm_code_fences(provider.extract_json(prompt))
        return json.loads(raw)
    except Exception as exc:
        logger.warning("Extraction LLM des paramètres congé échouée : %s", exc)

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


# ─── Agent Dashboard — validation/refus de congé via Gemini ─────────────────


def extract_leave_approval_parameters(question: str) -> dict:
    """
    Extrait de quel employé et de quelle décision (approve/reject) il s'agit
    pour une validation/refus de congé demandée via le chat.

    Retourne : {"employee_name": str | None, "decision": "approve|reject|None"}
    """
    prompt = (
        "Analyse ce message d'un responsable RH qui souhaite valider ou refuser "
        "une demande de congé d'un employé.\n"
        "Retourne UNIQUEMENT un JSON valide, sans markdown ni backticks.\n\n"
        f'Message : "{question}"\n\n'
        "JSON attendu :\n"
        "{\n"
        '  "employee_name": "prénom et nom complets de l\'employé mentionné, ou null",\n'
        '  "decision": "approve" si le RH valide/approuve, "reject" si le RH refuse/rejette, sinon null\n'
        "}\n"
    )

    try:
        from smart_hr.ai.llm_providers import get_llm_provider
        from smart_hr.ai.llm_providers.base import strip_llm_code_fences

        provider = get_llm_provider()
        raw = strip_llm_code_fences(provider.extract_json(prompt))
        parsed = json.loads(raw)
    except Exception as exc:
        logger.warning("Extraction LLM de la décision de congé échouée : %s", exc)
        parsed = {"employee_name": None, "decision": None}

    if parsed.get("decision") not in ("approve", "reject"):
        parsed["decision"] = None
    return parsed


# ─── Agent OKR/Objectifs — extraction de paramètres via Gemini ──────────────


def extract_objective_parameters(question: str, can_manage: bool) -> dict:
    """
    Extrait les paramètres d'un objectif OKR depuis le message via le LLM actif.

    `can_manage` (RH/Admin) autorise les niveaux department/company ; un simple
    employé est toujours ramené au niveau individual, quoi que le LLM retourne
    (garde-fou serveur, ne dépend jamais uniquement de l'extraction IA).

    Retourne :
        {
            "level": "individual|department|company",
            "department_name": str | None,
            "title": str | None,
            "period": str | None,
            "key_results": [{"title": str, "unit": str, "target_value": float}],
        }
    """
    allowed_levels = "individual, department ou company" if can_manage else "individual uniquement"

    prompt = (
        "Analyse ce message d'un utilisateur RH/employé qui souhaite créer un objectif OKR.\n"
        "Retourne UNIQUEMENT un JSON valide, sans markdown ni backticks.\n\n"
        f'Message : "{question}"\n\n'
        "JSON attendu :\n"
        "{\n"
        f'  "level": "{allowed_levels}",\n'
        '  "department_name": "nom du département mentionné, ou null",\n'
        '  "title": "titre de l\'objectif, ou null si non déterminable",\n'
        '  "period": "période mentionnée (ex: Q1 2026), ou null",\n'
        '  "key_results": [{"title": "résultat clé", "unit": "unité ou chaîne vide", "target_value": nombre}]\n'
        "}\n\n"
        "- key_results : liste vide si aucun résultat clé mesurable n'est mentionné\n"
        "- Ne déduis jamais de valeurs par défaut : si une information est absente, utilise null"
    )

    try:
        from smart_hr.ai.llm_providers import get_llm_provider
        from smart_hr.ai.llm_providers.base import strip_llm_code_fences

        provider = get_llm_provider()
        raw = strip_llm_code_fences(provider.extract_json(prompt))
        parsed = json.loads(raw)
    except Exception as exc:
        logger.warning("Extraction LLM des paramètres objectif échouée : %s", exc)
        parsed = {"level": "individual", "department_name": None, "title": None, "period": None, "key_results": []}

    if not can_manage or parsed.get("level") not in ("individual", "department", "company"):
        parsed["level"] = "individual"

    parsed.setdefault("key_results", [])
    return parsed


# ─── Agent Onboarding — génération du programme via Gemini ──────────────────


def extract_onboarding_parameters(question: str) -> dict:
    """
    Génère un programme d'intégration (ou de départ) structuré depuis le message
    via le LLM actif : contrairement à l'extraction d'objectif (champs fixes),
    ici le LLM **génère le contenu** des étapes à partir du contexte du poste
    (comme la génération d'offre d'emploi existante), pas seulement des champs.

    Retourne :
        {
            "employee_name": str | None,
            "program_type": "onboarding|offboarding",
            "title": str | None,
            "steps": [{"title": str, "description": str}],
        }
    """
    prompt = (
        "Analyse ce message d'un responsable RH qui souhaite créer un programme "
        "d'intégration (onboarding) ou de départ (offboarding) structuré pour un employé.\n"
        "Retourne UNIQUEMENT un JSON valide, sans markdown ni backticks.\n\n"
        f'Message : "{question}"\n\n'
        "JSON attendu :\n"
        "{\n"
        '  "employee_name": "prénom et nom complets de l\'employé mentionné, ou null",\n'
        '  "program_type": "onboarding" ou "offboarding" (onboarding par défaut si ambigu),\n'
        '  "title": "titre du programme, ou null si non déterminable",\n'
        '  "steps": [{"title": "étape courte", "description": "détail de l\'étape en 1 phrase"}]\n'
        "}\n\n"
        "- Si un poste/métier est mentionné, génère 5 à 8 étapes concrètes et pertinentes "
        "pour ce poste (matériel, accès systèmes, présentation équipe, formation, documents "
        "administratifs, point de suivi à 30/60/90 jours...)\n"
        "- Ne déduis jamais employee_name ou title s'ils ne sont pas identifiables dans le message"
    )

    try:
        from smart_hr.ai.llm_providers import get_llm_provider
        from smart_hr.ai.llm_providers.base import strip_llm_code_fences

        provider = get_llm_provider()
        raw = strip_llm_code_fences(provider.extract_json(prompt))
        parsed = json.loads(raw)
    except Exception as exc:
        logger.warning("Génération LLM du programme d'onboarding échouée : %s", exc)
        parsed = {"employee_name": None, "program_type": "onboarding", "title": None, "steps": []}

    if parsed.get("program_type") not in ("onboarding", "offboarding"):
        parsed["program_type"] = "onboarding"
    parsed.setdefault("steps", [])
    return parsed


# ─── Exécution d'actions ─────────────────────────────────────────────────────


def execute_action(action_intent: str, user, params: dict) -> dict:
    """
    Dispatche et exécute l'action détectée.
    Retourne un dict {success, type, label, data} ou {success, error}.
    """
    if action_intent == "leave_request":
        return _execute_leave_request(user, params)
    if action_intent == "leave_approval":
        return _execute_leave_approval(user, params)
    if action_intent == "objective_creation":
        return _execute_objective_creation(user, params)
    if action_intent == "onboarding_creation":
        return _execute_onboarding_creation(user, params)
    return {"success": False, "error": f"Action '{action_intent}' non supportée."}


def _parse_and_validate_leave_dates(
    start_date_str: str | None,
    end_date_str: str | None,
) -> tuple[date | None, date | None, str | None]:
    """Retourne (start, end, error) — error est None si les dates sont valides."""
    if not start_date_str or not end_date_str:
        return None, None, "dates_missing"
    try:
        start = date.fromisoformat(start_date_str)
        end = date.fromisoformat(end_date_str)
    except ValueError:
        return None, None, "Format de date invalide. Utilisez JJ/MM/AAAA."
    if end < start:
        return None, None, "La date de fin est antérieure à la date de début."
    if start < date.today():
        return None, None, "La date de début est dans le passé."
    return start, end, None


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

    start, end, date_error = _parse_and_validate_leave_dates(
        params.get("start_date"),
        params.get("end_date"),
    )
    if date_error:
        return {"success": False, "error": date_error}

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

    except Exception:
        logger.exception("Erreur création congé via chatbot pour %s", user.email)
        return {"success": False, "error": "Erreur interne. Veuillez réessayer."}


# ─── Agent OKR/Objectifs — exécution ─────────────────────────────────────────


def _execute_objective_creation(user, params: dict) -> dict:
    """Crée un objectif OKR (et ses résultats clés) via le serializer DRF existant —
    même chemin de validation que POST /api/v1/personnel/objectives/, pour ne
    jamais dupliquer les règles métier (niveau, permissions, champs requis)."""
    from smart_hr.personnel.models import Department
    from smart_hr.personnel.models import Employee
    from smart_hr.personnel.models import KeyResult
    from smart_hr.personnel.serializers import ObjectiveSerializer

    title = params.get("title")
    period = params.get("period")
    key_results_payload = [kr for kr in params.get("key_results") or [] if kr.get("title")]
    if not title or not period or not key_results_payload:
        return {"success": False, "error": "objective_info_missing"}

    level = params.get("level", "individual")
    payload: dict = {"level": level, "title": title, "period": period}

    if level == "individual":
        try:
            employee = Employee.objects.get(user=user)
        except Employee.DoesNotExist:
            return {
                "success": False,
                "error": "Aucun profil employé trouvé pour votre compte. Contactez le service RH.",
            }
        payload["employee"] = employee.pk
    elif level == "department":
        department_name = params.get("department_name")
        department = Department.objects.filter(name__iexact=(department_name or "").strip()).first()
        if department is None:
            return {"success": False, "error": "department_not_found"}
        payload["department"] = department.pk

    serializer = ObjectiveSerializer(data=payload)
    if not serializer.is_valid():
        logger.warning("Objectif OKR via chatbot invalide pour %s : %s", user.email, serializer.errors)
        return {"success": False, "error": "Impossible de créer cet objectif avec les informations fournies."}

    objective = serializer.save(created_by=user)
    KeyResult.objects.bulk_create(
        [
            KeyResult(
                objective=objective,
                title=kr.get("title", ""),
                unit=kr.get("unit") or "",
                target_value=kr.get("target_value") or 0,
                order=index,
            )
            for index, kr in enumerate(key_results_payload)
        ]
    )

    return {
        "success": True,
        "type": "objective_created",
        "label": "Objectif OKR créé",
        "data": {
            "objective_id": objective.pk,
            "title": objective.title,
            "period": objective.period,
            "level_display": objective.get_level_display(),
            "key_results_count": len(key_results_payload),
        },
    }


# ─── Résolution d'employé par nom (partagée entre agents) ───────────────────


def _find_employee_by_full_name(full_name: str):
    """Résout un employé par correspondance exacte (insensible à la casse) sur
    prénom+nom. Retourne None si aucune correspondance ou plusieurs candidats
    ambigus — mieux vaut demander une précision que de cibler le mauvais employé."""
    from smart_hr.personnel.models import Employee

    target = (full_name or "").strip().lower()
    if not target:
        return None

    candidates = Employee.objects.select_related("user")
    matches = [e for e in candidates if f"{e.user.first_name} {e.user.last_name}".strip().lower() == target]
    return matches[0] if len(matches) == 1 else None


# ─── Agent Dashboard — exécution (validation/refus de congé) ────────────────


def _execute_leave_approval(user, params: dict) -> dict:
    """Valide ou refuse la demande de congé la plus récente d'un employé, via les
    fonctions de service partagées (`smart_hr.conge.services.approve_leave`/
    `reject_leave`) — le même chemin métier que l'API REST
    (`LeaveRequestViewSet.approve/reject`), sans dupliquer la logique de
    permission, de solde ou de notification, et sans dépendre d'utilitaires
    de test (`APIRequestFactory`) dans du code de production."""
    from rest_framework.exceptions import APIException

    from smart_hr.conge.models import LeaveRequest
    from smart_hr.conge.services import approve_leave
    from smart_hr.conge.services import reject_leave

    decision = params.get("decision")
    if decision not in ("approve", "reject"):
        return {"success": False, "error": "leave_decision_missing"}

    employee = _find_employee_by_full_name(params.get("employee_name") or "")
    if employee is None:
        return {"success": False, "error": "employee_not_found"}

    leave = LeaveRequest.objects.filter(employee=employee, status=LeaveRequest.Status.PENDING).order_by("-created_at").first()
    if leave is None:
        return {"success": False, "error": "no_pending_leave"}

    try:
        if decision == "approve":
            approve_leave(leave, user)
        else:
            reject_leave(leave, user)
    except APIException as exc:
        detail = exc.detail[0] if isinstance(exc.detail, list) else exc.detail
        return {"success": False, "error": str(detail)}

    return {
        "success": True,
        "type": "leave_decision_applied",
        "label": "Décision de congé appliquée",
        "data": {
            "employee_name": employee.user.get_full_name(),
            "decision": decision,
            "leave_type": leave.get_leave_type_display(),
            "start_date": leave.start_date.strftime("%d/%m/%Y"),
            "end_date": leave.end_date.strftime("%d/%m/%Y"),
        },
    }


def _execute_onboarding_creation(user, params: dict) -> dict:
    """Crée un programme d'intégration/départ (et ses étapes) via le serializer
    DRF existant — même chemin que POST /api/v1/personnel/onboarding-programs/.
    Réservé RH/Admin (même règle que l'API REST)."""
    from smart_hr.personnel.models import OnboardingStep
    from smart_hr.personnel.serializers import OnboardingProgramSerializer

    user_role = getattr(user, "role", "").upper()
    if user_role not in ("RH", "ADMIN"):
        return {
            "success": False,
            "error": "Seuls les responsables RH peuvent créer un programme d'intégration.",
        }

    employee = _find_employee_by_full_name(params.get("employee_name") or "")
    if employee is None:
        return {"success": False, "error": "employee_not_found"}

    steps_payload = [step for step in params.get("steps") or [] if step.get("title")]
    if not steps_payload:
        return {"success": False, "error": "onboarding_info_missing"}

    program_type = params.get("program_type", "onboarding")
    title = params.get("title") or (
        f"Programme d'intégration — {employee.user.get_full_name()}"
        if program_type == "onboarding"
        else f"Programme de départ — {employee.user.get_full_name()}"
    )

    payload = {"employee": employee.pk, "program_type": program_type, "title": title}
    serializer = OnboardingProgramSerializer(data=payload)
    if not serializer.is_valid():
        logger.warning("Programme d'onboarding via chatbot invalide pour %s : %s", user.email, serializer.errors)
        return {"success": False, "error": "Impossible de créer ce programme avec les informations fournies."}

    program = serializer.save(created_by=user)
    OnboardingStep.objects.bulk_create(
        [
            OnboardingStep(
                program=program,
                title=step.get("title", ""),
                description=step.get("description") or "",
                order=index,
            )
            for index, step in enumerate(steps_payload)
        ]
    )

    return {
        "success": True,
        "type": "onboarding_created",
        "label": "Programme d'intégration créé",
        "data": {
            "program_id": program.pk,
            "title": program.title,
            "employee_name": employee.user.get_full_name(),
            "program_type_display": program.get_program_type_display(),
            "steps_count": len(steps_payload),
        },
    }
