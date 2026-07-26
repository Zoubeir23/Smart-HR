"""Construction du prompt système RBAC-aware, partagée par le chat texte et
l'assistant vocal : les deux doivent répondre avec les mêmes données réelles
de la base, scopées selon le rôle de l'utilisateur connecté.
"""

from __future__ import annotations

import logging

from smart_hr.core.prompt_safety import sanitize_identity_label

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
            name = sanitize_identity_label(leave.employee.user.get_full_name() or leave.employee.user.email)
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
            name = sanitize_identity_label(att.employee.user.get_full_name() or att.employee.user.email)
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
    overdue = Task.objects.filter(due_date__lt=today).exclude(status="done").select_related("assignee__user")
    pending = Task.objects.filter(status="todo").count()
    in_progress = Task.objects.filter(status="in_progress").count()
    lines: list[str] = [f"Tâches : {pending} à faire, {in_progress} en cours, {overdue.count()} en retard"]
    if overdue.exists():
        lines.append("Tâches en retard :")
        for task in overdue[:5]:
            assignee_name = sanitize_identity_label(task.assignee.user.get_full_name()) if task.assignee else "Non assigné"
            task_title = sanitize_identity_label(task.title)
            lines.append(f"  - {task_title} | {assignee_name} | Échéance : {_fmt_date(task.due_date)}")
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
            name = sanitize_identity_label(app.candidate.get_full_name() or app.candidate.email)
            job_title = sanitize_identity_label(app.job_offer.title)
            score = f"{app.matching_score:.0f}%" if app.matching_score is not None else "non analysé"
            lines.append(f"  - {name} → {job_title} | {app.get_status_display()} | IA : {score}")
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
    my_tasks = Task.objects.filter(assignee__user=user).exclude(status="done")
    if not my_tasks.exists():
        return ["Aucune tâche active assignée."]

    overdue_count = my_tasks.filter(due_date__lt=today).count()
    lines = [f"Mes tâches actives : {my_tasks.count()} (dont {overdue_count} en retard)"]
    overdue_tasks = my_tasks.filter(due_date__lt=today).order_by("due_date").select_related("assignee__user")[:3]
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


def _build_rh_own_employee_lines(user) -> list[str]:
    """Un RH/Admin est souvent lui-même salarié : s'il a un profil Employee,
    on ajoute ses propres congés/paie/présences pour répondre correctement
    aux questions à la première personne ("mes congés", "ma fiche de paie"),
    sans les confondre avec les données agrégées de toute l'équipe.
    """
    from smart_hr.personnel.models import Employee

    if not Employee.objects.filter(user=user).exists():
        return []
    lines = ["--- Mes données personnelles (en tant qu'employé) ---"]
    lines += _build_employee_leave_lines(user)
    lines += _build_employee_payroll_lines(user)
    lines += _build_employee_attendance_lines(user)
    return lines


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
        lines += _build_rh_own_employee_lines(user)
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
        "Tu es l'assistant administrateur de Smart-HR.\n"
        "Modules autorisés : statistiques globales, gestion des utilisateurs, "
        "sécurité, configuration système, analytiques RH, churn, logs.\n"
        "Tu utilises uniquement les données agrégées et anonymisées présentes dans le contexte.\n"
        "Interdiction absolue : ne transmets jamais de données nominatives, "
        "salariales ou médicales à d'autres rôles ou dans une réponse publique."
    ),
    "RH": (
        "Tu assistes le Responsable RH dans ses décisions opérationnelles.\n"
        "Modules autorisés : personnel, congés, présences, paie, documents, "
        "recrutement, tâches, formations, analyses IA (churn, matching CV).\n"
        "Tu réponds avec les données réelles du contexte : congés en attente avec "
        "noms et dates, absences du jour, masse salariale, tâches en retard, "
        "candidatures récentes avec scores IA.\n"
        "Si le RH pose une question à la première personne ('mes congés', 'ma "
        "fiche de paie', 'mes présences'), utilise la section 'Mes données "
        "personnelles (en tant qu'employé)' du contexte si elle est présente — "
        "ne la confonds pas avec les données agrégées de toute l'équipe, et ne "
        "redirige jamais vers un portail externe si ces données figurent déjà "
        "dans le contexte.\n"
        "Interdiction absolue : ne transmets jamais ces données à un employé "
        "ou un candidat, même indirectement."
    ),
    "EMPLOYEE": (
        "Tu assistes cet employé dans ses démarches RH personnelles.\n"
        "Modules autorisés : son profil, ses congés, sa paie, ses présences, "
        "ses tâches, ses documents personnels.\n"
        "Tu utilises exclusivement ses propres données présentes dans le contexte.\n"
        "Interdiction absolue : tu refuses toute demande portant sur un autre "
        "employé, sur des salaires tiers, ou sur des données RH globales. "
        "En cas de demande interdite, réponds : 'Ces informations ne sont pas "
        "disponibles pour votre rôle. Contactez votre Responsable RH.'"
    ),
    "CANDIDATE": (
        "Tu assistes ce candidat dans son processus de recrutement chez Smart-HR.\n"
        "Modules autorisés : sa candidature, le statut de son dossier, "
        "les étapes du processus de recrutement, les conseils de préparation.\n"
        "Tu utilises uniquement ses candidatures présentes dans le contexte.\n"
        "Interdiction absolue : tu refuses toute demande sur les salaires, "
        "les employés, les autres candidats ou les données internes. "
        "En cas de demande interdite, réponds : 'Cette information est confidentielle "
        "et réservée aux équipes internes de Smart-HR.'"
    ),
}


