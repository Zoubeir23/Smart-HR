from __future__ import annotations

import logging

from rest_framework import status
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.ai.models import ChatHistory
from smart_hr.ai.serializers import ChatHistorySerializer
from smart_hr.core.throttles import AILLMUserThrottle

logger = logging.getLogger(__name__)


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _fmt_date(date_obj) -> str:
    return date_obj.strftime("%d/%m/%Y") if date_obj else "N/A"


def _fmt_money(amount) -> str:
    if amount is None:
        return "N/A"
    return f"{int(amount):,} FCFA".replace(",", " ")


# ─── Context sub-builders ─────────────────────────────────────────────────────


def _build_rh_effectif_lines(employees) -> list[str]:
    high_churn = employees.filter(churn_risk__gte=70).count()
    medium_churn = employees.filter(churn_risk__gte=40, churn_risk__lt=70).count()
    return [
        f"Effectif : {employees.count()} employés actifs",
        f"Risque churn IA : {high_churn} élevé (≥70%), {medium_churn} moyen (40-69%)",
    ]


def _build_rh_leave_lines() -> list[str]:
    from django.utils import timezone

    from smart_hr.conge.models import LeaveRequest

    today = timezone.now().date()
    pending_leaves = LeaveRequest.objects.filter(status="pending").select_related("employee__user").order_by("start_date")[:10]
    lines: list[str] = []
    if pending_leaves:
        lines.append(f"Demandes de congé en attente ({pending_leaves.count()}) :")
        for leave in pending_leaves:
            name = leave.employee.user.get_full_name() or leave.employee.user.email
            lines.append(
                f"  - {name} | {leave.get_leave_type_display()} | "
                f"du {_fmt_date(leave.start_date)} au {_fmt_date(leave.end_date)} "
                f"({leave.duration_days} jour(s))"
            )
    else:
        lines.append("Aucune demande de congé en attente.")

    approved_this_month = LeaveRequest.objects.filter(
        status="approved",
        start_date__year=today.year,
        start_date__month=today.month,
    ).count()
    lines.append(f"Congés approuvés ce mois : {approved_this_month}")
    return lines


def _build_rh_payroll_lines() -> list[str]:
    from django.db.models import Sum as DjSum
    from django.utils import timezone

    from smart_hr.paiement.models import Payroll

    today = timezone.now().date()
    current_month = today.strftime("%Y-%m")
    payrolls = Payroll.objects.filter(month=current_month)
    total = payrolls.count()
    processed = payrolls.filter(status="processed").count()
    pending = payrolls.filter(status="pending").count()
    mass = payrolls.filter(status="processed").aggregate(total=DjSum("net_salary"))["total"]
    return [
        f"Paie {current_month} : {total} fiches ({processed} traitées, {pending} en attente)",
        f"Masse salariale nette traitée : {_fmt_money(mass)}",
    ]


def _build_rh_attendance_lines() -> list[str]:
    from django.utils import timezone

    from smart_hr.presence.models import Attendance

    today = timezone.now().date()
    absents_today = Attendance.objects.filter(date=today).exclude(status="present").select_related("employee__user")
    lines: list[str] = []
    if absents_today.exists():
        lines.append(f"Absences aujourd'hui ({absents_today.count()}) :")
        for att in absents_today[:8]:
            name = att.employee.user.get_full_name() or att.employee.user.email
            lines.append(f"  - {name} : {att.get_status_display()}")
    else:
        lines.append("Aucune absence enregistrée aujourd'hui.")

    absents_month = Attendance.objects.filter(date__year=today.year, date__month=today.month).exclude(status="present").count()
    lines.append(f"Total absences ce mois : {absents_month}")
    return lines


def _build_rh_task_lines() -> list[str]:
    from django.utils import timezone

    from smart_hr.tache.models import Task

    today = timezone.now().date()
    overdue = Task.objects.filter(due_date__lt=today).exclude(status="done").select_related("assignee")
    pending = Task.objects.filter(status="todo").count()
    in_progress = Task.objects.filter(status="in_progress").count()
    lines: list[str] = [f"Tâches : {pending} à faire, {in_progress} en cours, {overdue.count()} en retard"]
    if overdue.exists():
        lines.append("Tâches en retard :")
        for task in overdue[:5]:
            assignee_name = task.assignee.get_full_name() if task.assignee else "Non assigné"
            lines.append(f"  - {task.title} | {assignee_name} | Échéance : {_fmt_date(task.due_date)}")
    return lines


