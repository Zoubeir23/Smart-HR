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


class Signature(TimeStampedModel):
    """Signature électronique personnelle déposée par un utilisateur (manager,
    RH...), réutilisée pour signer les documents qui lui sont soumis."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="signature",
    )
    image_data = models.TextField(
        verbose_name="Image de la signature",
        help_text="Data URL (base64) de la signature dessinée ou uploadée.",
    )

    class Meta:
        verbose_name = "Signature électronique"
        verbose_name_plural = "Signatures électroniques"

    def __str__(self) -> str:
        return f"Signature de {self.user}"


class SignatureRequest(TimeStampedModel):
    """Demande de signature électronique d'un document par un signataire désigné."""

    class Status(models.TextChoices):
        PENDING = "pending", "En attente"
        SIGNED = "signed", "Signé"
        DECLINED = "declined", "Refusé"

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="signature_requests",
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sent_signature_requests",
    )
    signatory = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="signature_requests_to_sign",
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    signed_at = models.DateTimeField(null=True, blank=True)
    comment = models.TextField(blank=True, verbose_name="Commentaire")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Demande de signature"
        verbose_name_plural = "Demandes de signature"

    def __str__(self) -> str:
        return f"Signature de {self.document} par {self.signatory} — {self.get_status_display()}"
