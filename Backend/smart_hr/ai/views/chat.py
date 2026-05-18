import logging

from rest_framework import status
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.ai.models import ChatHistory
from smart_hr.ai.serializers import ChatHistorySerializer

logger = logging.getLogger(__name__)


# ─── Context builders ────────────────────────────────────────────────────────


def _build_rh_admin_context(user) -> list[str]:
    """Construit le contexte métier RH/Admin à injecter dans le prompt IA."""
    lines = []
    try:
        from smart_hr.conge.models import LeaveRequest
        from smart_hr.personnel.models import Employee
        from smart_hr.recruitment.models import Application

        total_employees = Employee.objects.count()
        active_employees = Employee.objects.filter(status="active").count()
        high_risk_count = Employee.objects.filter(churn_risk__gte=70).count()
        medium_risk_count = Employee.objects.filter(
            churn_risk__gte=40,
            churn_risk__lt=70,
        ).count()
        pending_leaves = LeaveRequest.objects.filter(status="pending").count()
        total_applications = Application.objects.count()
        pending_applications = Application.objects.filter(status="pending").count()

        lines += [
            f"Effectif total : {total_employees} employés ({active_employees} actifs)",
            f"Risque de départ : {high_risk_count} employés à risque élevé (≥70%), {medium_risk_count} à risque moyen",
            f"Demandes de congés en attente de validation : {pending_leaves}",
            f"Candidatures reçues : {total_applications} au total, {pending_applications} en attente d'examen",
        ]
    except Exception as exc:
        logger.warning("Erreur contexte RH/Admin : %s", exc)
    return lines


def _build_employee_context(user) -> list[str]:
    """Construit un contexte personnalisé pour un employé."""
    lines = []
    try:
        from smart_hr.conge.models import LeaveRequest
        from smart_hr.personnel.models import Employee

        employee = Employee.objects.filter(user=user).select_related("department", "position").first()
        if employee:
            lines += [
                f"Département : {employee.department.name if employee.department else 'Non assigné'}",
                f"Poste : {employee.position.title if employee.position else 'Non assigné'}",
                f"Statut : {employee.get_status_display()}",
                f"Date d'embauche : {employee.hire_date.strftime('%d/%m/%Y') if employee.hire_date else 'Non renseignée'}",
            ]
            if employee.churn_risk is not None:
                if employee.churn_risk >= 70:
                    engagement = "faible (risque de départ élevé détecté par l'IA)"
                elif employee.churn_risk >= 40:
                    engagement = "moyen"
                else:
                    engagement = "élevé"
                lines.append(f"Niveau d'engagement estimé par l'IA : {engagement}")

        recent_leaves = list(
            LeaveRequest.objects.filter(employee__user=user).order_by("-created_at")[:5],
        )
        if recent_leaves:
            pending = sum(1 for l in recent_leaves if l.status == "pending")
            approved = sum(1 for l in recent_leaves if l.status == "approved")
            rejected = sum(1 for l in recent_leaves if l.status == "rejected")
            lines.append(
                f"Dernières demandes de congé : {len(recent_leaves)} "
                f"(en attente : {pending}, approuvées : {approved}, refusées : {rejected})",
            )
        else:
            lines.append("Aucune demande de congé enregistrée.")
    except Exception as exc:
        logger.warning("Erreur contexte Employé : %s", exc)
    return lines