def _build_rh_recruitment_lines() -> list[str]:
    from smart_hr.recruitment.models import Application

    total = Application.objects.count()
    pending = Application.objects.filter(status="pending").count()
    accepted = Application.objects.filter(status="accepted").count()
    lines: list[str] = [f"Recrutement : {total} candidatures ({pending} en attente, {accepted} acceptées)"]

    recent = Application.objects.select_related("candidate", "job_offer").order_by("-created_at")[:5]
    if recent:
        lines.append("5 dernières candidatures :")
        for app in recent:
            name = app.candidate.get_full_name() or app.candidate.email
            score = f"{app.matching_score:.0f}%" if app.matching_score is not None else "non analysé"
            lines.append(f"  - {name} → {app.job_offer.title} | {app.get_status_display()} | IA : {score}")
    return lines


def _build_employee_leave_lines(user) -> list[str]:
    from django.utils import timezone

    from smart_hr.conge.models import LeaveRequest

    today = timezone.now().date()
    my_leaves = LeaveRequest.objects.filter(employee__user=user).order_by("-created_at")
    if not my_leaves.exists():
        return ["Aucune demande de congé soumise."]

    pending = my_leaves.filter(status="pending").count()
    approved = my_leaves.filter(status="approved").count()
    rejected = my_leaves.filter(status="rejected").count()
    lines = [f"Mes congés : {my_leaves.count()} total (en attente:{pending}, approuvés:{approved}, refusés:{rejected})"]
    upcoming = my_leaves.filter(status="approved", start_date__gte=today).order_by("start_date")[:3]
    if upcoming:
        lines.append("Prochains congés :")
        lines.extend(
            f"  - {leave.get_leave_type_display()} du {_fmt_date(leave.start_date)}"
            f" au {_fmt_date(leave.end_date)} ({leave.duration_days}j)"
            for leave in upcoming
        )
    annual_used = my_leaves.filter(status="approved", leave_type="annual", start_date__year=today.year).count()
    lines.append(f"Congés annuels utilisés cette année : {annual_used} demande(s)")
    return lines


def _build_employee_payroll_lines(user) -> list[str]:
    from smart_hr.paiement.models import Payroll

    payrolls = Payroll.objects.filter(employee__user=user).order_by("-month")[:3]
    if not payrolls.exists():
        return ["Aucune fiche de paie disponible."]
    lines = ["Mes 3 dernières fiches de paie :"]
    lines.extend(
        f"  - {payroll.month} | Net : {_fmt_money(payroll.net_salary)}"
        f" | Primes : {_fmt_money(payroll.bonuses)}"
        f" | Retenues : {_fmt_money(payroll.deductions)}"
        f" | {payroll.get_status_display()}"
        for payroll in payrolls
    )
    return lines


def _build_employee_task_lines(user) -> list[str]:
    from django.utils import timezone

    from smart_hr.tache.models import Task

    today = timezone.now().date()
    my_tasks = Task.objects.filter(assignee=user).exclude(status="done")
    if not my_tasks.exists():
        return ["Aucune tâche active assignée."]

    overdue_count = my_tasks.filter(due_date__lt=today).count()
    lines = [f"Mes tâches actives : {my_tasks.count()} (dont {overdue_count} en retard)"]
    overdue_tasks = my_tasks.filter(due_date__lt=today).order_by("due_date")[:3]
    if overdue_tasks:
        lines.append("Tâches en retard :")
        lines.extend(f"  - {task.title} | Échéance : {_fmt_date(task.due_date)}" for task in overdue_tasks)
    return lines


def _build_employee_attendance_lines(user) -> list[str]:
    from django.utils import timezone

    from smart_hr.presence.models import Attendance

    today = timezone.now().date()
    my_attendance = Attendance.objects.filter(employee__user=user, date__year=today.year, date__month=today.month)
    if not my_attendance.exists():
        return ["Aucune donnée de présence ce mois."]
    present = my_attendance.filter(status="present").count()
    absent = my_attendance.exclude(status="present").count()
    return [f"Mes présences ce mois : {present} présent(s), {absent} absence(s)"]


# ─── Context builders ────────────────────────────────────────────────────────


def _build_rh_admin_context(user) -> list[str]:
    """Contexte complet pour RH et Admin : données réelles depuis la DB."""
    try:
        from smart_hr.personnel.models import Employee

        employees = Employee.objects.filter(status="active")
        lines: list[str] = []
        lines += _build_rh_effectif_lines(employees)
        lines += _build_rh_leave_lines()
        lines += _build_rh_payroll_lines()
        lines += _build_rh_attendance_lines()
        lines += _build_rh_task_lines()
        lines += _build_rh_recruitment_lines()
        return lines
    except Exception as exc:
        logger.warning("Erreur contexte RH/Admin : %s", exc)
        return []


