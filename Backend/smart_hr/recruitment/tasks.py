import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def analyze_cv_async(self, application_id: int) -> None:
    """Tâche Celery — analyse le CV d'une candidature en arrière-plan.

    Extrait le texte du PDF, appelle Gemini pour le matching, puis met à jour
    matching_score, skills_extracted et ai_summary sur l'objet Application.
    Réessaie automatiquement jusqu'à 3 fois en cas d'erreur transitoire.
    """
    from smart_hr.recruitment.models import Application
    from smart_hr.recruitment.services.cv_analysis_service import analyze_cv_against_job_offer
    from smart_hr.recruitment.services.cv_analysis_service import extract_text_from_pdf

    try:
        application = Application.objects.select_related("job_offer").get(pk=application_id)
    except Application.DoesNotExist:
        logger.error("analyze_cv_async : candidature %s introuvable — abandon.", application_id)
        return

    try:
        job_offer = application.job_offer
        cv_text = extract_text_from_pdf(application.cv)

        result = analyze_cv_against_job_offer(
            cv_text=cv_text,
            cover_letter=application.cover_letter or "",
            job_title=job_offer.title,
            job_requirements=job_offer.requirements or "",
            job_description=job_offer.description or "",
        )

        application.matching_score = result["matching_score"]
        application.skills_extracted = result["skills_extracted"]
        application.ai_summary = result["ai_summary"]
        application.save(update_fields=["matching_score", "skills_extracted", "ai_summary"])

        logger.info(
            "analyze_cv_async : candidature %s analysée — score %.1f%%",
            application_id,
            result["matching_score"],
        )

    except Exception as exc:
        logger.exception(
            "analyze_cv_async : erreur pour la candidature %s (tentative %d/%d)",
            application_id,
            self.request.retries + 1,
            self.max_retries + 1,
        )
        raise self.retry(exc=exc) from exc
