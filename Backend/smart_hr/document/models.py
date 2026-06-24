from django.conf import settings
from django.db import models

from smart_hr.core.models import TimeStampedModel
from smart_hr.core.validators import validate_document_extension
from smart_hr.core.validators import validate_file_size
from smart_hr.personnel.models import Employee


class Document(TimeStampedModel):
    class DocumentType(models.TextChoices):
        CONTRACT = "contract", "Contrat"
        CERTIFICATE = "certificate", "Certificat"
        ATTESTATION = "attestation", "Attestation"
        ID_CARD = "id_card", "Carte d'identité"
        OTHER = "other", "Autre"

    class Category(models.TextChoices):
        ADMINISTRATIVE = "administrative", "Administratif"
        LEGAL = "legal", "Juridique"
        TRAINING = "training", "Formation"
        MEDICAL = "medical", "Médical"
        FINANCIAL = "financial", "Financier"
        OTHER = "other", "Autre"

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    name = models.CharField(max_length=255)
    document_type = models.CharField(
        max_length=20,
        choices=DocumentType.choices,
        default=DocumentType.OTHER,
    )
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.OTHER,
        help_text="Catégorie métier du document pour faciliter l'organisation.",
    )
    version = models.PositiveSmallIntegerField(
        default=1,
        help_text="Numéro de version du document (incrémenté manuellement lors d'un remplacement).",
    )
    file = models.FileField(
        upload_to="documents/",
        validators=[validate_document_extension, validate_file_size],
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_documents",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Document"
        verbose_name_plural = "Documents"

    def __str__(self):
        return f"{self.name} ({self.get_document_type_display()}) - {self.employee}"