def _build_employee_context(user) -> list[str]:
    """Contexte personnalisé pour un employé : uniquement ses propres données."""
    try:
        from smart_hr.personnel.models import Employee

        lines: list[str] = []
        employee = Employee.objects.filter(user=user).select_related("department", "service", "position").first()
        if employee:
            lines += [
                f"Département : {employee.department.name if employee.department else 'N/A'}",
                f"Service : {employee.service.name if employee.service else 'N/A'}",
                f"Poste : {employee.position.title if employee.position else 'N/A'}",
                f"Date d'embauche : {_fmt_date(employee.hire_date)}",
                f"Salaire de base : {_fmt_money(employee.salary)}",
            ]
        lines += _build_employee_leave_lines(user)
        lines += _build_employee_payroll_lines(user)
        lines += _build_employee_task_lines(user)
        lines += _build_employee_attendance_lines(user)
        return lines
    except Exception as exc:
        logger.warning("Erreur contexte Employé : %s", exc)
        return []


def _build_candidate_context(user) -> list[str]:
    """Contexte orienté recrutement pour un candidat : uniquement ses candidatures."""
    lines: list[str] = []
    try:
        from smart_hr.recruitment.models import Application

        applications = list(
            Application.objects.filter(candidate=user).select_related("job_offer").order_by("-created_at")[:5],
        )
        if applications:
            lines.append(f"Candidatures soumises : {len(applications)}")
            for app in applications:
                score = f"{app.matching_score:.0f}%" if app.matching_score is not None else "en cours"
                lines.append(f"  - {app.job_offer.title} | {app.get_status_display()} | IA : {score}")
                if app.ai_summary:
                    lines.append(f"    Résumé IA : {app.ai_summary[:300]}")
        else:
            lines.append("Aucune candidature soumise pour le moment.")
    except Exception as exc:
        logger.warning("Erreur contexte Candidat : %s", exc)
    return lines


# ─── System prompt ────────────────────────────────────────────────────────────


_ROLE_INSTRUCTIONS: dict[str, str] = {
    "ADMIN": (
        "Tu as accès à toutes les données RH. Aide à analyser les statistiques, "
        "les risques de départ (churn), les congés, la paie, les présences, les tâches "
        "et le recrutement. Formule des recommandations concrètes basées sur les données du contexte. "
        "IMPORTANT : ne révèle jamais de données personnelles à d'autres rôles."
    ),
    "RH": (
        "Tu assistes le Responsable RH. Le contexte contient les données réelles : "
        "congés en attente avec noms et dates, fiches de paie du mois, absences du jour, "
        "tâches en retard, candidatures récentes. "
        "Réponds aux questions sur ces données de façon précise et orientée action. "
        "IMPORTANT : ne révèle jamais de données à des rôles non autorisés."
    ),
    "EMPLOYEE": (
        "Tu assistes cet employé dans ses démarches RH personnelles. "
        "Le contexte contient UNIQUEMENT ses propres données. "
        "Tu peux lui expliquer ses fiches de paie, ses congés, ses tâches, ses absences. "
        "INTERDIT : ne révèle jamais les données d'autres employés. "
        "Si on te demande des données sur d'autres personnes, décline poliment."
    ),
    "CANDIDATE": (
        "Tu assistes ce candidat dans son processus de recrutement. "
        "Le contexte contient uniquement ses candidatures personnelles. "
        "INTERDIT : ne révèle aucune donnée interne (salaires, employés, chiffres RH). "
        "Si on te demande ces informations, décline clairement."
    ),
}


def _build_system_prompt(user) -> str:
    """Assemble le prompt système complet selon le rôle de l'utilisateur."""
    role = getattr(user, "role", "EMPLOYEE").upper()
    full_name = user.get_full_name() or user.email

    context_lines = [f"Utilisateur : {full_name} | Rôle : {role}"]

    if role in ("ADMIN", "RH"):
        context_lines += _build_rh_admin_context(user)
    elif role == "EMPLOYEE":
        context_lines += _build_employee_context(user)
    elif role == "CANDIDATE":
        context_lines += _build_candidate_context(user)

    context_block = "\n".join(context_lines)
    instructions = _ROLE_INSTRUCTIONS.get(role, _ROLE_INSTRUCTIONS["EMPLOYEE"])

    return (
        "Tu es Smart-HR Assistant, un assistant IA expert en ressources humaines. "
        "Réponds toujours en français, de manière claire, concise et professionnelle. "
        "Utilise OBLIGATOIREMENT les données du contexte pour personnaliser tes réponses. "
        "Si la question porte sur une donnée absente du contexte, dis-le clairement. "
        "Si la question est hors sujet RH, redirige poliment.\n\n"
        f"=== DONNÉES TEMPS RÉEL ===\n{context_block}\n=========================\n\n"
        f"INSTRUCTIONS ({role}) :\n{instructions}"
    )


