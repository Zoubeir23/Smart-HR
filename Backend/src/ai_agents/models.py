from django.db import models
from django.conf import settings


class CVAnalysis(models.Model):
    """Résultat de l'analyse IA d'un CV lié à une candidature."""

    application = models.OneToOneField(
        'recruitment.Application',
        on_delete=models.CASCADE,
        related_name='cv_analysis',
        verbose_name='Candidature',
    )
    selected = models.BooleanField(
        default=False,
        verbose_name='Sélectionné',
    )
    feedback = models.TextField(
        blank=True,
        verbose_name='Feedback IA',
    )
    matching_skills = models.JSONField(
        default=list,
        verbose_name='Compétences correspondantes',
    )
    missing_skills = models.JSONField(
        default=list,
        verbose_name='Compétences manquantes',
    )
    experience_level = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Niveau d'expérience",
    )
    raw_response = models.JSONField(
        null=True,
        blank=True,
        verbose_name='Réponse brute IA',
    )
    analyzed_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date d\'analyse',
    )

    class Meta:
        verbose_name = 'Analyse CV'
        verbose_name_plural = 'Analyses CV'
        ordering = ['-analyzed_at']

    def __str__(self):
        return f"Analyse CV - {self.application}"


class VoiceSession(models.Model):
    """Session d'interaction avec l'agent vocal RH."""

    VOICE_CHOICES = [
        ('nova', 'Nova (Féminine, douce)'),
        ('alloy', 'Alloy (Neutre, claire)'),
        ('echo', 'Echo (Masculine, posée)'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='voice_sessions',
        verbose_name='Utilisateur',
    )
    query = models.TextField(
        verbose_name='Question posée',
    )
    text_response = models.TextField(
        blank=True,
        verbose_name='Réponse textuelle',
    )
    audio_file = models.FileField(
        upload_to='audio/',
        null=True,
        blank=True,
        verbose_name='Fichier audio',
    )
    voice = models.CharField(
        max_length=20,
        choices=VOICE_CHOICES,
        default='nova',
        verbose_name='Voix utilisée',
    )
    sources = models.JSONField(
        default=list,
        verbose_name='Sources utilisées',
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de création',
    )

    class Meta:
        verbose_name = 'Session vocale'
        verbose_name_plural = 'Sessions vocales'
        ordering = ['-created_at']

    def __str__(self):
        return f"Voice Session {self.pk} - {self.voice}"


class AgentLog(models.Model):
    """Journal des actions effectuées par les agents IA."""

    STATUS_CHOICES = [
        ('success', 'Succès'),
        ('error', 'Erreur'),
        ('fallback', 'Fallback'),
    ]

    agent_type = models.CharField(
        max_length=50,
        verbose_name="Type d'agent",
    )
    action = models.CharField(
        max_length=100,
        verbose_name='Action',
    )
    input_data = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Données d'entrée",
    )
    output_data = models.JSONField(
        null=True,
        blank=True,
        verbose_name='Données de sortie',
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='success',
        verbose_name='Statut',
    )
    error_message = models.TextField(
        blank=True,
        verbose_name="Message d'erreur",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de création',
    )

    class Meta:
        verbose_name = "Log d'agent"
        verbose_name_plural = "Logs d'agents"
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.status}] {self.agent_type} - {self.action}"
