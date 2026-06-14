## 📘 CAHIER DES CHARGES : SMART-HR

**Version :** 1.1

**Date :** Février 2026

**Type :** SaaS B2B / SIRH Intelligent

**Responsable :** [Ton Nom]

---

## 1. CONTEXTE ET VISION

### 1.1 Contexte

La gestion des ressources humaines (GRH) dans les PME souffre d'un manque d'outils analytiques. Les systèmes actuels sont des "dépôts de données" passifs (fichiers Excel, logiciels de paie vieillissants). Les décideurs RH manquent de visibilité sur les risques de départs (turnover) et perdent un temps considérable sur le tri manuel des CVs.

### 1.2 Vision Produit

**Smart-HR** ambitionne de transformer le SIRH en un outil **proactif**. En intégrant l'Intelligence Artificielle (Machine Learning et NLP) au cœur des processus, l'application ne se contente pas de stocker la donnée, elle l'analyse pour :

1. **Anticiper** les démissions avant qu'elles ne surviennent.
2. **Automatiser** la pré-sélection des candidats.
3. **Améliorer** le bien-être employé par une interface moderne.

---

## 2. OBJECTIFS DU PROJET

### 2.1 Objectifs Business

- **Réduire le Churn :** Identifier 80% des employés à risque grâce au modèle prédictif.
- **Gain de Productivité :** Réduire de 40% le temps administratif RH (validation congés, tri CV).
- **Expérience Utilisateur :** Offrir un temps de réponse < 200ms et une UX fluide (SPA).

### 2.2 Objectifs Techniques

- Mettre en place une **Architecture Micro-Services Découplée** (React / Django).
- Assurer une couverture de **Tests Unitaires > 70%**.
- Industrialiser le déploiement via **Docker et CI/CD**.

---

## 3. PERSONAS (UTILISATEURS CIBLES)

| **Acteur** | **Rôle** | **Besoins Clés** |
| --- | --- | --- |
| **L'Admin Système** | Superviseur Tech | Configurer les accès, voir les logs, assurer la sécurité. |
| **Le Responsable RH** | Décideur | Dashboard vue d'ensemble, Alertes Churn, Validation congés, Recrutement. |
| **L'Employé** | Utilisateur Final | Poser ses congés, voir son profil, accès mobile simple. |
| **Le Candidat** | Externe | Postuler simplement, uploader un CV, suivre sa candidature. |

---

### 3.1 Détails des Utilisations par Rôle

#### 👷 L'Employé (Utilisateur Final)

**Besoins :** Accès simple, autonomie sur ses données personnelles

**Tâches autorisées :**

- Se connecter / Se déconnecter
- Consulter son profil personnel (informations, contrat, salaire)
- Poser des demandes de congés et suivre leur statut
- Voir l'historique de ses évaluations de performance
- Consulter les offres d'emploi internes
- Accès mobile simple

**Restrictions :**

- ❌ Voir les profils des autres employés
- ❌ Valider des congés
- ❌ Accéder aux outils d'analyse IA
- ❌ Voir les CVs des candidats

---

#### 👔 Le Responsable RH (Décideur)

**Besoins :** Vue d'ensemble, outils de décision, gestion du personnel

**Tâches autorisées :**

- Voir tous les employés (annuaire complet avec recherche et filtres)
- Consulter tous les profils détaillés (contrats, salaires, historiques)
- Dashboard analytique avec graphiques (pyramide des âges, taux de rétention, KPIs)
- Valider ou refuser les demandes de congés
- **Utiliser l'IA pour prédire le churn** (identifier les employés à risque de départ)
- **Gérer le recrutement :**
    - Publier des offres d'emploi
    - Consulter les candidatures et CVs
    - Utiliser le matching automatique CV/Offre (IA)
- Ajouter de nouveaux employés au système
- Poser ses propres congés

---

#### 👑 L'Admin Système (Superviseur Tech)

**Besoins :** Contrôle total, sécurité, configuration

**Tâches autorisées :**

- **Toutes les fonctionnalités du RH** +
- Gérer les utilisateurs (créer, modifier, supprimer des comptes)
- Configurer les accès et permissions (RBAC)
- Voir les logs système et historiques d'actions
- Assurer la sécurité de la plateforme
- Configuration globale de l'application
- Gestion des paramètres avancés

---

#### 👤 Le Candidat (Externe)

**Besoins :** Postuler facilement, suivre sa candidature

**Tâches autorisées :**

- S'inscrire sur la plateforme (création de compte)
- Consulter les offres d'emploi publiées
- Postuler à une offre
- Uploader son CV (format PDF)
- Suivre le statut de sa candidature

**Restrictions :**

- ❌ Accéder aux données internes de l'entreprise
- ❌ Voir les employés
- ❌ Poser des congés
- ❌ Accéder au dashboard RH

---

## 4. PÉRIMÈTRE FONCTIONNEL (SCOPE)

### 4.1 Module Authentification & Sécurité (Core)

- Login / Logout (JWT : Access & Refresh Tokens).
- **SSO (Social Login) :** Authentification via Google OAuth2.
- Gestion des rôles (RBAC) : Admin, RH, Employé, Candidat.
- Protection des routes (Frontend ProtectedRoute & Backend Permissions).

### 4.2 Module Gestion Administrative (RH & Employés)

#### Fonctionnalités Core (Système Django existant)

**1. Gestion du Personnel** 👥

- Informations complètes des employés (nom, prénom, téléphone, CIN)
- Services et départements
- Fonctions/postes des employés
- Responsables de service
- Annuaire avec recherche et filtres avancés

**2. Gestion des Congés** 🏖️

- Demandes de congés (dates début/fin, motifs)
- Workflow : Employé → Validation/Refus RH
- Suivi des soldes de congés

**3. Gestion des Tâches** ✅

- Création et suivi des tâches
- États : À faire, En cours, En revue, Terminée
- Mise à jour des statuts en temps réel

**4. Gestion des Présences** 📅

- Suivi quotidien de la présence des employés
- Historique et reporting

**5. Gestion des Paiements** 💰

- Suivi des salaires et paiements
- Historique de paie

**6. Gestion des Documents** 📄

- Stockage sécurisé de documents liés au personnel
- Contrats, attestations, certificats

**7. Formations et Réunions** 🎓

- Organisation de formations
- Planification de meetings (avec intégration Zoom)

**8. Profils Employés**

- Vue détaillée (Infos perso, contrat, salaire, manager)
- Performance : Historique des évaluations annuelles

### 4.3 Module Intelligence Artificielle (Les "Killer Features")

#### 4.3.1 Churn Prediction (ML Classique)

- **Entraînement d'un modèle (Random Forest) sur le dataset IBM HR.**
- **Calcul du score de risque (0-100%) en temps réel ou batch.**
- **Explicabilité : Affichage de la raison principale (ex: "Salaire bas").**

#### 4.3.2 Agent de Recrutement Multi-Agents 🤖

**Source :** GitHub - Shubhamsaboo/awesome-llm-apps (Licence Apache 2.0)

**Capacités principales :**

- ✅ **Analyse de CV (PDF)** : Extraction automatique des compétences, expériences, formations
- ✅ **Matching Intelligent** : Comparaison CV vs profil de poste avec scoring IA
- ✅ **Gestion d'entretiens** : Création automatique de réunions Zoom
- ✅ **Communication automatisée** : Emails de confirmation, rejet, invitation
- ✅ **Évaluation des candidats** : Notation automatique basée sur critères définis

**Architecture Agent :**

