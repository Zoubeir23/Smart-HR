<div align="center">

# 🚀 Smart-HR

**Système de Gestion des Ressources Humaines Intelligent**

[![Django](https://img.shields.io/badge/Django-4.2-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

**Une solution complète de gestion RH avec IA intégrée pour optimiser vos processus de recrutement, formation et gestion des talents**

[📖 Documentation](#-documentation) • [🚀 Démarrage Rapide](#-démarrage-rapide) • [🎯 Fonctionnalités](#-fonctionnalités) • [🤖 IA Intégrée](#-ia-intégrée) • [📊 Architecture](#-architecture)

</div>

---

## 📋 Table des Matières

- [🎯 À Propos](#-à-propos)
- [✨ Fonctionnalités](#-fonctionnalités)
- [🏗️ Architecture](#-architecture)
- [🚀 Démarrage Rapide](#-démarrage-rapide)
- [⚙️ Configuration](#️-configuration)
- [🤖 IA Intégrée](#-ia-intégrée)
- [📚 Documentation](#-documentation)
- [🛠️ Développement](#️-développement)
- [🐛 Dépannage](#-dépannage)
- [🤝 Contribution](#-contribution)
- [📄 Licence](#-licence)

---

## 🎯 À Propos

**Smart-HR** est une plateforme de gestion des ressources humaines nouvelle génération qui combine les fonctionnalités RH traditionnelles avec l'intelligence artificielle pour offrir une expérience utilisateur exceptionnelle.

### 🎯 Objectifs Principaux

- ✅ **Centraliser** toutes les données RH en un seul endroit
- ✅ **Automatiser** les processus répétitifs
- ✅ **Optimiser** le recrutement avec l'IA
- ✅ **Améliorer** l'expérience employé
- ✅ **Faciliter** la prise de décision avec des analytics avancés

---

## ✨ Fonctionnalités

### 👥 Gestion des Employés

| Fonctionnalité | Description |
|----------------|-------------|
| 📋 **Profils Complets** | Gestion complète des informations personnelles et professionnelles |
| 📊 **Organigramme** | Visualisation interactive de la structure organisationnelle |
| 📈 **Évolution de Carrière** | Suivi des promotions, changements de poste et historique |
| 📁 **Documents** | Gestion sécurisée des documents employés |

### 🏖️ Gestion des Congés

| Fonctionnalité | Description |
|----------------|-------------|
| 📅 **Demandes en Ligne** | Soumission et suivi des demandes de congés |
| ✅ **Validation Workflow** | Processus d'approbation multi-niveaux |
| 📊 **Calendrier Partagé** | Vue d'ensemble des congés de l'équipe |
| 📈 **Analytics** | Statistiques et tendances des absences |

### 💰 Gestion de la Paie

| Fonctionnalité | Description |
|----------------|-------------|
| 💵 **Fiches de Paie** | Génération automatique des bulletins de salaire |
| 📊 **Déclarations** | Gestion des déclarations fiscales et sociales |
| 💳 **Avantages** | Suivi des avantages et primes |
| 📈 **Historique** | Archivage complet de l'historique salarial |

### 🎓 Formation & Développement

| Fonctionnalité | Description |
|----------------|-------------|
| 📚 **Catalogue de Formations** | Gestion des programmes de formation |
| 📊 **Suivi des Compétences** | Cartographie des compétences de l'équipe |
| 🎯 **Plans de Développement** - Plans personnalisés pour chaque employé |
| 📈 **Analytics** | Mesure de l'efficacité des formations |

### 📢 Recrutement

| Fonctionnalité | Description |
|----------------|-------------|
| 📝 **Offres d'Emploi** | Création et publication des annonces |
| 🤖 **IA Screening** | Filtrage automatique des candidatures avec l'IA |
| 📊 **Tableau de Bord** - Suivi en temps réel du pipeline de recrutement |
| 📧 **Communication** | Gestion centralisée des communications avec les candidats |

### 🏢 Présence & Pointage

| Fonctionnalité | Description |
|----------------|-------------|
| ⏰ **Pointage** | Enregistrement des heures de travail |
| 📍 **Géolocalisation** - Vérification de la présence |
| 📊 **Rapports** - Génération de rapports détaillés |
| 🔔 **Alertes** - Notifications d'anomalies |

### 🤖 IA Intégrée

| Fonctionnalité | Description |
|----------------|-------------|
| 🎯 **Recrutement Intelligent** | Matching automatique candidats-postes |
| 💬 **Chatbot RH** | Assistant virtuel pour les questions RH |
| 📊 **Prédictions** | Analyse prédictive du turnover |
| 🔍 **Analyse de Sentiment** - Évaluation du climat social |

---

## 🏗️ Architecture

### 📊 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React      │  │  TypeScript  │  │   Tailwind   │      │
│  │   18.x       │  │    5.x       │  │     CSS      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │   REST API    │
                    └───────┬───────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Django     │  │  PostgreSQL  │  │     Redis     │      │
│  │   4.2        │  │    15.x      │  │   (Cache)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │  AI Services  │
                    └───────┬───────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                     AI & ML Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   OpenAI     │  │  LangChain   │  │   Scikit-    │      │
│  │   GPT-4      │  │    Agents    │  │    Learn     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 🗂️ Structure du Projet

```
Smart-HR/
├── Backend/                    # Django Backend
│   ├── src/
│   │   ├── ai_agents/         # Agents IA (recrutement, voice)
│   │   ├── ai_engine/         # Moteur IA & ML
│   │   ├── utilisateur/       # Gestion des utilisateurs
│   │   ├── personnel/         # Gestion des employés
│   │   ├── conge/             # Gestion des congés
│   │   ├── paiement/          # Gestion de la paie
│   │   ├── formation/         # Formation & développement
│   │   ├── recruitment/       # Recrutement
│   │   ├── presence/          # Présence & pointage
│   │   └── document/          # Gestion des documents
│   └── requirements.txt       # Dépendances Python
│
├── Frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/        # Composants réutilisables
│   │   ├── pages/             # Pages de l'application
│   │   ├── services/          # Services API
│   │   ├── hooks/             # Custom React hooks
│   │   └── types/             # Types TypeScript
│   └── package.json           # Dépendances Node.js
│
├── Docs/                       # Documentation
│   ├── Audit/                 # Rapports d'audit
│   ├── Deployment/            # Guides de déploiement
│   ├── Presentation/          # Présentations
│   ├── Security/              # Documentation de sécurité
│   └── Documentation/          # Documentation générale
│
├── nginx/                      # Configuration Nginx
├── docker-compose.yml          # Docker Compose
├── Dockerfile.backend         # Docker Backend
└── Dockerfile.frontend        # Docker Frontend
```

---

## 🚀 Démarrage Rapide

### 📋 Prérequis

- [x] **Python** 3.10+
- [x] **Node.js** 18+
- [x] **PostgreSQL** 15+
- [x] **Docker** (optionnel)
- [x] **Git**

### 🔧 Installation

#### 1. Cloner le Dépôt

```bash
git clone https://github.com/Zoubeir23/Smart-HR.git
cd Smart-HR
```

#### 2. Backend (Django)

```bash
cd Backend

# Créer l'environnement virtuel
python -m venv venv

# Activer l'environnement (Windows)
venv\Scripts\activate

# Activer l'environnement (Linux/Mac)
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Configurer la base de données
cd src
python manage.py migrate

# Initialiser les données de démonstration
python manage.py seed

# Lancer le serveur
python manage.py runserver
```

L'API sera disponible sur [`http://localhost:8000/api`](http://localhost:8000/api)

#### 3. Frontend (React)

```bash
cd Frontend

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos configurations

# Lancer le serveur de développement
npm run dev
```

L'interface sera disponible sur [`http://localhost:8080`](http://localhost:8080)

#### 4. Avec Docker (Optionnel)

```bash
# Lancer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down
```

### 🔑 Comptes de Démonstration

| Rôle | Email | Mot de passe |
|------|-------|---------------|
| **Admin** | `admin@smarthr.com` | `admin123` |
| **RH** | `rh@smarthr.com` | `rh123` |
| **Employé** | `employee@smarthr.com` | `employee123` |
| **Candidat** | `candidate@smarthr.com` | `candidate123` |

---

## ⚙️ Configuration

### 🔐 Variables d'Environnement

#### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=Smart-HR
VITE_APP_VERSION=1.0.0
```

#### Backend (`.env`)

```env
# Database
DB_NAME=smarthr
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Django
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# AI Services
OPENAI_API_KEY=your-openai-api-key
```

### 🗄️ Configuration de la Base de Données

```python
# Backend/src/gestion_taches/settings.py

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT'),
    }
}
```

---

## 🤖 IA Intégrée

### 🎯 Agents IA

Smart-HR intègre plusieurs agents IA pour automatiser et optimiser les processus RH :

#### 1. Agent de Recrutement

```python
# Backend/src/ai_agents/recruitment_agent/services.py

class RecruitmentAgent:
    """
    Agent IA pour le recrutement intelligent
    - Analyse des CV
    - Matching candidats-postes
    - Scoring automatique
    """
```

**Fonctionnalités :**
- 📄 Analyse automatique des CV
- 🎯 Matching intelligent avec les offres
- 📊 Scoring des candidatures
- 💬 Génération de questions d'entretien

#### 2. Agent Vocal

```python
# Backend/src/ai_agents/voice_agent/services.py

class VoiceAgent:
    """
    Agent IA pour le support vocal
    - Réponses automatiques
    - Gestion des appels
    - Transcription en temps réel
    """
```

**Fonctionnalités :**
- 🎤 Reconnaissance vocale
- 💬 Réponses automatiques
- 📞 Gestion des appels
- 📝 Transcription en temps réel

### 🧴 Services IA

| Service | Description | API |
|---------|-------------|-----|
| **OpenAI GPT-4** | Génération de texte, analyse | [OpenAI API](https://openai.com/api/) |
| **LangChain** | Framework d'agents IA | [LangChain](https://langchain.com/) |
| **Scikit-Learn** | Machine Learning | [Scikit-Learn](https://scikit-learn.org/) |

---

## 📚 Documentation

### 📖 Guides Disponibles

| Guide | Description |
|-------|-------------|
| 🚀 [Démarrage Rapide](Docs/Deployment/QUICKSTART.md) | Guide d'installation rapide |
| 📦 [Déploiement](Docs/Deployment/DEPLOYMENT_READY.md) | Guide de déploiement en production |
| 🧪 [Tests](Docs/Deployment/GUIDE_TESTS_RAPIDES.md) | Guide de tests rapides |
| 🔐 [Comptes Démo](Docs/COMPTES_DEMO.md) | Comptes de démonstration |
| 📊 [Audit](Docs/Audit/AUDIT_FINAL_COMPLET.md) | Rapport d'audit complet |
| 🎯 [Présentation](Docs/Presentation/PRESENTATION_FINALE.md) | Présentation du projet |
| 🔒 [Sécurité](Docs/Security/SECURITY_INCIDENT.md) | Documentation de sécurité |

---

## 🛠️ Développement

### 🔨 Stack Technique

#### Backend

- **Framework** : Django 4.2
- **Langage** : Python 3.10+
- **Base de données** : PostgreSQL 15
- **Cache** : Redis
- **API** : Django REST Framework

#### Frontend

- **Framework** : React 18
- **Langage** : TypeScript 5
- **Styling** : Tailwind CSS
- **Routing** : React Router
- **State Management** : Zustand

#### IA & ML

- **LLM** : OpenAI GPT-4
- **Agents** : LangChain
- **ML** : Scikit-Learn
- **NLP** : spaCy

### 🧪 Tests

```bash
# Backend
cd Backend/src
python manage.py test

# Frontend
cd Frontend
npm test

# Tests avec couverture
npm run test:coverage
```

### 📊 Linting & Formatting

```bash
# Backend
pip install black flake8 pylint
black .
flake8 .
pylint .

# Frontend
npm run lint
npm run format
```

---

## 🐛 Dépannage

### ❓ Problèmes Courants

#### Problème : Erreur de connexion à la base de données

**Solution :**
```bash
# Vérifier que PostgreSQL est en cours d'exécution
pg_isready

# Vérifier les credentials dans .env
cat Backend/.env
```

#### Problème : Erreur de dépendances Node.js

**Solution :**
```bash
cd Frontend
rm -rf node_modules package-lock.json
npm install
```

#### Problème : Erreur de migration Django

**Solution :**
```bash
cd Backend/src
python manage.py makemigrations
python manage.py migrate
```

### 📞 Support

Pour plus d'aide, consultez la [Documentation](#-documentation) ou ouvrez une [Issue](https://github.com/Zoubeir23/Smart-HR/issues).

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Voici comment vous pouvez aider :

### 📋 Processus de Contribution

1. **Fork** le dépôt
2. **Créez** une branche (`git checkout -b feature/AmazingFeature`)
3. **Commit** vos changements (`git commit -m 'Add some AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrez** une Pull Request

### 🎯 Guidelines

- ✅ Suivez le style de code existant
- ✅ Ajoutez des tests pour les nouvelles fonctionnalités
- ✅ Mettez à jour la documentation
- ✅ Utilisez des messages de commit clairs

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 👥 Auteurs

- **Zoubeir** - *Développeur Principal* - [GitHub](https://github.com/Zoubeir23)

---

## 🙏 Remerciements

- [Django](https://www.djangoproject.com/) - Framework web Python
- [React](https://reactjs.org/) - Bibliothèque JavaScript
- [OpenAI](https://openai.com/) - API GPT-4
- [LangChain](https://langchain.com/) - Framework d'agents IA

---

<div align="center">

**⭐ Si vous aimez ce projet, n'oubliez pas de le star sur GitHub !**

[🔝 Retour en haut](#-smart-hr)

</div>