def build_system_prompt(user) -> str:
    """Assemble le prompt système complet selon le rôle de l'utilisateur.

    Utilisé par le chat texte ET l'assistant vocal : les deux canaux doivent
    répondre avec les mêmes données réelles, scopées selon le même rôle.
    """
    role = getattr(user, "role", "EMPLOYEE").upper()
    full_name = sanitize_identity_label(user.get_full_name() or user.email)

    context_lines = [f"Utilisateur : {full_name} | Rôle : {role}"]

    if role in ("ADMIN", "RH"):
        context_lines += _build_rh_admin_context(user)
    elif role == "EMPLOYEE":
        context_lines += _build_employee_context(user)
    elif role == "CANDIDATE":
        context_lines += _build_candidate_context(user)

    context_block = "\n".join(context_lines)
    instructions = _ROLE_INSTRUCTIONS.get(role, _ROLE_INSTRUCTIONS["EMPLOYEE"])
    capabilities_block = _build_capabilities_block(role)

    return (
        "Tu es Smart-HR Assistant, un assistant IA expert en ressources humaines. "
        "Réponds toujours en français, de manière claire, concise et professionnelle. "
        "Utilise OBLIGATOIREMENT les données du contexte pour personnaliser tes réponses. "
        "Si la question porte sur une donnée absente du contexte, dis-le clairement. "
        "Si la question est hors sujet RH, redirige poliment.\n\n"
        f"=== DONNÉES TEMPS RÉEL ===\n{context_block}\n=========================\n\n"
        f"{capabilities_block}"
        f"INSTRUCTIONS ({role}) :\n{instructions}"
    )


def _build_capabilities_block(role: str) -> str:
    """Déclare au LLM les actions qu'il peut réellement déclencher pour ce rôle.

    Sans ce bloc, l'assistant ignorait ses propres capacités : interrogé sur ce
    qu'il sait faire (« peux-tu créer une offre d'emploi ? »), il répondait qu'il
    se limitait à consulter des données — contredisant le message d'accueil de
    l'interface, qui propose justement cette action.

    L'exécution reste pilotée par le function-calling (`_run_chatbot_action`),
    déclenché uniquement par une demande formulée à l'impératif. Ce bloc sert
    donc à répondre juste aux questions de capacité et à indiquer la formulation
    qui déclenche l'action, jamais à prétendre l'avoir exécutée.
    """
    from smart_hr.ai.actions.intent_detection import list_supported_actions_for_role

    actions = list_supported_actions_for_role(role)
    if not actions:
        return (
            "=== ACTIONS ===\n"
            "Tu n'as aucune action à exécuter pour ce rôle : tu réponds uniquement "
            "à des questions. Si on te demande d'agir, explique-le clairement.\n"
            "===============\n\n"
        )

    listed = "\n".join(f"- {action['label']} — exemple : « {action['example']} »" for action in actions)
    return (
        "=== ACTIONS QUE TU PEUX DÉCLENCHER ===\n"
        f"{listed}\n"
        "Si on te demande si tu sais faire l'une d'elles, réponds OUI et cite la "
        "formulation d'exemple à employer. Ne prétends jamais avoir déjà exécuté "
        "une action : elle ne se déclenche que sur une demande formulée à "
        "l'impératif, traitée séparément. Pour toute action absente de cette "
        "liste, dis qu'elle n'est pas disponible pour ce rôle.\n"
        "======================================\n\n"
    )