```python
# 3 Agents spécialisés
resume_analyzer = Agent(
    name="Resume Analyzer",
    role="Analyser les CVs et extraire les informations clés"
)

scheduler_agent = Agent(
    name="Interview Scheduler",
    role="Planifier les entretiens via Zoom"
)

email_agent = Agent(
    name="Communication Agent",
    role="Gérer la communication avec les candidats"
)
```

**Intégration :** API REST FastAPI ou import direct dans Django

#### 4.3.3 Agent Vocal Multi-Agents 🎙️

**Source :** Customer Support Voice Agent (awesome-llm-apps)

**Cas d'usage RH :**

- 🎤 **Assistant vocal pour candidats** : Réponses vocales aux questions sur le processus
- 🎤 **Briefing d'entretien** : Guide vocal avant les entretiens
- 🎤 **Onboarding vocal** : Présentation de l'entreprise pour nouveaux employés
- 🎤 **FAQ RH vocale** : Réponses automatiques (congés, formation, avantages)

**Voix disponibles :**

- **nova** (Féminine, douce) : Onboarding, support candidat
- **alloy** (Neutre, claire) : FAQ, procédures
- **echo** (Masculine, posée) : Briefing entretien

**Architecture :**

```python
processor_agent = Agent(
    name="HR Documentation Processor",
    instructions="Analyser la documentation RH et répondre clairement"
)

tts_agent = Agent(
    name="Text-to-Speech Agent",
    instructions="Convertir les réponses en parole naturelle"
)
```

#### 4.3.4 Assistant Conversationnel IA (GenAI) 💬

- **Modèle :** Google Gemini 2.5 Flash (défaut) / OpenAI / Claude / Grok (multi-provider)
- **Fonctionnalités :**
    - Chat intelligent sur les données RH
    - Réponses contextuelles (personnels, congés, tâches)
    - Support multilingue

### 4.4 Module Recrutement (Espace Candidat)

- Publication d'offres d'emploi (RH).
- Formulaire de candidature externe (Candidat).
- Upload de fichiers (Stockage Cloud).

### 4.5 Module Dashboard (Data Viz)

- Graphiques dynamiques (Recharts) : Pyramide des âges, Taux de rétention, Salaires.
- KPIs en temps réel.

---

## 5. ARCHITECTURE TECHNIQUE

### 5.1 Stack Technologique

#### Core Application

- **Frontend :** React 18, Vite 5, Tailwind CSS, Axios, Recharts, Framer Motion, React Router v6.
- **Backend :** Python 3.10, Django 5, Django REST Framework (DRF).
- **Database :** PostgreSQL 15 (local et production).
- **AI/ML :** Scikit-Learn, Pandas, Numpy.
- **DevOps :** Docker, Docker Compose, GitHub Actions.

#### Agents IA intégrés (Django - `src/ai_agents/`)

- **Agent de Recrutement :**
    - PyPDF2 (parsing CV)
    - OpenAI / Gemini (analyse intelligente)
    - Zoom API (planification entretiens)
    - Gmail (emails automatisés)
- **Agent Vocal :**
    - Qdrant (base vectorielle)
    - FastEmbed (embeddings)
    - Firecrawl (optionnel : indexation docs depuis URL)
    - OpenAI TTS (text-to-speech)
- **Assistant IA Conversationnel :** Google Gemini 2.5 Flash (défaut) — multi-provider (OpenAI, Claude, Grok)

#### Démos de référence (`Backend/reference_agents/`)

- Démos Streamlit **standalone** (non intégrées à Django) : `ai_recruitment_agent_team`, `customer_support_voice_agent`
- Frameworks : Phidata, Agno (dépendances propres à chaque démo)
- Utilisation : référence et apprentissage ; lancer séparément avec `streamlit run`

### 5.2 Architecture d'Intégration

**Approche Modulaire Micro-Services**

```jsx
┌─────────────────────────────────────────────────────────┐
│                FRONTEND (React + Vite)                  │
│  - Interface Utilisateur Unifiée                        │
│  - Dashboard, Gestion RH, Recrutement                   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              API GATEWAY (Django REST)                  │
│  - Routage des requêtes                                 │
│  - Authentification JWT                                 │
└───┬─────────────┬──────────────┬────────────────┬───────┘
    │             │              │                │
    ▼             ▼              ▼                ▼
┌────────┐  ┌──────────┐  ┌─────────────┐  ┌──────────┐
│ Django │  │  Agent   │  │   Agent     │  │  Agent   │
│  Core  │  │Recrutement│ │   Vocal     │  │   IA     │
│  RH    │  │ (ai_agents)│ │ (ai_agents) │  │(Gemini)  │
└────────┘  └──────────┘  └─────────────┘  └──────────┘
    │             │              │                │
    ▼             ▼              ▼                ▼
┌─────────┐  ┌─────────┐  ┌──────────┐   ┌──────────┐
│PostgreSQL│  │  Zoom   │  │  Qdrant  │   │  Gemini  │
│  Local   │  │   API   │  │   OSS    │   │  API     │
│  & Prod  │  │         │  │  Vector  │   │ 2.5Flash│
└─────────┘  └─────────┘  └──────────┘   └──────────┘
```

#### 5.2.1 Utilisation des agents en production

Les agents sont utilisés **automatiquement** lorsque le Frontend et le Backend sont lancés :

1. L'utilisateur (RH, Admin) interagit via l'interface React.
2. Le Frontend appelle les API Django (ex. `POST /api/agents/voice/ask/`, `POST /api/agents/recruitment/analyze-resume/`).
3. Django exécute les agents dans `src/ai_agents/` qui utilisent les clés API (`.env` : `OPENAI_API_KEY`, `GEMINI_API_KEY`, etc.).
4. La réponse est renvoyée au Frontend et affichée.

**Important :** Le dossier `Backend/reference_agents/` contient des démos Streamlit **standalone** (ai_recruitment_agent_team, customer_support_voice_agent). Elles ne font pas partie du flux normal et nécessitent un venv dédié avec leurs propres dépendances (agno, phidata, streamlit). Elles servent de référence pour comprendre les concepts.

### 5.3 Arborescence du Projet (Approche Progressive)

<aside>
🎯

**Stratégie d'implémentation :** Démarrer avec le système Django existant (structure éprouvée), puis greffer progressivement les agents IA multi-agents.

</aside>

#### Arborescence Backend Complète et Unifiée

<aside>
✅

**Architecture monolithique modulaire :** Tous les modules (apps Django classiques + agents IA) sont intégrés dans un seul backend Django pour faciliter le développement, le déploiement et la maintenance.

</aside>