def _build_candidate_context(user) -> list[str]:
    """Construit un contexte orienté recrutement pour un candidat."""
    lines = []
    try:
        from smart_hr.recruitment.models import Application

        applications = list(
            Application.objects.filter(candidate=user).select_related("job_offer").order_by("-created_at")[:5],
        )
        if applications:
            lines.append(f"Nombre de candidatures soumises : {len(applications)}")
            for app in applications:
                score = f"{app.matching_score:.0f}%" if app.matching_score is not None else "analyse en cours"
                lines.append(
                    f"  - Poste : {app.job_offer.title} | "
                    f"Département : {app.job_offer.department} | "
                    f"Statut : {app.get_status_display()} | "
                    f"Score IA : {score}",
                )
                if app.ai_summary:
                    lines.append(f"    Résumé IA : {app.ai_summary[:200]}...")
        else:
            lines.append("Aucune candidature soumise pour le moment.")
    except Exception as exc:
        logger.warning("Erreur contexte Candidat : %s", exc)
    return lines


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

    role_instructions = {
        "ADMIN": (
            "Tu as accès aux données globales de la plateforme Smart-HR. "
            "Aide à analyser les statistiques RH, les risques de départ (churn), "
            "les congés en attente, le recrutement et la gestion des utilisateurs. "
            "Formule des recommandations stratégiques et opérationnelles précises."
        ),
        "RH": (
            "Tu assistes le Responsable RH dans ses décisions. "
            "Analyse les données du personnel, interprète les scores churn, "
            "aide à la gestion des congés et à l'optimisation du recrutement. "
            "Sois analytique, orienté décision et propose des actions concrètes."
        ),
        "EMPLOYEE": (
            "Tu assistes cet employé dans ses démarches RH personnelles. "
            "Tu peux l'aider à comprendre ses congés, son contrat, sa fiche de paie, "
            "les politiques RH et les formations disponibles. "
            "Sois bienveillant, pédagogue et rassurant. "
            "Ne révèle jamais les données des autres employés."
        ),
        "CANDIDATE": (
            "Tu assistes ce candidat tout au long de son processus de recrutement chez Smart-HR. "
            "Tu peux l'informer sur le statut de sa candidature, le déroulement du processus "
            "(analyse IA du CV, entretien, décision finale), et lui donner des conseils pour améliorer "
            "son profil ou se préparer à un entretien. "
            "Sois encourageant, précis et transparent sur les étapes. "
            "Ne révèle pas d'informations confidentielles sur l'entreprise ou les autres candidats."
        ),
    }

    instructions = role_instructions.get(role, role_instructions["EMPLOYEE"])

    return (
        "Tu es Smart-HR Assistant, un assistant IA expert en ressources humaines. "
        "Réponds toujours en français, de manière claire, concise et professionnelle. "
        "Si la question est hors sujet RH, redirige poliment vers les thématiques RH. "
        "Utilise les données contextuelles ci-dessous pour personnaliser tes réponses.\n\n"
        f"=== CONTEXTE ===\n{context_block}\n================\n\n"
        f"{instructions}"
    )


def _build_conversation_history(user) -> list[dict]:
    """
    Retourne les 4 derniers échanges au format unifié :
    [{"role": "user"|"assistant", "content": str}, ...]

    Chaque provider se charge ensuite de l'adapter à son propre format.
    """
    recent = list(
        ChatHistory.objects.filter(user=user).order_by("-created_at")[:4],
    )
    history = []
    for past in reversed(recent):
        history.append({"role": "user", "content": past.question})
        history.append({"role": "assistant", "content": past.response})
    return history


_UNCERTAIN_MARKERS = (
    "je ne sais pas",
    "je n'ai pas",
    "pas suffisamment d'informations",
    "je ne peux pas répondre",
    "hors de mes compétences",
    "je ne comprends pas",
    "question hors sujet",
    "je n'ai pas accès",
)

_HUMAN_ESCALATION_MESSAGE = (
    "Je ne dispose pas des informations nécessaires pour répondre à cette question. "
    "Pour une assistance personnalisée, veuillez contacter directement votre Responsable RH. "
    "Vous pouvez envoyer un email à votre RH ou le/la joindre via la messagerie interne."
)


def _needs_human_escalation(response_text: str) -> bool:
    """Détecte si la réponse Gemini indique une incapacité à répondre."""
    lower = response_text.lower()
    return any(marker in lower for marker in _UNCERTAIN_MARKERS)


def _count_recent_uncertain_responses(user) -> int:
    """Compte les 2 dernières réponses qui ont mené à une escalade humaine."""
    recent = list(
        ChatHistory.objects.filter(user=user).order_by("-created_at")[:2],
    )
    return sum(1 for chat in recent if _HUMAN_ESCALATION_MESSAGE[:40] in chat.response)


def _get_ai_response(question: str, user) -> str:
    """
    Interroge le fournisseur LLM actif (défini par LLM_PROVIDER dans .env)
    avec un prompt système contextualisé selon le rôle utilisateur.

    Si le modèle indique ne pas pouvoir répondre 2 fois consécutives,
    redirige automatiquement vers le Responsable RH humain.
    """
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
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        """Retourne les conversations de l'utilisateur courant, de la plus récente à la plus ancienne."""
        return ChatHistory.objects.filter(user=self.request.user).order_by(
            "-created_at",
        )

    def create(self, request, *args, **kwargs):
        """
        POST /api/v1/ai/chat/
        Body: { "question": "..." }
        Génère une réponse IA personnalisée selon le rôle et les données de l'utilisateur.
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
        action_result = {}
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
                f"\n\n✅ Demande de congé créée avec succès : **{leave_data['leave_type']}** "
                f"du {leave_data['start_date']} au {leave_data['end_date']} "
                f"({leave_data['duration_days']} jour(s)) — Statut : {leave_data['status']}."
            )
        elif action_result.get("error") == "dates_missing":
            ai_response += (
                "\n\nPour créer votre demande de congé automatiquement, "
                "précisez les dates de début et de fin (ex: du 01/06/2026 au 05/06/2026)."
            )

        chat = ChatHistory.objects.create(
            user=request.user,
            question=question,
            response=ai_response,
            action_type=action_result.get("type", ""),
            action_data=action_result.get("data", {}),
        )
        serializer = self.get_serializer(chat)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
