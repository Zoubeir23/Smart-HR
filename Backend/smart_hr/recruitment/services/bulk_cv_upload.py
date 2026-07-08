"""
Ajout de CV en masse assigné par IA.

Pour chaque fichier reçu : extraction du texte, identification du candidat
(prénom/nom/e-mail) et scoring par rapport à l'offre, le tout via IA — puis
création automatique du compte candidat (s'il n'existe pas encore) et de sa
candidature sur l'offre ciblée. Traitement tolérant aux erreurs : un fichier
en échec n'interrompt pas le traitement des suivants.
"""

from __future__ import annotations

import logging
import secrets
from dataclasses import dataclass
from dataclasses import field

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils.text import slugify

from smart_hr.core.validators import validate_cv_extension
from smart_hr.core.validators import validate_file_size
from smart_hr.recruitment.models import Application
from smart_hr.recruitment.models import JobOffer
from smart_hr.recruitment.services.cv_analysis_service import analyze_cv_against_job_offer
from smart_hr.recruitment.services.cv_analysis_service import extract_candidate_identity
from smart_hr.recruitment.services.cv_analysis_service import extract_text_from_pdf
from smart_hr.users.models import User

logger = logging.getLogger(__name__)


@dataclass
class FileUploadError:
    filename: str
    reason: str


@dataclass
class BulkCVUploadResult:
    created: int = 0
    total_files: int = 0
    errors: list[FileUploadError] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "created": self.created,
            "total_files": self.total_files,
            "errors": [{"filename": e.filename, "reason": e.reason} for e in self.errors],
        }


def _generate_unique_username(first_name: str, last_name: str) -> str:
    base = slugify(f"{first_name}.{last_name}") or "candidat"
    username = base
    suffix = 1
    while User.objects.filter(username=username).exists():
        suffix += 1
        username = f"{base}{suffix}"
    return username


def _find_or_create_candidate(first_name: str, last_name: str, email: str) -> User:
    existing = User.objects.filter(email__iexact=email).first()
    if existing:
        return existing

    username = _generate_unique_username(first_name or "candidat", last_name or "")
    candidate = User.objects.create(
        username=username,
        email=email,
        first_name=first_name or "Candidat",
        last_name=last_name or "",
        role=User.Role.CANDIDATE,
    )
    candidate.set_password(secrets.token_urlsafe(16))
    candidate.save(update_fields=["password"])
    return candidate


def upload_cvs_to_job_offer(job_offer: JobOffer, files: list, created_by: User) -> BulkCVUploadResult:
    result = BulkCVUploadResult(total_files=len(files))

    for uploaded_file in files:
        try:
            validate_cv_extension(uploaded_file)
            validate_file_size(uploaded_file)
        except ValidationError as exc:
            result.errors.append(FileUploadError(uploaded_file.name, "; ".join(exc.messages)))
            continue

        cv_text = extract_text_from_pdf(uploaded_file)
        if not cv_text:
            result.errors.append(FileUploadError(uploaded_file.name, "Impossible d'extraire le texte du CV."))
            continue

        identity = extract_candidate_identity(cv_text)
        if not identity["email"]:
            result.errors.append(FileUploadError(uploaded_file.name, "Adresse e-mail du candidat introuvable dans le CV."))
            continue

        try:
            with transaction.atomic():
                candidate = _find_or_create_candidate(identity["first_name"], identity["last_name"], identity["email"])

                if Application.objects.filter(job_offer=job_offer, candidate=candidate).exists():
                    result.errors.append(FileUploadError(uploaded_file.name, "Ce candidat a déjà postulé à cette offre."))
                    continue

                analysis = analyze_cv_against_job_offer(
                    cv_text=cv_text,
                    cover_letter="",
                    job_title=job_offer.title,
                    job_requirements=job_offer.requirements,
                    job_description=job_offer.description,
                )

                Application.objects.create(
                    job_offer=job_offer,
                    candidate=candidate,
                    cv=uploaded_file,
                    matching_score=analysis["matching_score"],
                    skills_extracted=analysis["skills_extracted"],
                    ai_summary=analysis["ai_summary"],
                    gdpr_consent=True,
                )
                result.created += 1
        except Exception:
            logger.exception("Échec de l'ajout du CV '%s' à l'offre %s", uploaded_file.name, job_offer.pk)
            result.errors.append(FileUploadError(uploaded_file.name, "Erreur interne lors du traitement du CV."))

    return result
