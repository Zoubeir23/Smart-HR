<div align="center">

<img src="Frontend/public/logo-lockup.svg" alt="Smart-HR Logo" width="260" height="62" />

<br/>
<br/>

<p>
  <strong>Système de Gestion des Ressources Humaines Intelligent</strong><br/>
  <em>Anticiper les départs · Automatiser le recrutement · Piloter vos talents</em>
</p>

<br/>

<!-- Backend -->
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Django](https://img.shields.io/badge/Django-6.0.3-092E20?style=for-the-badge&logo=django&logoColor=white)](https://djangoproject.com)
[![DRF](https://img.shields.io/badge/Django%20REST-3.16-A30000?style=for-the-badge&logo=django&logoColor=white)](https://django-rest-framework.org)
[![Celery](https://img.shields.io/badge/Celery-5.0+-37814A?style=for-the-badge&logo=celery&logoColor=white)](https://docs.celeryq.dev)

<!-- Frontend -->
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)

<!-- Infra & AI -->
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Google Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)

<!-- Status -->
[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/Zoubeir23/Smart-HR/actions)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)

<br/>

[Démarrage rapide](#-démarrage-rapide) · [Fonctionnalités](#-fonctionnalités) · [Architecture](#-architecture) · [IA Intégrée](#-ia-intégrée) · [Déploiement](#-déploiement)

</div>

---

## Présentation

**Smart-HR** est une plateforme SIRH nouvelle génération qui transforme la gestion RH d'une PME en outil proactif. Là où les SIRH classiques stockent passivement les données, Smart-HR les analyse en temps réel pour anticiper les démissions, automatiser le recrutement et assister les équipes RH avec un chatbot IA contextuel.

### Ce que Smart-HR fait concrètement

- **Prédit le churn** — Un modèle Random Forest entraîné sur 1 470 employés (dataset IBM) calcule un score de risque de départ 0–100 % avec explication de la cause principale
- **Analyse les CVs automatiquement** — Gemini 2.5 Flash extrait compétences, expériences et calcule un score de matching sémantique face à l'offre d'emploi
- **Conduit des entretiens vocaux** — Intégration Vapi (WebRTC) pour des sessions d'entretien IA avec feedback structuré en fin d'appel
- **Assiste les RH via chatbot** — Agent conversationnel multi-LLM (Gemini, OpenAI, Anthropic, Grok) avec actions directes sur la base de données
- **Gère l'ensemble du cycle RH** — Congés, présences, paie, documents, formations, tâches

---

## Fonctionnalités

### Gestion du Personnel

| Module | Fonctionnalités |
|--------|----------------|
| **Profils Employés** | Informations complètes, contrat, salaire, manager, historique d'évaluations |
| **Congés** | Demande → Validation RH, suivi des soldes, calendrier partagé |
| **Présences** | Pointage quotidien, rapports mensuels |
| **Paie** | Historique salaires, fiches de paie |
| **Documents** | Upload sécurisé, contrats, attestations (par rôle) |
| **Formations & Réunions** | Catalogue, planification, intégration Zoom |
| **Tâches** | Kanban (À faire → En cours → En revue → Terminée) |

### Recrutement

| Module | Fonctionnalités |
|--------|----------------|
| **Offres d'Emploi** | Création/publication par le RH, listing public pour candidats |
| **Candidatures** | Upload CV (PDF), formulaire de postulation |
| **Analyse IA** | Score de matching sémantique Gemini (0–100), extraction automatique des compétences |
| **Filtrage** | Seuil de score configurable, tri par score décroissant |
| **Statuts** | Workflow en attente → entretien → accepté/refusé |

### Intelligence Artificielle

| Fonctionnalité | Technologie | Description |
|----------------|-------------|-------------|
| **Prédiction Churn** | Random Forest (scikit-learn) | Score de risque de départ + explication SHAP |
| **Analyse CV** | Gemini 2.5 Flash | Matching sémantique CV ↔ fiche de poste |
| **Recruteur IA Vocal** | Vapi WebRTC + Gemini | Entretien vocal IA avec feedback structuré |
| **Chatbot RH** | Multi-LLM (Gemini / OpenAI / Anthropic / Grok) | Assistant contextuel avec actions (chercher employé, créer congé...) |
| **Ré-entraînement Auto** | Celery Beat (hebdomadaire) | Le modèle churn se ré-entraîne automatiquement chaque semaine |

### Sécurité & Authentification

- JWT (access 30 min, refresh 7 jours)
- Argon2 (hachage des mots de passe)
- OTP email 6 chiffres (brute-force : verrouillage 15 min après 5 tentatives)
- RBAC : 4 rôles (Admin, RH, Employé, Candidat)
- Logs d'audit (`AuditLog`) pour toutes les actions critiques
- Export RGPD des données personnelles (endpoint dédié)

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Frontend  React 18 + TypeScript + Vite       │
│  Pages · Composants · Services Axios · React Query        │
└────────────────────────┬─────────────────────────────────┘
                         │  REST API (JWT)
┌────────────────────────▼─────────────────────────────────┐
│              Backend  Django 6 + DRF                      │
│  users · personnel · recruitment · leaves · ai · ai_engine│
│  Celery Workers  │  Celery Beat (cron hebdo)              │
└──────┬───────────┴──────────────────────┬────────────────┘
       │                                  │
┌──────▼───────┐              ┌───────────▼──────────────┐
│  PostgreSQL  │              │  Redis (cache + Celery)  │
└──────────────┘              └──────────────────────────┘
                                          │
              ┌───────────────────────────▼───────────────┐
              │  IA externe                                │
              │  Gemini 2.5 Flash · OpenAI · Anthropic     │
              │  Grok · Vapi (WebRTC voice)                │
              └───────────────────────────────────────────┘
```

### Structure du Projet

```
Smart-HR/
├── Backend/
│   ├── config/                 # Settings Django (base / local / production)
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── local.py
│   │   │   └── production.py
│   │   └── urls.py
│   ├── smart_hr/
│   │   ├── users/              # Auth JWT, OTP, RBAC
│   │   ├── personnel/          # Employés, départements, postes
│   │   ├── recruitment/        # Offres d'emploi, candidatures, analyse CV
│   │   ├── leaves/             # Demandes et validation de congés
│   │   ├── attendance/         # Pointage et présences
│   │   ├── payroll/            # Salaires et fiches de paie
│   │   ├── documents/          # Gestion documentaire
│   │   ├── training/           # Formations et réunions
│   │   ├── tasks/              # Gestion des tâches (Kanban)
│   │   ├── ai/                 # Chatbot multi-LLM + actions RH
│   │   ├── ai_engine/          # Prédiction churn (Random Forest)
│   │   └── core/               # Modèles partagés (AuditLog)
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── local.txt
│   │   └── production.txt
│   └── Dockerfile
│
├── Frontend/
│   ├── src/
│   │   ├── pages/              # Toutes les pages (dashboard, recrutement, IA...)
│   │   ├── components/         # Composants réutilisables
│   │   ├── services/           # Couche Axios (authService, recruitmentService...)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilitaires et helpers
│   │   └── types/              # Types TypeScript partagés
│   ├── public/
│   │   ├── logo.svg            # Logo icône seul
│   │   └── logo-lockup.svg     # Logo + texte
│   └── Dockerfile
│
├── nginx/                       # Configuration reverse proxy
├── docker-compose.yml
└── .github/workflows/           # CI/CD GitHub Actions
```

---

## Démarrage Rapide

### Prérequis

- Python 3.13
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker (optionnel, recommandé)

### Avec Docker (recommandé)

```bash
git clone https://github.com/Zoubeir23/Smart-HR.git
cd Smart-HR

# Copier et configurer les variables d'environnement
cp Backend/.envs/.local/.django.example Backend/.envs/.local/.django
cp Frontend/.env.example Frontend/.env
# Éditer les fichiers .env avec vos clés API

# Lancer tous les services
docker compose up -d

# Initialiser la base de données
docker compose exec django python manage.py migrate
docker compose exec django python manage.py seed_demo_data

# L'application est disponible sur http://localhost:8080
```

### Installation Manuelle

#### Backend

```bash
cd Backend

# Créer l'environnement virtuel (uv recommandé)
pip install uv
uv venv && source .venv/bin/activate

# Installer les dépendances
uv pip install -r requirements/local.txt

# Variables d'environnement
cp .envs/.local/.django.example .envs/.local/.django
# Éditer le fichier avec vos paramètres

# Base de données
python manage.py migrate
python manage.py seed_demo_data

# Lancer le serveur
python manage.py runserver
# API disponible sur http://localhost:8000/api/v1/
```

#### Frontend

```bash
cd Frontend

# Installer les dépendances
npm install

# Variables d'environnement
cp .env.example .env
# Éditer .env : VITE_API_URL=http://localhost:8000

# Lancer le serveur de développement
npm run dev
# Interface disponible sur http://localhost:5173
```

#### Workers Celery (pour ré-entraînement churn, tâches async)

```bash
cd Backend
# Worker
celery -A config.celery_app worker --loglevel=info

# Scheduler (Celery Beat)
celery -A config.celery_app beat --loglevel=info
```

### Comptes de Démonstration

| Rôle | Email | Mot de passe | Accès |
|------|-------|-------------|-------|
| **Admin** | `admin@smarthr.com` | `admin123` | Tout + gestion utilisateurs |
| **RH** | `rh@smarthr.com` | `rh123` | Dashboard RH, IA, recrutement, congés |
| **Employé** | `employee@smarthr.com` | `employee123` | Profil, congés, tâches |
| **Candidat** | `candidate@smarthr.com` | `candidate123` | Offres d'emploi, postuler |

---

## IA Intégrée

### Prédiction de Churn (Machine Learning)

Le modèle Random Forest est entraîné sur le dataset IBM HR Analytics (1 470 employés, 35 features). Il prédit la probabilité de départ d'un employé avec un score 0–100 % et affiche la cause principale identifiée.

```bash
# Ré-entraîner manuellement le modèle
python manage.py train_churn_model

# Ou déclencher via l'API (RH/Admin uniquement)
POST /api/v1/ai-engine/retrain/
```

Le ré-entraînement automatique s'exécute chaque semaine via Celery Beat (configurable dans `CELERY_BEAT_SCHEDULE`).

### Analyse de CV (Gemini 2.5 Flash)

Lors d'une candidature, Gemini analyse le CV en PDF et génère un score de matching sémantique (0–100) par rapport à la description du poste. Le score est stocké sur le modèle `Application` et filtrable depuis le dashboard RH.

### Recruteur IA Vocal (Vapi)

La page `/ai/recruteur` intègre le SDK Vapi WebRTC pour conduire des entretiens vocaux IA en temps réel. Un feedback structuré (points forts, points faibles, recommandation) est généré automatiquement à la fin de chaque session.

Configuration requise :
```env
VITE_VAPI_PUBLIC_KEY=votre_cle_publique_vapi
```

### Chatbot RH Multi-LLM

L'assistant conversationnel supporte 4 fournisseurs de LLM configurables :

| Fournisseur | Modèle par défaut | Variable d'env |
|-------------|------------------|----------------|
| **Google Gemini** (défaut) | `gemini-2.5-flash` | `GEMINI_API_KEY` |
| **OpenAI** | `gpt-4o-mini` | `OPENAI_API_KEY` |
| **Anthropic** | `claude-3-5-haiku` | `ANTHROPIC_API_KEY` |
| **xAI Grok** | `grok-3-mini` | `GROK_API_KEY` |

Le chatbot détecte la confusion de l'utilisateur (2 réponses consécutives hors-contexte) et propose automatiquement une escalade vers un RH humain.

---

## Déploiement

### Production avec Dokploy (VPS)

Le projet est déployé sur VPS avec Dokploy comme orchestrateur Docker. La configuration complète est disponible dans `Docs/`.

```bash
# Variables d'environnement de production critiques
DATABASE_URL=postgres://...
REDIS_URL=redis://...
SECRET_KEY=...
DJANGO_SETTINGS_MODULE=config.settings.production

# IA
GEMINI_API_KEY=...
VITE_VAPI_PUBLIC_KEY=...

# Email (SMTP Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...  # App password Gmail
```

### CI/CD GitHub Actions

Le pipeline CI/CD (`.github/workflows/`) se déclenche sur chaque push vers `main` :

1. Tests Django (`pytest`)
2. Build et push de l'image Docker
3. Déploiement automatique sur le VPS

### Nginx

Le fichier `nginx/nginx.conf` sert de reverse proxy :
- `/api/` → Django (port 8000)
- `/` → Frontend React (port 80)
- Compression gzip activée
- Headers de sécurité configurés

---

## Variables d'Environnement

### Backend (`Backend/.envs/.local/.django`)

```env
# Django
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Base de données
DATABASE_URL=postgres://postgres:password@localhost:5432/smarthr

# Cache & Celery
REDIS_URL=redis://localhost:6379/0

# Email (OTP)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=your_app_password

# IA
GEMINI_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GROK_API_KEY=...
```

### Frontend (`Frontend/.env`)

```env
VITE_API_URL=http://localhost:8000
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key
```

---

## Tests

```bash
# Backend — tests unitaires et d'intégration
cd Backend
pytest

# Avec couverture
pytest --cov=smart_hr --cov-report=term-missing

# Frontend — type checking
cd Frontend
npx tsc --noEmit

# Linting
npm run lint
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Comptes Démo](Docs/COMPTES_DEMO.md) | Identifiants de démonstration |
| [Guide Déploiement](Docs/Deployment/) | Instructions complètes VPS/Docker |
| [Audit Sécurité](Docs/Audit/) | Rapport d'audit et checklist de sécurité |
| [Rapport VPS](memoire-soutenence/vps/vpd.md) | Validation complète du déploiement production |

---

## Contribution

1. Forker le dépôt
2. Créer une branche : `git checkout -b Feature/XXX-description`
3. Commiter : `git commit -m "feat: description"`
4. Pousser : `git push origin Feature/XXX-description`
5. Ouvrir une Pull Request

---

## Auteur

**Zoubeir Ibrahima Ba** — Projet de soutenance HESTAFRICA 2026

[GitHub](https://github.com/Zoubeir23)

---

## Licence

MIT — voir [LICENSE](LICENSE)

---

<div align="center">

<img src="Frontend/public/logo.svg" alt="Smart-HR" width="40" height="40" />

<br/>

**Smart-HR** · SIRH Intelligent · HESTAFRICA 2026

</div>