```python
gestion_rh_django/          # 📁 RACINE DU PROJET
│
├── .gitignore              # Git ignore
├── .vscode/                # Configuration VS Code
├── README.md               # Documentation du projet
├── requirements.txt        # Dépendances Python globales
│                           # Django, DRF, OpenAI, qdrant-client, fastembed, PyPDF2
├── .env                    # 🔴 VARIABLES D'ENVIRONNEMENT
│                           # API Keys: OpenAI, Gemini, Zoom, Gmail, Google OAuth2
│                           # Qdrant (voice agent), FIRECRAWL_API_KEY (optionnel)
│                           # DB: PostgreSQL (DATABASE_URL)
│
├── src/                    # 📂 CODE SOURCE PRINCIPAL (BACKEND DJANGO)
    │
    ├── manage.py           # 🔧 Script Django de gestion du projet
    │
    ├── gestion_taches/     # ⚙️ [CONFIG] CONFIGURATION PRINCIPALE DJANGO
    │   ├── __init__.py
    │   ├── settings.py     # Config: DB (PostgreSQL), CORS, JWT + OAuth2, INSTALLED_APPS
    │   ├── urls.py         # 🌐 Routage principal (inclut toutes les apps)
    │   ├── wsgi.py         # WSGI pour serveurs web
    │   └── asgi.py         # ASGI pour WebSockets (futur)
    │
    ├── utilisateur/        # 🔐 [APP 1] AUTHENTIFICATION & UTILISATEURS
    │   ├── migrations/     # Migrations de la base de données
    │   ├── __init__.py
    │   ├── models.py       # Modèle: Utilisateur (4 rôles: Admin, RH, Employé, Candidat)
    │   ├── serializers.py  # JWT Token, Login/Register
    │   ├── views.py        # Auth endpoints (login, logout, register)
    │   ├── admin.py        # Django Admin pour gestion utilisateurs
    │   └── urls.py         # Routes: /api/auth/
    │
    ├── personnel/          # 👥 [APP 2] GESTION DU PERSONNEL
    │   ├── migrations/
    │   ├── __init__.py
    │   ├── models.py       # Modèles: Personnel, Service, Fonction
    │   ├── serializers.py  # Serializers DRF pour API REST
    │   ├── views.py        # CRUD Personnel (avec permissions RBAC)
    │   ├── admin.py        # Interface Django Admin
    │   └── urls.py         # Routes: /api/personnel/
    │
    ├── conge/              # 🏖️ [APP 3] GESTION DES CONGÉS
    │   ├── migrations/
    │   ├── __init__.py
    │   ├── models.py       # Modèle: Conge (demande, validation, dates)
    │   ├── serializers.py
    │   ├── views.py        # Workflow: Demande → Validation RH
    │   ├── admin.py
    │   └── urls.py         # Routes: /api/conge/
    │
    ├── tache/              # ✅ [APP 4] GESTION DES TÂCHES
    │   ├── migrations/
    │   ├── __init__.py
    │   ├── models.py       # Modèle: Tache (statuts: À faire, En cours, En revue, Terminée)
    │   ├── serializers.py
    │   ├── views.py        # CRUD + Mise à jour statuts
    │   ├── admin.py
    │   └── urls.py         # Routes: /api/tache/
    │
    ├── presence/           # 📅 [APP 5] GESTION DES PRÉSENCES
    │   ├── migrations/
    │   ├── __init__.py
    │   ├── models.py       # Modèle: Presence (date, employé, statut)
    │   ├── serializers.py
    │   ├── views.py        # Pointage + Reporting
    │   ├── admin.py
    │   └── urls.py         # Routes: /api/presence/
    │
    ├── paiement/           # 💰 [APP 6] GESTION DES PAIEMENTS
    │   ├── migrations/
    │   ├── __init__.py
    │   ├── models.py       # Modèle: Paiement (salaire, mois, employé)
    │   ├── serializers.py
    │   ├── views.py        # Historique paie + Fiches
    │   ├── admin.py
    │   └── urls.py         # Routes: /api/paiement/
    │
    ├── document/           # 📄 [APP 7] GESTION DES DOCUMENTS
    │   ├── migrations/
    │   ├── __init__.py
    │   ├── models.py       # Modèle: Document (fichier, type, employé)
    │   ├── serializers.py
    │   ├── views.py        # Upload/Download sécurisé
    │   ├── views_filemanager.py  # Gestionnaire de fichiers avancé
    │   ├── admin.py
    │   └── urls.py         # Routes: /api/document/
    │
    ├── formation/          # 🎓 [APP 8] FORMATIONS & RÉUNIONS
    │   ├── migrations/
    │   ├── __init__.py
    │   ├── models.py       # Modèles: Formation, Meeting, ZoomToken
    │   ├── serializers.py
    │   ├── views.py        # Intégration Zoom API
    │   ├── admin.py
    │   └── urls.py         # Routes: /api/formation/
    │
    ├── ai/                 # 🤖 [APP 9] ASSISTANT IA CONVERSATIONNEL
    │   ├── migrations/
    │   ├── __init__.py
    │   ├── models.py       # Historique conversations (ChatHistory)
    │   ├── train.py        # Contexte/prompt pour l'IA Google Gemini (multi-provider) ou Gemini
    │   ├── views.py        # Endpoints API: /api/chat/
    │   ├── serializers.py  # Serializers pour conversations
    │   ├── admin.py
    │   └── urls.py         # Routes: /api/chat/
    │
    ├── recruitment/        # 🎯 [APP 10] MODULE RECRUTEMENT
    │   ├── migrations/
    │   ├── __init__.py
    │   ├── models.py       # Modèles: JobOffer, Application, Candidature
    │   ├── serializers.py
    │   ├── views.py        # Offres + Candidatures + Upload CV
    │   ├── admin.py
    │   └── urls.py         # Routes: /api/recruitment/
    │
    ├── ai_engine/          # 🧠 [APP 11] IA ML CLASSIQUE - Churn Prediction
    │   ├── migrations/
    │   ├── __init__.py
    │   ├── models.py       # Modèle: PredictionLog (historique prédictions)
    │   ├── ml_models/      # 📦 Modèles ML entraînés
    │   │   └── churn_model.pkl  # Random Forest entraîné (scikit-learn)
    │   ├── services/       # 🔬 Services de prédiction
    │   │   ├── __init__.py
    │   │   └── prediction_service.py  # Logic de prédiction churn
    │   ├── views.py        # Endpoints: /api/predict-churn/<id>/
    │   ├── serializers.py  # Serializers pour logs de prédiction
    │   ├── admin.py
    │   └── urls.py         # Routes: /api/ai-engine/
    │
    ├── ai_agents/          # 🤖 [APP 12] AGENTS IA MULTI-AGENTS
    │   │                   # Source: Shubhamsaboo/awesome-llm-apps (Apache 2.0)
    │   ├── migrations/
    │   ├── __init__.py
    │   ├── config.py       # 🔑 Configuration centralisée (API Keys)
    │   │                   # Google Gemini (multi-provider), Zoom, Gmail, Google OAuth2
    │   ├── admin.py        # Admin pour les agents (logs, configurations)
    │   │
    │   ├── recruitment_agent/  # 📋 AGENT DE RECRUTEMENT
    │   │   ├── __init__.py
    │   │   ├── models.py       # Modèles: AgentLog, CVAnalysis
    │   │   ├── resume_analyzer.py   # 📄 Analyse CV avec **Google Gemini 2.5 Flash**
    │   │   ├── scheduler.py         # 📅 Planification Zoom automatique
    │   │   ├── email_handler.py     # 📧 Emails automatisés (Gmail)
    │   │   ├── views.py             # 🌐 Django REST endpoints
    │   │   ├── serializers.py       # Serializers pour l'agent
    │   │   └── urls.py              # Routes: /api/agents/recruitment/
    │   │   # Source: advanced_ai_agents/agent_teams/ai_recruitment_agent_team/
    │   │
    │   └── voice_agent/    # 🎙️ AGENT VOCAL RH
    │       ├── __init__.py
    │       ├── models.py   # Modèles: VoiceSession, AudioResponse
    │       ├── services.py # Qdrant + FastEmbed, RAG, vector_store
    │       ├── url_indexer.py       # Indexation URL via Firecrawl (optionnel)
    │       ├── views.py             # ask/, index-docs/, index-from-url/
    │       ├── serializers.py       # Serializers pour l'agent vocal
    │       └── urls.py              # Routes: /api/agents/voice/
    │       # Endpoints: ask/, index-docs/, index-from-url/ (Firecrawl)
    │
    ├── media/              # 📁 FICHIERS UPLOADÉS
    │   ├── documents/      # Documents RH (contrats, attestations)
    │   ├── cvs/            # CVs des candidats (PDF)
    │   ├── photos/         # Photos de profil
    │   └── audio/          # Fichiers audio (agent vocal)
    │
    ├── static/             # 📁 FICHIERS STATIQUES
    │   ├── css/            # Styles CSS (si nécessaire)
    │   ├── js/             # Scripts JS (si nécessaire)
    │   └── images/         # Images statiques
    │
    └── db.sqlite3      # 💾 Fichier SQLite (uniquement pour tests unitaires rapides)
                            # Production & Dev : PostgreSQL
│
└── reference_agents/   # 📂 DÉMOS STANDALONE (hors src/)
    ├── SMART_HR_README.md  # Guide : correspondance avec ai_agents
    ├── voice_ai_agents/customer_support_voice_agent/   # Démo Streamlit
    └── advanced_ai_agents/.../ai_recruitment_agent_team/  # Démo Streamlit
        # Dépendances propres : agno, phidata, streamlit. Venv dédié recommandé.
```