# ─── Conversation history ─────────────────────────────────────────────────────


def _build_conversation_history(user) -> list[dict]:
    """Retourne les 6 derniers échanges au format unifié."""
    recent = list(ChatHistory.objects.filter(user=user).order_by("-created_at")[:6])
    history = []
    for past in reversed(recent):
        history.append({"role": "user", "content": past.question})
        history.append({"role": "assistant", "content": past.response})
    return history


# ─── Escalade humaine ─────────────────────────────────────────────────────────

_UNCERTAIN_MARKERS = (
    "je ne sais pas",
    "je n'ai pas",
    "pas suffisamment d'informations",
    "je ne peux pas répondre",
    "hors de mes compétences",
    "je ne comprends pas",
    "je n'ai pas accès",
)

_HUMAN_ESCALATION_MESSAGE = (
    "Je ne dispose pas des informations nécessaires pour répondre à cette question. "
    "Pour une assistance personnalisée, veuillez contacter directement votre Responsable RH."
)


def _needs_human_escalation(response_text: str) -> bool:
    lower = response_text.lower()
    return any(marker in lower for marker in _UNCERTAIN_MARKERS)


def _count_recent_uncertain_responses(user) -> int:
    recent = list(ChatHistory.objects.filter(user=user).order_by("-created_at")[:2])
    return sum(1 for chat in recent if _HUMAN_ESCALATION_MESSAGE[:40] in chat.response)


# ─── LLM call ────────────────────────────────────────────────────────────────


def _get_ai_response(question: str, user) -> str:
    """Interroge le LLM avec un prompt système contextuel selon le rôle."""
    if _count_recent_uncertain_responses(user) >= 2:
        return _HUMAN_ESCALATION_MESSAGE

    try:
        from smart_hr.ai.llm_providers import get_llm_provider

        provider = get_llm_provider()
        system_prompt = _build_system_prompt(user)
        history = _build_conversation_history(user)
        response_text = provider.generate_response(system_prompt, history, question)

        if _needs_human_escalation(response_text):
            return _HUMAN_ESCALATION_MESSAGE

        return response_text
    except Exception as exc:
        logger.error("Erreur LLM provider : %s", exc)
        return "Désolé, le service IA est temporairement indisponible. Veuillez réessayer."


# ─── ViewSet ─────────────────────────────────────────────────────────────────


class ChatHistoryViewSet(viewsets.ModelViewSet):
    """Historique des conversations IA d'un utilisateur authentifié."""

    serializer_class = ChatHistorySerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [AILLMUserThrottle]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return ChatHistory.objects.filter(user=self.request.user).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        """
        POST /api/v1/ai/chat/
        Body: { "question": "..." }
        Génère une réponse IA personnalisée selon le rôle et les données réelles DB.
        """
        question = request.data.get("question", "").strip()
        if not question:
            return Response(
                {"detail": "Le champ 'question' est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(question) > 1000:
            return Response(
                {"detail": "La question ne peut pas dépasser 1000 caractères."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        action_intent = None
        action_result: dict = {}
        user_role = getattr(request.user, "role", "").upper()
        if user_role in ("EMPLOYEE", "RH", "ADMIN"):
            from smart_hr.ai.actions import detect_action_intent
            from smart_hr.ai.actions import execute_action
            from smart_hr.ai.actions import extract_leave_parameters

            action_intent = detect_action_intent(question)
            if action_intent:
                params = extract_leave_parameters(question)
                action_result = execute_action(action_intent, request.user, params)

        ai_response = _get_ai_response(question, request.user)

        if action_result.get("success"):
            leave_data = action_result["data"]
            ai_response += (
                f"\n\n✅ Demande de congé créée : **{leave_data['leave_type']}** "
                f"du {leave_data['start_date']} au {leave_data['end_date']} "
                f"({leave_data['duration_days']} jour(s)) — {leave_data['status']}."
            )
        elif action_result.get("error") == "dates_missing":
            ai_response += "\n\nPour créer votre demande automatiquement, précisez les dates (ex: du 01/06/2026 au 05/06/2026)."

        chat = ChatHistory.objects.create(
            user=request.user,
            question=question,
            response=ai_response,
            action_type=action_result.get("type", ""),
            action_data=action_result.get("data", {}),
        )
        serializer = self.get_serializer(chat)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
