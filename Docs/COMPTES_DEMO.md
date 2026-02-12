# Comptes de démonstration Smart-HR

Pour tester le frontend, le backend doit être lancé et les données démo initialisées.

## Connexion rapide

Utilisez ces identifiants sur la page de login pour tester l'application :

| Rôle | Email | Mot de passe | Accès |
|------|-------|--------------|-------|
| **Admin** | `admin@smarthr.com` | `admin123` | Dashboard admin, sécurité, utilisateurs |
| **RH** | `rh@smarthr.com` | `rh123` | Dashboard RH, employés, congés, recrutement, IA |
| **Employé** | `employee@smarthr.com` | `employee123` | Mon profil, congés, tâches |
| **Candidat** | `candidate@smarthr.com` | `candidate123` | Offres d'emploi, mes candidatures |

## Initialiser les données démo

Depuis la racine du projet :

```bash
cd Backend/src
python manage.py migrate
python manage.py seed
```

## Lancer le projet

### 1. Backend (Django)
```bash
cd Backend/src
python manage.py runserver
# API : http://localhost:8000/api
```

### 2. Frontend (Vite)
```bash
cd Frontend
npm install
npm run dev
# UI : http://localhost:8080
```

### 3. Variables d'environnement

**Frontend** (`.env` dans `Frontend/`) :
```
VITE_API_URL=http://localhost:8000/api
```

**Backend** : PostgreSQL configuré dans `gestion_taches/settings.py` (ou `.env`).
