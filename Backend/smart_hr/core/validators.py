import os

from django.core.exceptions import ValidationError

ALLOWED_DOCUMENT_EXTENSIONS = frozenset(
    {
        ".pdf",
        ".docx",
        ".doc",
        ".odt",
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
    },
)
ALLOWED_CV_EXTENSIONS = frozenset({".pdf", ".docx", ".doc", ".odt"})

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 Mo


def validate_document_extension(value):
    ext = os.path.splitext(value.name)[1].lower()
    if ext not in ALLOWED_DOCUMENT_EXTENSIONS:
        raise ValidationError(
            f"Extension «{ext}» non autorisée. Extensions acceptées : {', '.join(sorted(ALLOWED_DOCUMENT_EXTENSIONS))}",
        )


def validate_cv_extension(value):
    ext = os.path.splitext(value.name)[1].lower()
    if ext not in ALLOWED_CV_EXTENSIONS:
        raise ValidationError(
            f"Extension «{ext}» non autorisée pour un CV. Extensions acceptées : {', '.join(sorted(ALLOWED_CV_EXTENSIONS))}",
        )


def validate_file_size(value):
    if value.size > MAX_FILE_SIZE_BYTES:
        size_mb = value.size // (1024 * 1024)
        raise ValidationError(
            f"Fichier trop volumineux ({size_mb} Mo). Maximum autorisé : 10 Mo.",
        )