---

#### Arborescence Frontend Complète (React + Vite)

<aside>
⚡

**Architecture SPA moderne :** Structure optimisée pour React 18 + Vite avec séparation claire des responsabilités et organisation par fonctionnalités.

</aside>

```jsx
frontend/                   # 📁 RACINE DU FRONTEND
│
├── .gitignore              # Git ignore
├── package.json            # Dépendances npm
├── package-lock.json       # Lock file npm
├── vite.config.js          # ⚙️ Configuration Vite
├── tailwind.config.js      # 🎨 Configuration Tailwind CSS
├── postcss.config.js       # PostCSS pour Tailwind
├── .env                    # 🔴 Variables d'environnement (VITE_API_URL, etc.)
├── .env.example            # Template pour .env
├── index.html              # Point d'entrée HTML
├── README.md               # Documentation frontend
│
├── public/                 # 📁 FICHIERS PUBLICS STATIQUES
│   ├── logo.svg            # Logo de l'application
│   ├── favicon.ico         # Favicon
│   └── robots.txt          # SEO (optionnel)
│
└── src/                    # 📂 CODE SOURCE REACT
    │
    ├── main.jsx            # 🚀 Point d'entrée React (ReactDOM.render)
    ├── App.jsx             # 🏠 Composant racine (Router + Layout)
    ├── index.css           # 🎨 Styles globaux + Tailwind imports
    │
    ├── pages/              # 📄 PAGES (ROUTES PRINCIPALES)
    │   │
    │   ├── auth/           # 🔐 Pages d'authentification
    │   │   ├── LoginPage.jsx        # Page de connexion
    │   │   ├── RegisterPage.jsx     # Page d'inscription
    │   │   └── ForgotPasswordPage.jsx  # Mot de passe oublié
    │   │
    │   ├── dashboard/      # 📊 Dashboards par rôle
    │   │   ├── AdminDashboard.jsx   # Dashboard Admin
    │   │   ├── HRDashboard.jsx      # Dashboard RH
    │   │   ├── EmployeeDashboard.jsx  # Dashboard Employé
    │   │   └── CandidateDashboard.jsx # Dashboard Candidat
    │   │
    │   ├── employees/      # 👥 Gestion du personnel
    │   │   ├── EmployeeListPage.jsx     # Liste des employés
    │   │   ├── EmployeeDetailPage.jsx   # Détail d'un employé
    │   │   ├── EmployeeCreatePage.jsx   # Ajouter un employé
    │   │   └── EmployeeEditPage.jsx     # Modifier un employé
    │   │
    │   ├── leaves/         # 🏖️ Gestion des congés
    │   │   ├── LeaveListPage.jsx        # Liste des congés
    │   │   ├── LeaveRequestPage.jsx     # Demander un congé
    │   │   └── LeaveValidationPage.jsx  # Valider les congés (RH)
    │   │
    │   ├── tasks/          # ✅ Gestion des tâches
    │   │   ├── TaskListPage.jsx         # Liste des tâches
    │   │   ├── TaskBoardPage.jsx        # Vue Kanban
    │   │   └── TaskDetailPage.jsx       # Détail d'une tâche
    │   │
    │   ├── attendance/     # 📅 Gestion des présences
    │   │   ├── AttendanceListPage.jsx   # Liste des présences
    │   │   └── AttendanceReportPage.jsx # Rapport mensuel
    │   │
    │   ├── payroll/        # 💰 Gestion des paiements
    │   │   ├── PayrollListPage.jsx      # Historique des paies
    │   │   └── PayslipDetailPage.jsx    # Fiche de paie détaillée
    │   │
    │   ├── documents/      # 📄 Gestion des documents
    │   │   ├── DocumentListPage.jsx     # Liste des documents
    │   │   └── DocumentUploadPage.jsx   # Upload de documents
    │   │
    │   ├── training/       # 🎓 Formations & Réunions
    │   │   ├── TrainingListPage.jsx     # Liste des formations
    │   │   ├── MeetingListPage.jsx      # Liste des réunions
    │   │   └── ZoomIntegrationPage.jsx  # Intégration Zoom
    │   │
    │   ├── recruitment/    # 🎯 Module de recrutement
    │   │   ├── JobOfferListPage.jsx     # Liste des offres d'emploi
    │   │   ├── JobOfferDetailPage.jsx   # Détail d'une offre
    │   │   ├── ApplicationListPage.jsx  # Liste des candidatures (RH)
    │   │   ├── ApplyPage.jsx            # Postuler (Candidat)
    │   │   └── InterviewSchedulePage.jsx # Planifier un entretien
    │   │
    │   ├── ai-insights/    # 🧠 Analyse IA & Churn
    │   │   ├── ChurnDashboardPage.jsx   # Dashboard prédiction churn
    │   │   ├── ChurnDetailPage.jsx      # Détail risque employé
    │   │   └── AIReportsPage.jsx        # Rapports IA
    │   │
    │   ├── settings/       # ⚙️ Paramètres
    │   │   ├── ProfilePage.jsx          # Mon profil
    │   │   ├── SettingsPage.jsx         # Paramètres généraux
    │   │   └── UsersManagementPage.jsx  # Gestion utilisateurs (Admin)
    │   │
    │   └── NotFoundPage.jsx  # 404 Page non trouvée
    │
    ├── components/         # 🧩 COMPOSANTS RÉUTILISABLES
    │   │
    │   ├── layout/         # Structure de l'application
    │   │   ├── Navbar.jsx              # Barre de navigation
    │   │   ├── Sidebar.jsx             # Menu latéral
    │   │   ├── Footer.jsx              # Pied de page
    │   │   ├── Layout.jsx              # Layout principal
    │   │   └── DashboardLayout.jsx     # Layout pour dashboards
    │   │
    │   ├── auth/           # Composants d'authentification
    │   │   ├── ProtectedRoute.jsx      # Route protégée HOC
    │   │   ├── GoogleLoginButton.jsx   # Bouton login Google
    │   │   └── RoleGuard.jsx           # Guard par rôle
    │   │
    │   ├── common/         # Composants communs
    │   │   ├── Button.jsx              # Bouton personnalisé
    │   │   ├── Input.jsx               # Champ de saisie
    │   │   ├── Modal.jsx               # Modale
    │   │   ├── Card.jsx                # Carte
    │   │   ├── Badge.jsx               # Badge de statut
    │   │   ├── Avatar.jsx              # Avatar utilisateur
    │   │   ├── Loader.jsx              # Spinner de chargement
    │   │   ├── Toast.jsx               # Notifications toast
    │   │   ├── Pagination.jsx          # Pagination
    │   │   ├── SearchBar.jsx           # Barre de recherche
    │   │   ├── Table.jsx               # Tableau générique
    │   │   ├── Dropdown.jsx            # Menu déroulant
    │   │   └── EmptyState.jsx          # État vide
    │   │
    │   ├── employees/      # Composants liés aux employés
    │   │   ├── EmployeeCard.jsx        # Carte employé
    │   │   ├── EmployeeTable.jsx       # Tableau employés
    │   │   ├── EmployeeForm.jsx        # Formulaire employé
    │   │   └── EmployeeFilters.jsx     # Filtres de recherche
    │   │
    │   ├── leaves/         # Composants congés
    │   │   ├── LeaveCard.jsx           # Carte de congé
    │   │   ├── LeaveForm.jsx           # Formulaire demande congé
    │   │   └── LeaveCalendar.jsx       # Calendrier des congés
    │   │
    │   ├── tâches/          # Composants tâches
    │   │   ├── TaskCard.jsx            # Carte de tâche
    │   │   ├── TaskKanban.jsx          # Vue Kanban
    │   │   └── TaskForm.jsx            # Formulaire tâche
    │   │
    │   ├── charts/         # 📊 Graphiques & Data Viz
    │   │   ├── RetentionChart.jsx      # Graphique rétention
    │   │   ├── ChurnGauge.jsx          # Jauge de risque churn
    │   │   ├── AgePyramidChart.jsx     # Pyramide des âges
    │   │   ├── SalaryChart.jsx         # Graphique des salaires
    │   │   └── KPICard.jsx             # Carte KPI
    │   │
    │   ├── recrutement/    # Composants recrutement
    │   │   ├── JobOfferCard.jsx        # Carte offre d'emploi
    │   │   ├── ApplicationCard.jsx     # Carte candidature
    │   │   ├── CVUploader.jsx          # Upload de CV
    │   │   └── MatchingScore.jsx       # Score de matching IA
    │   │
    │   └── ai/             # 🤖 Composants IA
    │       ├── ChatWidget.jsx          # Widget chat IA (Gemini multi-provider)
    │       ├── VoiceAssistant.jsx      # Assistant vocal
    │       └── ChurnAlert.jsx          # Alerte de churn
    │
    ├── context/            # 🌐 CONTEXT API (STATE MANAGEMENT)
    │   ├── AuthContext.jsx             # Contexte d'authentification
    │   ├── ThemeContext.jsx            # Thème (dark/light mode)
    │   └── NotificationContext.jsx     # Notifications globales
    │
    ├── hooks/              # 🪝 CUSTOM HOOKS
    │   ├── useAuth.js                  # Hook d'authentification
    │   ├── useApi.js                   # Hook pour appels API
    │   ├── useDebounce.js              # Hook debounce pour recherche
    │   ├── useLocalStorage.js          # Hook localStorage
    │   ├── usePermissions.js           # Hook permissions RBAC
    │   └── useToast.js                 # Hook notifications
    │
    ├── services/           # 🔌 SERVICES API (AXIOS)
    │   ├── api.js                      # Instance Axios configurée
    │   ├── authService.js              # Service authentification
    │   ├── employeeService.js          # Service employés
    │   ├── leaveService.js             # Service congés
    │   ├── taskService.js              # Service tâches
    │   ├── attendanceService.js        # Service présences
    │   ├── payrollService.js           # Service paiements
    │   ├── documentService.js          # Service documents
    │   ├── trainingService.js          # Service formations
    │   ├── recruitmentService.js       # Service recrutement
    │   ├── churnService.js             # Service prédiction churn
    │   └── aiService.js                # Service chat IA
    │
    ├── utils/              # 🛠️ UTILITAIRES
    │   ├── constants.js                # Constantes globales
    │   ├── helpers.js                  # Fonctions helper
    │   ├── dateUtils.js                # Utilitaires de dates
    │   ├── formatters.js               # Formatage (nombres, dates, etc.)
    │   ├── validators.js               # Validateurs de formulaires
    │   └── permissions.js              # Logique RBAC
    │
    ├── routes/             # 🛣️ CONFIGURATION DES ROUTES
    │   ├── index.jsx                   # Configuration React Router
    │   ├── publicRoutes.jsx            # Routes publiques
    │   ├── privateRoutes.jsx           # Routes privées
    │   └── roleBasedRoutes.jsx         # Routes par rôle
    │
    └── assets/             # 🎨 RESSOURCES STATIQUES
        ├── images/                     # Images (logos, illustrations)
        │   ├── logo.svg
        │   ├── empty-state.svg
        │   └── avatar-placeholder.png
        ├── icons/                      # Icônes SVG personnalisées
        └── fonts/                      # Polices personnalisées (optionnel)
```

