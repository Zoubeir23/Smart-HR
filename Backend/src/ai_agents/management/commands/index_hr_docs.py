"""
Management command to index HR FAQ documents into the Qdrant vector store.

Usage:
    python manage.py index_hr_docs
"""

from django.core.management.base import BaseCommand

from ai_agents.voice_agent.services import get_vector_store


# ---------------------------------------------------------------------------
# HR FAQ Documents (French)
# ---------------------------------------------------------------------------

HR_FAQ_DOCUMENTS: list[dict] = [
    # --- Conges ---
    {
        "title": "Types de conges disponibles",
        "content": (
            "Smart-HR propose plusieurs types de conges pour les employes. "
            "Le conge annuel est de 24 jours ouvrables par an, acquis a raison de 2 jours par mois travaille. "
            "Les conges maladie sont accordes sur presentation d'un certificat medical valide.\n\n"
            "D'autres types de conges sont egalement disponibles : conge de maternite (14 semaines), "
            "conge de paternite (3 jours), conge pour evenement familial (mariage, deces), "
            "et conge sans solde sur approbation du responsable RH. "
            "Chaque type de conge possede ses propres regles de calcul et de validation."
        ),
        "source": "FAQ Smart-HR",
    },
    {
        "title": "Procedure de demande de conge",
        "content": (
            "Pour poser un conge, l'employe doit se connecter a Smart-HR et acceder au module Conges. "
            "Il selectionne les dates de debut et de fin, le type de conge souhaite, "
            "et peut ajouter un motif ou commentaire.\n\n"
            "La demande est ensuite transmise au responsable RH pour validation. "
            "Le responsable peut approuver ou refuser la demande avec un commentaire. "
            "L'employe recoit une notification par email une fois la decision prise. "
            "Le delai de traitement est generalement de 48 heures ouvrables."
        ),
        "source": "FAQ Smart-HR",
    },
    {
        "title": "Solde de conges et compteur",
        "content": (
            "Chaque employe dispose d'un solde de conges visible dans son espace personnel Smart-HR. "
            "Le compteur se met a jour automatiquement apres chaque validation de conge.\n\n"
            "Les conges non pris peuvent etre reportes sur l'annee suivante dans la limite de 5 jours. "
            "Au-dela, les jours non utilises sont perdus sauf accord exceptionnel de la direction. "
            "Le solde est recalcule au 1er janvier de chaque annee."
        ),
        "source": "FAQ Smart-HR",
    },
    # --- Recrutement ---
    {
        "title": "Processus de recrutement",
        "content": (
            "Le processus de recrutement chez Smart-HR se deroule en plusieurs etapes. "
            "Le responsable RH publie une offre d'emploi avec la description du poste, "
            "les competences requises et le type de contrat.\n\n"
            "Les candidats externes peuvent consulter les offres, creer un compte sur la plateforme, "
            "et postuler en ligne en joignant leur CV au format PDF. "
            "L'agent IA de recrutement analyse automatiquement les CVs et attribue un score de matching "
            "base sur les competences, l'experience et la formation du candidat."
        ),
        "source": "FAQ Smart-HR",
    },
    {
        "title": "Documents requis pour postuler",
        "content": (
            "Pour soumettre une candidature sur Smart-HR, les documents suivants sont necessaires : "
            "un curriculum vitae (CV) au format PDF, une lettre de motivation (optionnelle mais recommandee), "
            "et une copie de la piece d'identite.\n\n"
            "Des documents supplementaires peuvent etre demandes selon le poste : "
            "diplomes, certificats de travail, lettres de recommandation. "
            "Tous les fichiers sont stockes de maniere securisee et conformement a la reglementation "
            "en vigueur sur la protection des donnees personnelles."
        ),
        "source": "FAQ Smart-HR",
    },
    {
        "title": "Suivi de candidature",
        "content": (
            "Apres avoir postule, le candidat peut suivre l'avancement de sa candidature "
            "directement depuis son espace personnel Smart-HR. "
            "Les statuts possibles sont : Soumise, En cours d'analyse, Entretien planifie, "
            "Acceptee ou Rejetee.\n\n"
            "Des notifications par email sont envoyees a chaque changement de statut. "
            "En cas de selection, un entretien est automatiquement planifie via Zoom "
            "et le candidat recoit un lien de connexion par email."
        ),
        "source": "FAQ Smart-HR",
    },
    # --- Paie ---
    {
        "title": "Calendrier de paie",
        "content": (
            "Les salaires sont verses le 25 de chaque mois par virement bancaire. "
            "Si le 25 tombe un week-end ou jour ferie, le virement est effectue le jour ouvrable precedent.\n\n"
            "Le bulletin de paie est disponible dans l'espace personnel de l'employe "
            "sur Smart-HR, sous l'onglet Paiements. "
            "Il detaille le salaire brut, les cotisations sociales, les primes eventuelles "
            "et le net a payer. L'historique complet des bulletins est consultable a tout moment."
        ),
        "source": "FAQ Smart-HR",
    },
    {
        "title": "Bulletin de paie et contestation",
        "content": (
            "Chaque employe recoit un bulletin de paie electronique accessible via Smart-HR. "
            "Le bulletin est genere automatiquement et peut etre telecharge au format PDF.\n\n"
            "En cas d'erreur ou de contestation, l'employe doit contacter le service RH "
            "dans un delai de 30 jours suivant la date de versement. "
            "Un formulaire de reclamation est disponible dans la section Documents. "
            "Le traitement de la reclamation prend en moyenne 5 jours ouvrables."
        ),
        "source": "FAQ Smart-HR",
    },
    # --- Formation ---
    {
        "title": "Formations et developpement professionnel",
        "content": (
            "Smart-HR permet de gerer le catalogue de formations internes et externes. "
            "Les employes peuvent consulter les formations disponibles et s'y inscrire "
            "depuis leur espace personnel.\n\n"
            "Le responsable RH planifie les sessions de formation, definit les objectifs "
            "et suit la participation. Des reunions de suivi peuvent etre organisees via Zoom. "
            "Un certificat de completion est delivre a la fin de chaque formation validee. "
            "Le plan de formation annuel est defini en debut d'annee en accord avec les managers."
        ),
        "source": "FAQ Smart-HR",
    },
    # --- Reglement interieur ---
    {
        "title": "Reglement interieur et code de conduite",
        "content": (
            "Le reglement interieur de l'entreprise est accessible via Smart-HR dans la section Documents. "
            "Il couvre les horaires de travail (8h00-17h00 avec 1 heure de pause dejeuner), "
            "le code vestimentaire, et les regles de conduite professionnelle.\n\n"
            "Tout manquement au reglement peut entrainer des sanctions disciplinaires allant "
            "de l'avertissement ecrit a la mise a pied. "
            "Les employes sont tenus de signer electroniquement le reglement lors de leur integration. "
            "Toute modification est communiquee par email et mise a jour dans Smart-HR."
        ),
        "source": "FAQ Smart-HR",
    },
    # --- Avantages sociaux ---
    {
        "title": "Avantages sociaux et mutuelles",
        "content": (
            "L'entreprise offre plusieurs avantages sociaux a ses employes. "
            "Une mutuelle sante est proposee avec une prise en charge de 60 pourcent par l'employeur. "
            "Les employes beneficient egalement de tickets restaurant d'une valeur de 5000 FCFA par jour.\n\n"
            "D'autres avantages incluent : prime de transport, prime d'anciennete (a partir de 3 ans), "
            "et prime de fin d'annee (13eme mois sous conditions). "
            "Les details de chaque avantage sont consultables dans la section Profil de Smart-HR."
        ),
        "source": "FAQ Smart-HR",
    },
    # --- Onboarding ---
    {
        "title": "Procedure d'onboarding des nouveaux employes",
        "content": (
            "L'onboarding d'un nouvel employe suit un processus structure sur Smart-HR. "
            "Le premier jour, le collaborateur recoit ses identifiants de connexion, "
            "un kit d'accueil numerique et un planning d'integration sur 2 semaines.\n\n"
            "Le processus inclut : presentation de l'equipe, visite des locaux, "
            "formation aux outils internes (Smart-HR, messagerie, outils metier), "
            "et un entretien avec le manager a J+7 et J+30. "
            "Un parrain ou tuteur est designe pour accompagner le nouveau collaborateur."
        ),
        "source": "FAQ Smart-HR",
    },
    # --- Evaluation de performance ---
    {
        "title": "Evaluation de performance annuelle",
        "content": (
            "Les evaluations de performance sont realisees une fois par an, "
            "generalement entre novembre et decembre. Chaque employe remplit une auto-evaluation "
            "puis participe a un entretien individuel avec son manager.\n\n"
            "L'evaluation porte sur les objectifs atteints, les competences developpees, "
            "le comportement professionnel et les perspectives d'evolution. "
            "Les resultats sont enregistres dans Smart-HR et accessibles a l'employe. "
            "Ils servent de base pour les augmentations salariales et les promotions."
        ),
        "source": "FAQ Smart-HR",
    },
    # --- Teletravail ---
    {
        "title": "Politique de teletravail",
        "content": (
            "L'entreprise autorise le teletravail jusqu'a 2 jours par semaine, "
            "sous reserve de l'accord du manager et de la nature du poste. "
            "La demande de teletravail se fait via Smart-HR dans la section Presences.\n\n"
            "Le collaborateur doit disposer d'un environnement de travail adapte "
            "et d'une connexion internet stable. Les jours de teletravail doivent etre "
            "declares a l'avance dans le planning. "
            "Les reunions d'equipe et les formations restent en presentiel sauf indication contraire."
        ),
        "source": "FAQ Smart-HR",
    },
    # --- Heures supplementaires ---
    {
        "title": "Heures supplementaires et compensation",
        "content": (
            "Les heures supplementaires doivent etre prealablement autorisees par le manager "
            "et declarees dans Smart-HR via le module Presences. "
            "Elles sont majorees de 25 pourcent pour les 8 premieres heures "
            "et de 50 pourcent au-dela.\n\n"
            "Les heures supplementaires effectuees le dimanche ou un jour ferie "
            "sont majorees de 100 pourcent. "
            "Le paiement est effectue le mois suivant avec le salaire habituel. "
            "Un employe ne peut depasser 20 heures supplementaires par mois "
            "sauf autorisation exceptionnelle de la direction."
        ),
        "source": "FAQ Smart-HR",
    },
    # --- Demission et depart ---
    {
        "title": "Procedure de demission et depart",
        "content": (
            "Un employe souhaitant demissionner doit adresser une lettre de demission "
            "a son manager et au service RH. Le preavis est de 1 mois pour les employes "
            "et de 3 mois pour les cadres.\n\n"
            "Pendant le preavis, l'employe continue d'exercer ses fonctions normalement. "
            "A la fin du contrat, un solde de tout compte est etabli incluant les conges non pris, "
            "les primes au prorata et l'indemnite de fin de contrat le cas echeant. "
            "Un certificat de travail et une attestation de travail sont delivres automatiquement."
        ),
        "source": "FAQ Smart-HR",
    },
]


class Command(BaseCommand):
    help = "Index HR FAQ documents into the Qdrant vector store for the voice agent."

    def handle(self, *args, **options):
        self.stdout.write("Starting HR document indexing...\n")

        vector_store = get_vector_store()

        if vector_store.client is None:
            self.stderr.write(
                self.style.ERROR(
                    "Qdrant client is not available. "
                    "Install qdrant-client: pip install qdrant-client"
                )
            )
            return

        if vector_store.embedding_model is None:
            self.stderr.write(
                self.style.ERROR(
                    "FastEmbed is not available. "
                    "Install fastembed: pip install fastembed"
                )
            )
            return

        self.stdout.write("Setting up Qdrant collection...\n")
        ok = vector_store.setup_collection()
        if not ok:
            self.stderr.write(self.style.ERROR("Failed to setup Qdrant collection."))
            return

        self.stdout.write(f"Indexing {len(HR_FAQ_DOCUMENTS)} documents...\n")
        count = vector_store.store_documents(HR_FAQ_DOCUMENTS)

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully indexed {count} HR FAQ documents into Qdrant."
            )
        )
