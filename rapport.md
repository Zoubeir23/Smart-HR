# RAPPORT DE MÉMOIRE — Smart-HR
## Contexte et matière première pour la rédaction Word

**Sujet :** Conception et réalisation d'une plateforme de gestion des ressources humaines basée sur l'Intelligence Artificielle
**Étudiant :** IBRAHIMA AMED Zoubeir
**Établissement :** ISI — Institut Supérieur d'Informatique
**Classe :** L3IAGE — Année 2025/2026
**Encadreur :** Abdoulaye GAYE

---

## 1. CONTEXTE ET PROBLÉMATIQUE

### 1.1 Contexte général

La gestion des ressources humaines (GRH) dans les petites et moyennes entreprises (PME) souffre d'un manque structurel d'outils analytiques. Les systèmes existants se limitent à être des "entrepôts de données" passifs : fichiers Excel, logiciels de paie vieillissants, ou progiciels (ERP) trop coûteux et rigides pour les PME. Les responsables RH manquent de visibilité sur les risques de départs et consacrent un temps considérable à des tâches manuelles à faible valeur ajoutée.

### 1.2 Problématique

Comment concevoir et développer une plateforme SIRH (Système d'Information des Ressources Humaines) qui dépasse le simple stockage de données pour devenir un outil **proactif et intelligent**, capable d'anticiper les problèmes RH, d'automatiser les tâches répétitives et d'assister les décideurs via l'Intelligence Artificielle ?

### 1.3 Objectifs du projet

Le projet Smart-HR vise à :

1. **Centraliser** tous les processus RH en une plateforme unique (gestion des employés, congés, présences, paie, documents, formations, tâches, recrutement)
2. **Prédire** les démissions avant qu'elles ne surviennent grâce au Machine Learning
3. **Automatiser** l'analyse et le tri des CV grâce au NLP (Traitement du Langage Naturel)
4. **Assister** les équipes RH via un chatbot conversationnel intelligent
5. **Offrir** une expérience moderne et fluide (SPA React, UX soignée)

---

## 2. PRÉSENTATION DU PRODUIT — Smart-HR

Smart-HR est une solution web de type **SaaS B2B** (Software as a Service Business-to-Business). C'est un SIRH (Système d'Information des Ressources Humaines) de nouvelle génération qui transforme la gestion RH d'une PME en outil proactif.

### 2.1 Ce que Smart-HR fait concrètement (fonctionnalités réalisées)

**Module 1 — Gestion du Personnel**
- Annuaire complet des employés (informations personnelles, CIN, téléphone, adresse)
- Gestion des départements et des postes (avec hiérarchie)
- Profils employés détaillés : contrat, salaire, manager, date d'embauche, historique
- Statuts employés : Actif / Inactif / En congé
- Score de risque de churn affiché directement sur le profil

**Module 2 — Gestion des Congés**
- Demande de congé par l'employé (dates début/fin, motif)
- Workflow de validation : Employé → RH (Approuvé / Refusé)
- Suivi des statuts en temps réel
- Calendrier partagé des absences

**Module 3 — Gestion des Présences**
- Pointage quotidien des employés
- Rapports mensuels de présence
- Historique consultable par rôle

**Module 4 — Gestion de la Paie**
- Enregistrement des salaires mensuels
- Historique des fiches de paie
- Consultation par l'employé de sa propre fiche