<aside>
💡

**Points clés de l'architecture frontend :**

- **Structure par fonctionnalités** : Chaque module métier a ses propres pages et composants
- **Séparation des responsabilités** : Services API, hooks, utils bien séparés
- **Réutilisabilité maximale** : Composants communs dans `common/`
- **State management simple** : Context API pour état global léger
- **RBAC intégré** : Protection des routes et composants par rôle
- **Performance** : Code splitting automatique par Vite sur les routes
</aside>

---

#### Résumé de l'Architecture Progressive

| **Phase** | **Composants** | **Technologie** | **Semaines** |
| --- | --- | --- | --- |
| **Phase 1** | Backend Django (11 apps fonctionnelles) | Django + DRF + postgresql+ **Google Gemini (multi-provider)** | 1-8 |
| **Phase 2** | Agents IA intégrés (ai_agents) | OpenAI + Qdrant + FastEmbed | 9-10 |
| **Phase 3** | Frontend React | React 18 + Vite 5 + Tailwind | 11-12 |

<aside>
✅

**Avantages de cette approche :**

- Base solide et testée (système Django existant)
- Déploiement incrémental (moins de risques)
- Chaque module fonctionne indépendamment
- Facilité de debug et maintenance
</aside>

### 5.3 Modèle de Données (Entités Clés)

- `CustomUser` (AbstractUser) : Gestion unifiée des accès.
- `Employee` : Extension métier (Salary, Department, Position).
- `Department` & `Position` : Tables de référence.
- `LeaveRequest` : Gestion des absences (Status: Pending/Approved).
- `PredictionLog` : Historique des analyses IA.
- `Application` : Lien Candidat <-> Offre d'emploi.

### 5.4 Matrice des Permissions (RBAC)

| **Action / Module** | **👑 Admin** | **👔 RH** | **👷 Employé** | **👤 Candidat** |
| --- | --- | --- | --- | --- |
| **Login / Logout** | ✅ | ✅ | ✅ | ✅ |
| **Gestion Utilisateurs** | ✅ | ❌ | ❌ | ❌ |
| **Voir tous les employés** | ✅ | ✅ | ❌ | ❌ |
| **Voir fiche paie / Contrat** | ✅ | ✅ (Tous) | ✅ (Le sien uniquement) | ❌ |
| **Modèle IA : Prédire Churn** | ✅ | ✅ | ❌ | ❌ |
| **Poser des congés** | ✅ | ✅ | ✅ | ❌ |
| **Valider des congés** | ✅ | ✅ | ❌ | ❌ |
| **Recrutement : Voir Offres** | ✅ | ✅ | ✅ | ✅ |
| **Recrutement : Postuler** | ❌ | ❌ | ❌ | ✅ |
| **Recrutement : Voir CVs** | ✅ | ✅ | ❌ | ❌ |

---

## 6. PIPELINE CI/CD (DEVOPS)

### 6.1 Workflow Logique

1. **TRIGGER :** `git push origin main`
2. **CI (Tests) :** GitHub Actions exécute les tests unitaires Django et vérifie le linting.
3. **CD (Deploy) :** Si les tests passent, construction des images Docker et déploiement automatique.

### 6.2 Configuration GitHub Actions

```yaml
name: Smart-HR CI/CD Pipeline

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  # JOB 1 : TESTER LE BACKEND
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'

      - name: Install Dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run Django Tests
        run: |
          cd backend
          python manage.py test

  # JOB 2 : BUILDER ET DEPLOYER
  deploy:
    needs: test-backend
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and Push Backend Docker Image
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: mon-pseudo/smart-hr-backend:latest

      - name: Trigger Deploy on Render
        run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
```

---

## 7. DATASET & INTELLIGENCE ARTIFICIELLE

### 7.1 Source de Données

**Dataset utilisé :** IBM HR Analytics Employee Attrition & Performance (Kaggle)

- **Auteur :** pavansubhash (Médaille d'Or 🥇)
- **Contenu :** 1,470 employés avec 35 features (Age, Salaire, Satisfaction, etc.)
- **Colonne cible :** `Attrition` (Yes/No)

### 7.2 Stratégie d'Entraînement

1. Téléchargement du CSV depuis Kaggle.
2. Nettoyage des données (conversion texte → chiffres).
3. Entraînement d'un modèle Random Forest (Scikit-Learn).
4. Sauvegarde du modèle entraîné : `churn_model.pkl`.
5. Intégration dans Django via le service `PredictionService`.

---

## 8. VISUALISATION DE DONNÉES

### 8.1 Stratégie

**Approche :** Rendu Côté Client (Client-Side Rendering)

- Le Backend Django envoie des données JSON brutes.
- Le Frontend React utilise **Recharts** pour dessiner les graphiques dynamiquement.
- **Avantages :** Interactivité optimale, animations fluides, HMR ultra-rapide en développement (Vite), déploiement simple (fichiers statiques).

### 8.2 Composants Visuels

- **RetentionChart.jsx :** Graphique en courbe (Area Chart) montrant le taux de rétention.
- **EmployeeTable.jsx :** Tableau de données avec indicateurs de risque IA.
- **ChurnGauge.jsx :** Jauge circulaire affichant le score de risque (0-100%).

---

## 📊 WBS (WORK BREAKDOWN STRUCTURE)

### 📦 LOT 1 : FONDATIONS & INFRASTRUCTURE (Semaine 1-2)

- **1.1 Initialisation Git & DevOps**
    - Création Repo GitHub `Smart-HR`.
    - Mise en place `docker-compose.yml`.
    - Configuration CI/CD (GitHub Actions).
- **Backend Setup**
    - Init projet Django.
    - Connexion Base de Données (**PostgreSQL local**).
    - Configuration Variables d'Env (`.env`) : GEMINI_API_KEY, Google OAuth2, PostgreSQL.
- **1.3 Frontend Setup**
    - Init projet React + Vite (`npm create vite@latest`).
    - Installation Tailwind CSS + PostCSS.
    - Création structure dossiers (src/pages/, src/components/, src/utils/, src/context/).

### 📦 LOT 2 : AUTHENTIFICATION & RÔLES (Semaine 3)

- **2.1 Backend Auth**
    - Modèle `CustomUser` avec 4 rôles.
    - Config **JWT** (djangorestframework-simplejwt).
    - Integration **Google OAuth2** (dj-rest-auth + allauth).
- **2.2 Frontend Auth**
    - Pages Login & Register.
    - Intégration Google Login Button.
    - Context API React (`AuthContext`).
    - Composant `ProtectedRoute` avec React Router pour routes privées.

### 📦 LOT 3 : GESTION RH (CORE) (Semaine 4-5)

- **3.1 Modélisation RH**
    - Modèles `Department`, `Position`, `Employee`.
    - Script de "Seeding" (Faker).
- **3.2 API CRUD**
    - Endpoints `/api/employees/`.
    - Permissions : RH voit tout, Employé voit son profil.
- **3.3 Frontend RH**
    - Page "Liste des employés".
    - Page "Profil Employé".
    - Formulaire "Ajouter un employé".

### 📦 LOT 4 : INTELLIGENCE ARTIFICIELLE (Semaine 6-8)

#### 4.1 ML Classique (Churn Prediction)

- **Data Science (Local)**
    - Téléchargement dataset IBM (Kaggle).
    - Script `train_[model.py](http://model.py)`.
    - Génération du fichier `churn_model.pkl`.
- **Intégration Backend**
    - Service `PredictionService`.
    - Endpoint `/api/predict-churn/<id>/`.
    - Base de données : **PostgreSQL**
- **Visualisation Frontend**
    - Badge "Risque" dans le tableau employés.
    - Composant "Jauge de Risque".

#### 4.2 Agent de Recrutement

- **Implémentation Django** : `src/ai_agents/recruitment_agent/`
- **Démo de référence** : `reference_agents/.../ai_recruitment_agent_team/` (Streamlit, venv dédié)
- **Configuration API Keys**
    - **Google Gemini 2.5 Flash** (défaut, `GEMINI_API_KEY`) — ou OpenAI/Claude/Grok via `LLM_PROVIDER`
    - Zoom API (Account ID, Client ID/Secret)
    - Gmail App Password
    - Google OAuth2 (Client ID/Secret)
- **Intégration Django**
    - Création app `ai_agents/recruitment_agent/`
    - Endpoints FastAPI ou Django REST
    - `/api/agents/analyze-resume/`
    - `/api/agents/schedule-interview/`
    - `/api/agents/send-email/`
- **Tests & Validation**
    - Upload CV test (PDF)
    - Vérification scoring
    - Test emails automatiques

#### 4.3 Agent Vocal

- **Implémentation Django** : `src/ai_agents/voice_agent/`
- **Démo de référence** : `reference_agents/.../customer_support_voice_agent/` (Streamlit, venv dédié)
- **Configuration**
    - **Qdrant** (base vectorielle), **FastEmbed** (embeddings)
    - **Firecrawl** (optionnel) : indexation documentation depuis URL
- **Cas d'usage RH**
    - Adapter pour FAQ RH vocale
    - Briefing vocal candidats
    - Onboarding vocal employés
- **Endpoints API**
    - `/api/agents/voice/ask/` : Poser une question FAQ RH
    - `/api/agents/voice/index-docs/` : Ré-indexer la FAQ par défaut
    - `/api/agents/voice/index-from-url/` : Indexer une doc depuis une URL (Firecrawl optionnel)

#### 4.4 Assistant Conversationnel IA

- **Intégration Google Gemini 2.5 Flash** (seule API payante)
    - Chat intelligent sur données RH
    - Réponses contextuelles
    - Endpoint `/api/chat/`

### 📦 LOT 5 : MODULES OPÉRATIONNELS (Semaine 9-10)

**Intégration du Système Django Complet**

- **5.1 Gestion des Congés**
    - Modèle `LeaveRequest`
    - Workflow complet : Demande → Validation → Notification
    - Interface "Demander congé" (Employé)
    - Interface "Valider congé" (RH)
- **5.2 Gestion des Tâches**
    - Modèle `Task` (états : À faire, En cours, En revue, Terminée)
    - Affectation et suivi
    - Vue Kanban
- **5.3 Gestion des Présences**
    - Modèle `Attendance`
    - Pointage quotidien
    - Reporting mensuel
- **5.4 Gestion des Paiements**
    - Modèle `Payment`
    - Historique salaires
    - Fiches de paie
- **5.5 Gestion des Documents**
    - Upload sécurisé (Supabase Storage)
    - Types : Contrats, Attestations, Certificats
    - Permissions par rôle
- **5.6 Formations et Réunions**
    - Modèle `Training`, `Meeting`
    - Planification avec Zoom
    - Suivi des participants
- **5.7 Dashboard Graphique**
    - Endpoint `/api/stats/`
    - Intégration Recharts
    - KPIs temps réel

### 📦 LOT 6 : RECRUTEMENT & FINALISATION (Semaine 11-12)

- **6.1 Espace Candidat Enrichi**
    - Inscription candidat
    - Upload CV (Supabase Storage)
    - **Analyse automatique par Agent IA**
    - **Matching automatique CV/Offre**
    - **Emails automatisés (confirmation/rejet)**
    - **Planification entretiens Zoom automatique**
- **6.2 Interface Vocale**
    - Intégration widget vocal
    - Sélection de voix (nova, alloy, echo)
    - Tests UX avec candidats
- **6.3 Assistant Conversationnel**
    - Widget chat **Google Gemini (multi-provider)**
    - Réponses contextuelles RH
    - Historique conversations
- **6.4 Polish UI/UX**
    - Loading spinners, Notifications (Toasts)
    - Gestion des erreurs 404
    - Animations (Framer Motion)
- **6.5 Tests & Déploiement**
    - Tests unitaires (couverture > 70%)
    - Tests E2E des agents IA
    - Déploiement micro-services
    - Push final sur Render/Railway/Vercel

---

## 9. RISQUES ET CONTRAINTES

## 11. PERSPECTIVES D'ÉVOLUTION & MODULES FUTURS

### 11.1 Module Proctoring Intelligent (Version 2)

<aside>
🚀

**Vision :** Transformer le processus de recrutement en ajoutant un système de surveillance intelligente des tests techniques pour garantir l'équité et l'authenticité des candidatures.

</aside>

#### 11.1.1 Contexte & Problématique

Dans le processus de recrutement actuel, les tests techniques en ligne souffrent de plusieurs failles :

- **Usurpation d'identité :** Un candidat peut demander à quelqu'un d'autre de passer le test à sa place.
- **Triche facile :** Accès à ChatGPT, Google, ou copier-coller des questions vers l'extérieur.
- **Absence de preuve :** Le RH n'a aucune garantie que le candidat reçu en entretien est bien celui qui a passé le test.

**Solution :** Un système de proctoring (surveillance) intelligent, basé sur l'IA et respectueux de la vie privée.

---

#### 11.1.2 Scénario d'Usage Complet (Révisé)

> **Personnage principal :** Moussa Diop, développeur Django avec 3 ans d'expérience, candidat au poste de "Développeur Backend Django" chez TechSen SARL.
>

> **Contexte :** Moussa a postulé via Smart-HR et son CV a été analysé automatiquement par l'Agent de Recrutement IA (score de matching : 87%)
>

#### 🎬 ACTE 1 : L'Invitation & Le "SAS" de Sécurité

**1. L'Invitation (Email)**

- Le candidat (ex: Moussa) reçoit un email : *"Félicitations, votre CV a été retenu. Cliquez ici pour passer le test technique Python."*
- Il clique et arrive sur l'application React.

**2. Le Consentement Légal (RGPD/CDP)**

- **Écran :** Une modale apparaît avec un texte clair.
- **Message :** *"Pour garantir l'équité du processus, des photos de vérification seront prises pendant le test. Vos données seront chiffrées et supprimées automatiquement dans 90 jours. En cliquant sur 'J'accepte', vous consentez à cette surveillance."*
- **Action :** Le candidat coche "J'accepte" et clique sur "Continuer".
- **Technique :** Le champ `consent_given=True` est enregistré en base de données avec horodatage.

**3. Le Verrouillage (Fullscreen)**

- **Action :** Le système demande : *"Passez en plein écran pour commencer."*
- **Technique :** Dès que le candidat accepte, le navigateur passe en mode fullscreen. S'il appuie sur Échap, le test se floute automatiquement et se met en pause avec un avertissement.

**4. La "Preuve de Référence" (Le Selfie)**

- **Écran :** La webcam s'active en mode miroir.
- **Action :** Le candidat cadre son visage et clique sur *"Prendre ma photo d'identité"*.
- **Technique :** Cette photo est envoyée au serveur et sauvegardée comme `reference_snapshot`. C'est l'étalon de vérité pour toute la suite.

---

#### 🎬 ACTE 2 : L'Examen (Sous Haute Surveillance)

**5. Le Déroulement du Test**

- Le candidat répond aux QCM et aux questions ouvertes.
- Un timer (ex: 30:00) est affiché en permanence en haut de l'écran.

**6. La Surveillance Passive (Anti-Cheat)**

**Tentative de Triche 1 : Copier-Coller**

- **Action candidat :** Il essaie de copier une question pour la coller dans ChatGPT.
- **Réaction système :** Le clic-droit et `Ctrl+C` sont désactivés. Rien ne se passe.

**Tentative de Triche 2 : Changement d'Onglet**

- **Action candidat :** Il ouvre un nouvel onglet pour chercher sur Google.
- **Réaction système :** L'événement `visibilitychange` est détecté. Une notification Toast apparaît : *"⚠️ Attention (1/3) ! Restez sur la fenêtre du test !"*
- Le compteur `suspicious_activity` passe à 1 et est enregistré avec timestamp.

**7. Les Snapshots Aléatoires (Surveillance Intelligente)**

- **Action invisible :** Toutes les 4 à 5 minutes (intervalle aléatoire), le système React prend une photo silencieuse du candidat via la webcam.
- **Stockage :** Ces photos sont envoyées discrètement au backend via API et ajoutées à la liste `snapshots[]`.
- **But :** Vérifier que c'est toujours la même personne devant l'écran tout au long du test.

---

#### 🎬 ACTE 3 : Le Verdict & L'IA

**8. La Soumission**

- Le temps est écoulé ou le candidat clique sur *"Terminer le test"*.
- L'écran se ferme et il est redirigé vers une page de confirmation.

**9. La Correction Automatique (Immédiate)**

- **QCM :** Le backend Django corrige automatiquement les réponses à choix multiples.
- **Questions Texte :** Le backend envoie chaque réponse à **Zhipu AI** avec le prompt : *"Note cette réponse sur 10 points en tenant compte de [critères d'évaluation]"*.
- **Résultat :** Un score global (ex: 82/100) est calculé et enregistré.

**10. Le Tri Automatique (Decision Tree)**

- **Si Score ≥ 70/100 :** Statut passe à `INTERVIEW_SCHEDULED`. Email d'invitation envoyé.
- **Si Score < 70/100 :** Statut passe à `REJECTED`. Email de refus poli envoyé automatiquement.

---

#### 🎬 ACTE 4 : La Vérification Humaine (Le Contrôle Final)

**11. Le Tableau de Bord du RH**

Le Responsable RH se connecte et voit :

- *"Moussa Diop - Score : 82% - ⚠️ Suspicions : 1 - Statut : En attente de vérification"*

Il clique sur *"Vérifier l'intégrité"* et accède à un écran divisé :

- **À gauche :** La Photo de Référence (le selfie du début)
- **À droite :** Les 5-6 Snapshots pris pendant le test avec timestamps

**IA Assistant (Optionnel) :**

- Un score de similarité est affiché sous chaque snapshot : *"Similarité avec photo de référence : 94%"*
- Technologie suggérée : **DeepFace** ou **FaceNet** (open source)

**Action RH :**

- Si c'est visuellement la même personne sur toutes les photos → Le RH clique sur *"Valider l'authenticité"*
- Si doute (visage différent, personne absente sur certaines photos) → Le RH rejette ou replanifie en présentiel

**12. L'Entretien Final (Vérification Physique)**

- Moussa vient au bureau pour l'entretien.
- Le RH a accès à la Photo de Référence sur sa tablette/PC.
- Il vérifie visuellement que le Moussa présent est bien celui de la photo.
- Si correspondance → Processus continue normalement.

---

#### 🎬 ACTE 5 : Le Nettoyage (Conformité Juridique)

**13. Trois mois plus tard (J+90)**

Un script automatique `delete_old_[snapshots.py](http://snapshots.py)` s'exécute chaque nuit :

```python
# Pseudo-code
for test in TechnicalTest.objects.filter(created_at__lt=90_days_ago):
    test.reference_snapshot.delete()  # Supprime le fichier physique
    test.snapshots.all().delete()     # Supprime tous les snapshots
    test.data_deleted = True
    test.save()
```

**Résultat :** Conformité totale avec la **CDP sénégalaise** et le **RGPD européen**. ✅

---

#### 11.1.3 Architecture Technique

#### Stack Additionnelle

- **Frontend :** React 18 + Vite, React Webcam Library, Browser Fullscreen API, Visibility API
- **Backend :** Django + Celery (pour snapshots asynchrones), Pillow (compression images)
- **IA :** Zhipu AI (notation texte), DeepFace/FaceNet (comparaison faciale)
- **Stockage :** Chiffrement AES-256 des images, Supabase Storage avec expiration automatique

#### Nouveaux Modèles Django

```python
class TechnicalTest(models.Model):
    candidate = ForeignKey(User)
    job_offer = ForeignKey(JobOffer)
    consent_given = BooleanField(default=False)
    consent_timestamp = DateTimeField()
    reference_snapshot = ImageField(upload_to='proctoring/references/')
    score = IntegerField(null=True)
    suspicious_count = IntegerField(default=0)
    status = CharField(choices=['PENDING', 'PASSED', 'FAILED', 'VERIFIED'])
    integrity_verified_by = ForeignKey(User, null=True)
    data_deleted = BooleanField(default=False)
    created_at = DateTimeField(auto_now_add=True)

class TestSnapshot(models.Model):
    test = ForeignKey(TechnicalTest, related_name='snapshots')
    image = ImageField(upload_to='proctoring/snapshots/')
    timestamp = DateTimeField()
    similarity_score = FloatField(null=True)  # 0-100%
    created_at = DateTimeField(auto_now_add=True)

class SuspiciousActivity(models.Model):
    test = ForeignKey(TechnicalTest)
    activity_type = CharField(choices=['TAB_CHANGE', 'FULLSCREEN_EXIT', 'COPY_ATTEMPT'])
    timestamp = DateTimeField(auto_now_add=True)
```

#### Endpoints API Supplémentaires

```
POST /api/proctoring/start-test/<job_offer_id>/
POST /api/proctoring/upload-reference/
POST /api/proctoring/snapshot/
POST /api/proctoring/log-suspicious/
POST /api/proctoring/submit-test/
GET  /api/proctoring/verify/<test_id>/  # Pour le RH
```

---

#### 11.1.4 Matrice des Risques & Solutions

| **Risque** | **Impact** | **Solution / Mitigation** |
| --- | --- | --- |
| **Candidat refuse accès webcam** | Test impossible | Proposer test en présentiel comme alternative |
| **Connexion internet instable** | Snapshots non envoyés | Compression JPEG 60%, retry automatique, stockage local temporaire |
| **Incompatibilité navigateur** | Fullscreen ne marche pas | Détecter le navigateur, afficher message si Safari iOS |
| **Faux positif (bonne personne rejetée)** | Discrimination injuste | Le RH valide TOUJOURS manuellement, jamais de rejet automatique |
| **Données biométriques sensibles** | Risque juridique RGPD/CDP | Chiffrement AES-256, suppression auto J+90, consentement explicite |
| **Litige juridique** | Candidat conteste le rejet | Logs horodatés + hash SHA-256 de chaque action, audit trail complet |

---

#### 11.1.5 Indicateurs de Succès (KPIs)

1. **Taux de détection de triche :** Réduction de 60% des cas suspects grâce à la surveillance passive.
2. **Conformité légale :** 100% des données supprimées à J+90 automatiquement.
3. **Expérience candidat :** Taux d'abandon du test < 5% (interface non intrusive).
4. **Gain de temps RH :** Réduction de 50% du temps passé à vérifier l'authenticité des candidats.
5. **Précision IA (Notation) :** Corrélation > 85% entre notes IA et notes humaines sur échantillon test.

---

#### 11.1.6 Planning d'Implémentation (Post-MVP)

**Phase 1 (Semaines 11-12) : Fondations Proctoring**

- Modèles Django (TechnicalTest, Snapshot)
- Upload photo de référence
- Détection changement onglet/fullscreen

**Phase 2 (Semaines 13-14) : Surveillance Avancée**

- Snapshots aléatoires automatiques
- Compression et upload asynchrone (Celery)
- Dashboard RH pour vérification

**Phase 3 (Semaines 15-16) : IA & Automatisation**

- Intégration Zhipu AI pour notation texte
- Intégration DeepFace pour similarité faciale
- Script de suppression automatique J+90

**Phase 4 (Semaine 17) : Polish & Sécurité**

- Chiffrement des images
- Audit logs complets
- Tests utilisateurs finaux

---

<aside>
⚖️

**Note Juridique Importante :** Ce module traite des données biométriques (photos de visages), considérées comme **sensibles** par le RGPD et la CDP. Une **Analyse d'Impact relative à la Protection des Données (AIPD)** devra être réalisée avant toute mise en production. Consultez un juriste spécialisé en protection des données.

</aside>

<aside>
💡

**Avantage Concurrentiel :** Aucun SIRH concurrent au Sénégal ne propose actuellement de proctoring intelligent avec IA. Ce module positionnerait Smart-HR comme **pionnier** sur le marché de l'Afrique de l'Ouest.

</aside>

---

## 9. RISQUES ET CONTRAINTES

| **Risque** | **Impact** | **Stratégie d'atténuation** |
| --- | --- | --- |
| **Complexité OAuth2 (Google)** | Blocage technique | Utiliser le login email/password en plan B. |
| **Biais de l'IA** | Résultats discriminants | Utiliser uniquement le dataset IBM équilibré. |
| **Performance "Cold Start"** | Lenteur démo (Render Free) | Prévoir un script qui "ping" le site 5 min avant la soutenance. |
| **Temps de dev** | Retard sur le planning | Respecter le MVP (Lots 1 à 5 sont prioritaires). |
| **Coûts API Gemini** | Budget dépassé | Limiter le nombre d'appels, utiliser cache, prévoir quotas Google Gemini 2.5 Flash. |
| **Latence agents IA** | UX dégradée | Traitement asynchrone (Celery), feedback visuel (loaders). |
| **Intégration Zoom/Gmail** | Authentification complexe | Suivre documentation officielle, tests unitaires poussés. |
| **Dépendances multiples** | Conflits versions | `reference_agents/` : venv dédié. Django : requirements.txt principal sans phidata/agno. |
| **Conformité RGPD (données vocales)** | Risque juridique | Consentement explicite, chiffrement, suppression automatique J+90. |

<aside>
⚠️

**Note Importante :** L'intégration d'agents IA multi-agents augmente la complexité technique. Prévoir des sprints dédiés pour chaque agent et des tests d'intégration approfondis.

</aside>

---

## 10. INDICATEURS DE SUCCÈS (KPI)

1. **Fiabilité technique :** Pipeline CI/CD passe au vert à 100%.
2. **Précision IA :** Le modèle prédit le churn avec > 80% de précision (sur données test).
3. **Qualité Code :** Score "A" ou "B" sur les outils de qualité (flake8/eslint).
4. **Fonctionnalité :** Les 4 rôles peuvent se connecter et effectuer leurs tâches respectives sans crash.

---

<aside>

✅ **Cahier des charges complet et prêt pour le développement !**

</aside>