**Module 5 — Gestion des Documents**
- Upload sécurisé de documents (contrats, attestations, certificats)
- Organisation par type et par employé
- Permissions par rôle (l'employé ne voit que ses propres documents)
- Stockage objet via MinIO (compatible S3)

**Module 6 — Gestion des Tâches (Kanban)**
- Création et suivi de tâches
- 4 états : À faire → En cours → En revue → Terminée
- Affectation à des employés

**Module 7 — Formations et Réunions**
- Catalogue de formations
- Planification de réunions avec intégration Zoom
- Suivi des participants

**Module 8 — Recrutement**
- Publication d'offres d'emploi par le RH
- Formulaire de candidature pour les candidats (externes)
- Upload de CV au format PDF
- Analyse automatique du CV par Gemini 2.5 Flash (score de matching 0–100)
- Gestion des candidatures avec workflow de statuts
- Suivi de candidature par le candidat

**Module 9 — Prédiction du Churn (IA — Machine Learning)**
- Modèle Random Forest entraîné sur le dataset IBM HR Analytics (1 470 employés, 35 features)
- Calcul d'un score de risque de départ de 0 à 100 %
- Explicabilité : identification de la cause principale du risque
- Ré-entraînement automatique chaque semaine via Celery Beat
- Dashboard dédié avec alertes visuelles

**Module 10 — Chatbot RH (IA — NLP Multi-LLM)**
- Assistant conversationnel avec mémoire de session
- Multi-fournisseur : Google Gemini, OpenAI, Anthropic Claude, Grok
- Actions directes sur la base de données (chercher un employé, créer une demande de congé)
- FAQ RH intégrée avec réponses contextuelles
- Historique des conversations

**Module 11 — Entretien IA Vocal**
- Sessions d'entretien vocal via Vapi (WebRTC)
- Génération de questions selon le poste et le niveau
- Feedback structuré automatique à la fin de l'appel
- Recommandation d'embauche générée par l'IA

---

## 3. ARCHITECTURE TECHNIQUE

### 3.1 Stack technologique

#### Backend
| Technologie | Version | Rôle |
|-------------|---------|------|
| Python | 3.13 | Langage de programmation |
| Django | 6.0.3 | Framework web backend |
| Django REST Framework (DRF) | 3.16 | Construction de l'API REST |
| drf-spectacular | — | Documentation Swagger/OpenAPI automatique |
| PostgreSQL | 15 | Base de données relationnelle principale |
| Redis | 7.2 | Cache + broker de messages pour Celery |
| Celery | 5.0+ | Traitement de tâches asynchrones |
| Celery Beat | — | Planificateur de tâches récurrentes (cron) |
| Scikit-Learn | — | Entraînement du modèle Random Forest (churn) |
| Argon2 | — | Hachage sécurisé des mots de passe |
| MinIO | — | Stockage objet compatible S3 pour les fichiers media |

#### Frontend
| Technologie | Version | Rôle |
|-------------|---------|------|
| React | 18 | Framework UI |
| TypeScript | 5 | Typage statique JavaScript |
| Vite | 5 | Build tool ultra-rapide |
| Tailwind CSS | 3 | Styles utilitaires |
| Axios | — | Client HTTP pour appels API |
| React Router | v6 | Navigation SPA |
| React Query | — | Cache des données serveur côté client |
| Recharts | — | Graphiques dynamiques (dashboard) |

#### Intelligence Artificielle
| Technologie | Rôle |
|-------------|------|
| Google Gemini 2.5 Flash | Analyse de CV, chatbot, entretien IA |
| OpenAI GPT | Chatbot (multi-provider) |
| Anthropic Claude | Chatbot (multi-provider) |
| Grok | Chatbot (multi-provider) |
| Vapi (WebRTC) | Entretien vocal IA en temps réel |
| Scikit-Learn (Random Forest) | Prédiction churn |
| Joblib | Sérialisation du modèle ML |

#### Infrastructure & DevOps
| Technologie | Rôle |
|-------------|------|
| Docker | Conteneurisation des services |
| Docker Compose | Orchestration locale |
| Nginx | Reverse proxy (production) |
| GitHub Actions | CI/CD automatisé |
| Sentry | Monitoring des erreurs en production |

### 3.2 Architecture du système

```
┌──────────────────────────────────────────────────────────┐
│         Frontend  React 18 + TypeScript + Vite           │
│   Pages · Composants · Services Axios · React Query      │
└────────────────────────┬─────────────────────────────────┘
                         │  API REST (JWT)
┌────────────────────────▼─────────────────────────────────┐
│             Backend  Django 6 + DRF                       │
│   users · personnel · conge · presence · paiement        │
│   document · formation · tache · ai · ai_engine          │
│   recruitment · ai_agents                                │
│   Celery Workers  |  Celery Beat (cron hebdo)            │
└──────┬─────────────────────────────────┬─────────────────┘
       │                                 │
┌──────▼───────┐               ┌─────────▼────────┐
│  PostgreSQL  │               │  Redis            │
│  Base de     │               │  Cache + Celery   │
│  données     │               │  Broker           │
└──────────────┘               └──────────────────┘
                                         │
              ┌──────────────────────────▼──────────────────┐
              │  Services IA externes                        │
              │  Gemini 2.5 Flash · OpenAI · Anthropic       │
              │  Grok · Vapi WebRTC                          │
              └─────────────────────────────────────────────┘
```

### 3.3 Structure du projet

```
Smart-HR/
├── Backend/
│   ├── config/                    # Configuration Django
│   │   ├── settings/
│   │   │   ├── base.py            # Configuration commune
│   │   │   ├── local.py           # Développement local
│   │   │   └── production.py      # Production
│   │   └── urls.py                # Routage principal
│   ├── smart_hr/
│   │   ├── core/                  # Modèles partagés (TimeStampedModel, AuditLog)
│   │   ├── users/                 # Auth JWT, OTP email, RBAC (4 rôles)
│   │   ├── personnel/             # Employés, départements, postes
│   │   ├── conge/                 # Demandes et validation de congés
│   │   ├── presence/              # Pointage et présences
│   │   ├── paiement/              # Salaires et fiches de paie
│   │   ├── document/              # Gestion documentaire (MinIO)
│   │   ├── formation/             # Formations et réunions Zoom
│   │   ├── tache/                 # Gestion des tâches Kanban
│   │   ├── recruitment/           # Offres d'emploi, candidatures, CV
│   │   ├── ai/                    # Chatbot multi-LLM, entretien vocal IA
│   │   ├── ai_engine/             # Prédiction churn (Random Forest)
│   │   └── ai_agents/             # Agent vocal RH (FAQ + Gemini)
│   └── tests/
│       └── smart_hr/users/        # Tests unitaires (models, views, forms...)
├── Frontend/
│   └── src/
│       ├── pages/                 # Toutes les pages (40+ pages)
│       ├── components/            # Composants réutilisables
│       ├── services/              # Couche Axios
│       ├── hooks/                 # Custom React hooks
│       ├── context/               # AuthContext, ThemeContext
│       └── types/                 # Types TypeScript
├── nginx/                         # Reverse proxy production
├── docker-compose.yml             # Stack locale
├── docker-compose.production.yml  # Stack production
└── .github/workflows/             # CI/CD (ci.yml, cd.yml)
```

---

## 4. MODÈLE DE DONNÉES (ENTITÉS PRINCIPALES)

### 4.1 Modèle Utilisateur (`User`)

Hérite de `AbstractUser` de Django.

| Champ | Type | Description |
|-------|------|-------------|
| `username` | CharField | Identifiant unique |
| `email` | EmailField | Email (identifiant login) |
| `first_name` | CharField | Prénom |
| `last_name` | CharField | Nom |
| `role` | CharField (choices) | ADMIN / RH / EMPLOYEE / CANDIDATE |
| `tel` | CharField | Numéro de téléphone |
| `is_email_verified` | BooleanField | Email vérifié via OTP |

**Modèle OTPCode :** Code à 6 chiffres pour vérification email, avec expiration (10 min), verrouillage après 5 tentatives échouées, stocké haché.

### 4.2 Modèle Employé (`Employee`)

| Champ | Type | Description |
|-------|------|-------------|
| `user` | OneToOneField → User | Compte utilisateur associé |
| `department` | ForeignKey → Department | Département |
| `position` | ForeignKey → Position | Poste occupé |
| `hire_date` | DateField | Date d'embauche |
| `salary` | DecimalField | Salaire mensuel |
| `status` | CharField | active / inactive / on_leave |
| `date_of_birth` | DateField | Date de naissance |
| `cin` | CharField | Numéro de carte d'identité |
| `churn_risk` | FloatField | Score de risque (0–100) |

### 4.3 Modèle Prédiction Churn (`ChurnPrediction`)

| Champ | Type | Description |
|-------|------|-------------|
| `employee` | ForeignKey → Employee | Employé évalué |
| `risk_score` | FloatField | Score 0–100 |
| `risk_level` | CharField | low / medium / high |
| `factors` | JSONField | Liste des facteurs de risque |
| `recommendations` | JSONField | Recommandations d'action |

### 4.4 Modèle Offre d'Emploi & Candidature

**JobOffer :** titre, département, type (CDI/CDD/stage...), description, exigences, fourchette salariale, statut (ouvert/fermé)

**Application :** lien candidat ↔ offre, fichier CV (PDF), score IA de matching, statut (en attente / en cours de revue / entretien / accepté / rejeté)

### 4.5 Modèle Historique Chat (`ChatHistory`)

Stocke question + réponse du chatbot, avec `action_type` et `action_data` pour les actions exécutées (créer congé, chercher employé, etc.)

---

## 5. SÉCURITÉ ET AUTHENTIFICATION

### 5.1 Mécanismes mis en place

**JWT (JSON Web Token)**
- Access token : validité 30 minutes
- Refresh token : validité 7 jours
- Stockage en cookie HttpOnly (anti-XSS)

**Hachage des mots de passe**
- Argon2 (algorithme le plus sécurisé actuellement recommandé)
- Fallback : PBKDF2, BCrypt

**Vérification email OTP**
- Code à 6 chiffres à usage unique
- Expiration : 10 minutes
- Verrouillage : 15 minutes après 5 tentatives échouées
- Stocké haché (SHA-256)

**RBAC (Role-Based Access Control)**

| Action | Admin | RH | Employé | Candidat |
|--------|-------|-----|---------|----------|
| Voir tous les employés | Oui | Oui | Non | Non |
| Voir son propre profil | Oui | Oui | Oui | Non |
| Valider les congés | Oui | Oui | Non | Non |
| Prédiction churn | Oui | Oui | Non | Non |
| Postuler à une offre | Non | Non | Non | Oui |
| Gestion utilisateurs | Oui | Non | Non | Non |

**Autres mesures**
- CORS configuré (liste blanche des origines autorisées)
- Rate limiting sur les endpoints IA (throttling)
- Logs d'audit (`AuditLog`) pour toutes les actions critiques
- Export RGPD des données personnelles

---

## 6. MODULE IA — PRÉDICTION DU CHURN (MACHINE LEARNING)

### 6.1 Dataset utilisé

**IBM HR Analytics Employee Attrition & Performance** (source : Kaggle)
- 1 470 enregistrements d'employés
- 35 variables (features) : âge, salaire, satisfaction, ancienneté, département, heures supplémentaires, formation, équilibre vie-travail, etc.
- Variable cible : `Attrition` (Yes / No)

### 6.2 Algorithme

**Random Forest Classifier** (scikit-learn)
- Ensemble d'arbres de décision
- Robuste aux données déséquilibrées
- Fournit naturellement une mesure d'importance des variables (feature importance)

### 6.3 Features utilisées pour la prédiction en production

Le modèle déployé utilise les données réelles des employés enregistrées dans Smart-HR :

| Feature | Signification |
|---------|--------------|
| `salary` | Salaire mensuel de l'employé |
| `tenure_years` | Ancienneté (calculée depuis `hire_date`) |
| `status_active` | Statut actif (1) ou non (0) |
| `has_department` | A un département assigné (1 ou 0) |
| `has_position` | A un poste assigné (1 ou 0) |

### 6.4 Explicabilité

Chaque prédiction s'accompagne d'une explication humainement compréhensible :
- "Salaire bas" → si le salaire est inférieur à la médiane
- "Ancienneté faible" → si moins de 2 ans en poste
- "Statut inactif" → si l'employé est marqué inactif
- "Département non assigné" → si aucun département rattaché

### 6.5 Ré-entraînement automatique

Celery Beat déclenche un ré-entraînement hebdomadaire du modèle (`churn_model.pkl`) sur les données actuelles de la base de données PostgreSQL.

---

## 7. MODULE IA — ANALYSE DE CV (NLP)

### 7.1 Fonctionnement

Lors de la soumission d'une candidature :
1. Le candidat uploade son CV en PDF
2. Le backend extrait le texte du PDF
3. Le texte du CV et la description du poste sont envoyés à **Google Gemini 2.5 Flash**
4. Gemini retourne :
   - Un score de matching sémantique (0–100)
   - Les compétences identifiées
   - Les points forts et lacunes par rapport au poste
5. Le score est enregistré sur la candidature et permet de trier les candidats

### 7.2 Avantage vs approche classique

L'approche NLP (compréhension du sens) dépasse la simple recherche de mots-clés. Un CV mentionnant "développement d'applications mobiles" peut matcher une offre cherchant un "développeur Android", même sans le mot exact.

---

## 8. MODULE IA — CHATBOT RH MULTI-LLM

### 8.1 Architecture multi-fournisseur

Le chatbot est conçu pour fonctionner avec plusieurs LLM (Large Language Models) au choix :
- **Google Gemini 2.5 Flash** (défaut, optimisé coût/performance)
- **OpenAI GPT** (alternative)
- **Anthropic Claude** (alternative)
- **Grok** (alternative)

La sélection du fournisseur se fait via la variable d'environnement `LLM_PROVIDER`.

### 8.2 Capacités du chatbot

- Réponses contextuelles aux questions RH courantes
- **Actions directes sur la base de données** : créer une demande de congé, chercher un employé, consulter les présences
- Historique de conversation persisté en base (`ChatHistory`)
- FAQ RH intégrée (réponses instantanées sans appel API pour les questions fréquentes)

---

## 9. MODULE IA — ENTRETIEN VOCAL (NLP + AUDIO)

### 9.1 Fonctionnement

Le module d'entretien vocal repose sur **Vapi** (WebRTC) :
1. Le RH crée une session d'entretien (poste, description, type, durée)
2. Un lien unique est généré et envoyé au candidat
3. Le candidat clique sur le lien et l'entretien vocal démarre directement dans le navigateur
4. L'IA pose des questions adaptées au poste, analyse les réponses en temps réel
5. En fin d'entretien, un feedback structuré est généré :
   - Points forts du candidat
   - Points à améliorer
   - Note globale
   - Recommandation (recruter / ne pas recruter)

### 9.2 Modèles Django associés

- `InterviewSession` : paramètres de la session (poste, questions, statut)
- `InterviewSessionFeedback` : résultats et évaluation par candidat

---

## 10. CI/CD — PIPELINE D'INTÉGRATION CONTINUE

### 10.1 GitHub Actions (CI)

Déclenché à chaque `push` ou `pull request` sur `main` :

1. **Vérification de la qualité du code**
   - Ruff (linter Python)
   - djlint (linter templates Django)
   - pyproject-fmt (formatage pyproject.toml)

2. **Tests automatisés**
   - Tests unitaires Django (`manage.py test`)
   - Tests frontend (Vitest)

3. **Build du frontend**
   - `npm run build`
   - Vérification TypeScript

### 10.2 Pipeline de déploiement (CD)

- Build des images Docker (Backend + Frontend)
- Déploiement vers le VPS via SSH
- Nginx comme reverse proxy
- Certificats SSL Let's Encrypt

---

## 11. PAGES ET INTERFACES RÉALISÉES (FRONTEND)

### 11.1 Authentification
- `LoginPage.tsx` — Connexion par email/mot de passe + JWT
- `RegisterPage.tsx` — Inscription avec vérification email OTP
- `EmailVerificationPage.tsx` — Saisie du code OTP
- `ForgotPasswordPage.tsx` — Demande de réinitialisation
- `ResetPasswordPage.tsx` — Nouveau mot de passe

### 11.2 Dashboards (par rôle)
- `AdminDashboard.tsx` — Vue globale administrative
- `HRDashboard.tsx` — KPIs RH, alertes churn, activité récente
- `EmployeeDashboard.tsx` — Tableau de bord employé (congés, tâches, présence)
- `CandidateDashboard.tsx` — Suivi de candidature

### 11.3 Gestion du Personnel
- `EmployeeListPage.tsx` — Annuaire avec recherche et filtres
- `EmployeeDetailPage.tsx` — Profil complet (infos, contrat, salaire, churn)
- `EmployeeCreatePage.tsx` — Formulaire d'ajout d'un employé
- `DepartmentPage.tsx` — Gestion des départements
- `PositionPage.tsx` — Gestion des postes
- `ContractPage.tsx` — Contrats associés

### 11.4 Autres modules
- `LeaveListPage.tsx` — Congés (demande + validation)
- `AttendancePage.tsx` — Présences
- `PayrollPage.tsx` — Paie
- `DocumentsPage.tsx` — Documents
- `TrainingPage.tsx` — Formations
- `TaskBoardPage.tsx` — Kanban tâches
- `CalendarPage.tsx` — Calendrier global

### 11.5 Recrutement
- `JobOfferListPage.tsx` — Offres publiées
- `ApplyPage.tsx` — Formulaire de candidature (upload CV)
- `ApplicationsManagementPage.tsx` — Gestion des candidatures (RH)
- `ApplicationTrackingPage.tsx` — Suivi candidat

### 11.6 Intelligence Artificielle
- `ChurnDashboardPage.tsx` — Dashboard prédiction churn avec alertes
- `AIChatPage.tsx` — Interface chatbot RH multi-LLM
- `RecruteurIAPage.tsx` — Analyse de CV par IA
- `VoiceAssistantPage.tsx` — Agent vocal (FAQ + Gemini)
- `InterviewLandingPage.tsx` — Landing entretien IA
- `InterviewStartPage.tsx` — Démarrage de l'entretien vocal
- `InterviewCompletedPage.tsx` — Résultats et feedback

### 11.7 Administration & Paramètres
- `UserManagementPage.tsx` — Gestion des comptes utilisateurs (Admin)
- `ProfilePage.tsx` — Profil personnel (lecture seule pour employé)
- `SettingsPage.tsx` — Paramètres généraux
- `SecurityPage.tsx` — Sécurité du compte

---

## 12. TESTS

### 12.1 Tests Backend (Django)

Modules testés (`smart_hr/users/tests/`) :
- `test_models.py` — Tests des modèles Django
- `test_views.py` — Tests des endpoints API
- `test_forms.py` — Tests de validation des formulaires
- `test_admin.py` — Tests de l'interface Django Admin
- `test_urls.py` — Tests de configuration des URLs
- `test_tasks.py` — Tests des tâches Celery

### 12.2 Tests Frontend (Vitest)

- `LoginPage.test.tsx` — Tests de la page de connexion
- `EmployeeCreatePage.test.tsx` — Tests du formulaire de création
- `authNavigation.test.ts` — Tests de navigation authentifiée

---

## 13. DOCUMENTATION API (SWAGGER)

L'API est documentée automatiquement via **drf-spectacular** :
- Interface Swagger UI accessible sur `/api/schema/swagger-ui/`
- Schéma OpenAPI 3.0 disponible sur `/api/schema/`
- Toutes les routes, paramètres, codes de retour et schémas de données sont générés automatiquement

---

## 14. DÉPLOIEMENT

### 14.1 Infrastructure de production

- **Serveur** : VPS Linux
- **Reverse Proxy** : Nginx (SSL, compression, cache statiques)
- **Conteneurs** : Docker Compose (django, postgres, redis, celery, nginx)
- **Stockage fichiers** : MinIO (compatible S3, auto-hébergé)
- **Monitoring** : Sentry (erreurs en production)
- **Emails** : Configuration SMTP (notifications, OTP)

### 14.2 Variables d'environnement critiques

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` | Connexion PostgreSQL |
| `REDIS_URL` | Connexion Redis |
| `GEMINI_API_KEY` | API Google Gemini (IA) |
| `OPENAI_API_KEY` | API OpenAI (chatbot alternatif) |
| `VAPI_API_KEY` | API Vapi (entretien vocal) |
| `SECRET_KEY` | Clé secrète Django |
| `DJANGO_ALLOWED_HOSTS` | Domaines autorisés |
| `MINIO_*` | Configuration stockage objet |

---

## 15. POINTS CLÉS POUR LA RÉDACTION DU MÉMOIRE

### 15.1 Innovation et valeur ajoutée

1. **Churn prédictif** — Aucun SIRH classique du marché africain ne propose cette fonctionnalité. La prédiction proactive des démissions représente un avantage concurrentiel fort.

2. **Architecture multi-LLM** — La flexibilité de changer de fournisseur IA (Gemini, OpenAI, Claude, Grok) sans changer le code applicatif est une décision d'architecture avancée.

3. **Entretien vocal IA** — Le recrutement via entretien vocal automatisé est une feature avant-gardiste qui automatise une partie du processus RH jusqu'ici entièrement humain.

4. **Ré-entraînement continu** — Le modèle churn se ré-entraîne automatiquement chaque semaine sur les données réelles de l'entreprise, s'adaptant à son contexte spécifique.

### 15.2 Défis techniques résolus

1. **Explicabilité de l'IA** — Le système ne se contente pas de donner un score ; il explique le raisonnement (ex: "Salaire bas", "Ancienneté faible"), rendant l'IA compréhensible par les non-techniciens.

2. **Sécurité OTP** — Implémentation complète du verrouillage anti-brute-force avec expiration et stockage haché des codes.

3. **Architecture modulaire** — 13 applications Django indépendantes (apps), permettant une maintenabilité et une évolutivité optimales.

4. **Performances** — Redis comme système de cache, Celery pour les traitements lourds en arrière-plan (évite de bloquer l'interface).

### 15.3 Correspondance avec le sujet de mémoire

Le sujet demande : "Conception et réalisation d'une plateforme de GRH basée sur l'IA"

Smart-HR y répond sur tous les axes :
- **Conception** : Architecture micro-services, modélisation UML, matrice RBAC, pipeline CI/CD
- **Réalisation** : Code produit et déployé (Backend Django + Frontend React)
- **GRH** : 11 modules couvrant l'intégralité du cycle de vie RH
- **IA** : 3 modules IA distincts (ML classique churn, NLP analyse CV, LLM chatbot + vocal)

### 15.4 Chiffres clés à mentionner

- **13 applications Django** déployées
- **40+ pages React** développées
- **4 rôles utilisateurs** avec permissions granulaires
- **1 470 employés** dans le dataset d'entraînement du modèle churn
- **35 features** dans le dataset IBM HR Analytics
- **4 fournisseurs LLM** supportés (Gemini, OpenAI, Claude, Grok)
- **2 pipelines CI/CD** (ci.yml + cd.yml sur GitHub Actions)
- **5 services Docker** en production (django, postgres, redis, celery, nginx)

---

## 16. Plan détaillé du rapport de stage de licence

``` 
Pages liminaires
 - Page de couverture
 - Dédicace
 - Remerciements
 - Avant-propos
 - Sommaire
 - Glossaire
 - Liste des figures
 - Liste des tableaux
 - Résumé / Abstract
 
Chapitre 1 : Introduction Générale (6 pages max)
 1.1 Contexte
 1.2 Sujet du projet de fin de cycle
 1.3 Objectifs du projet de fin de cycle
 
Chapitre 2 : Travaux réalisés (22 pages max)
 2.1 Liste des travaux réalisés
   2.1.1 Travail N°1 : Spécification des besoins
     2.1.1.1 Besoins fonctionnels
     2.1.1.2 Besoins non fonctionnels
   2.1.2 Travail N°2 : Conception et modélisation
     2.1.2.1 Choix du langage de modélisation UML
     2.1.2.2 Diagramme de cas d'utilisation
             [inclut : contexte + vues par acteur + module recrutement + IA]
     2.1.2.3 Diagramme de classes
   2.1.3 Travail N°3 : Design et ergonomie des IHM
   2.1.4 Travail N°4 : Implémentation
     2.1.4.1 Environnement technique
       2.1.4.1.1 Outils utilisés
       2.1.4.1.2 Technologies utilisées
     2.1.4.2 Réalisation des travaux applicatifs
       - Création de la base de données
       - Développement des modules IA (Churn, NLP, Chatbot)
       - Gestion des employés (CRUD)
       - Gestion des congés
       - Gestion de la paie
       - Module recrutement
   2.1.5 Travail N°5 : Déploiement de la solution
         [Docker + CI/CD GitHub Actions + Dokploy]
 
Chapitre 3 : Conclusion — Bilan (2 pages)
 3.1 Vérification des objectifs
   3.1.1 Objectif N°1 — Socle RH : Atteint
   3.1.2 Objectif N°2 — Agent Churn ML : Atteint
   3.1.3 Objectif N°3 — Recrutement NLP : Atteint
   3.1.4 Objectif N°4 — Chatbot RH : Atteint
 3.2 Intérêts
   3.2.1 Intérêt personnel
   3.2.2 Intérêt pour l'entreprise
 
Pages finales
 - Bibliographie
 - Webographie
 - Table des matières
 
```

---

*Ce fichier est une base de travail pour la rédaction du rapport de mémoire. Il recense fidèlement ce qui a été conçu et réalisé dans le projet Smart-HR.*
