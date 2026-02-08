# 🚀 Smart-HR - Guide de Démarrage Rapide

## 📋 Prérequis

- Python 3.10+ installé
- Node.js 18+ et npm installés
- PostgreSQL 15 installé et en cours d'exécution
- Git installé

---

## ⚡ Démarrage Rapide (5 minutes)

### 1️⃣ Configuration Backend

```bash
# Naviguer vers le backend
cd Backend

# Activer l'environnement virtuel
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Vérifier/installer les dépendances
pip install -r requirements.txt

# Appliquer les migrations
python src/manage.py makemigrations
python src/manage.py migrate

# Créer un superuser (optionnel)
python src/manage.py createsuperuser

# Vérifier la santé du backend
python check_health.py

# Lancer le serveur
python src/manage.py runserver
```

**Backend lancé sur :** http://localhost:8000

---

### 2️⃣ Configuration Frontend

```bash
# Ouvrir un NOUVEAU terminal
cd Frontend

# Installer les dépendances (si nécessaire)
npm install

# Lancer le serveur de développement
npm run dev
```

**Frontend lancé sur :** http://localhost:5173

---

## 👤 Comptes de Test

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| `admin@smarthr.com` | `admin123` | ADMIN |
| `rh@smarthr.com` | `rh123` | RH |
| `employee@smarthr.com` | `emp123` | EMPLOYEE |
| `candidate@smarthr.com` | `cand123` | CANDIDATE |

---

## 🧪 Tests Rapides

### Test 1 : Dashboard RH
1. Se connecter avec `rh@smarthr.com` / `rh123`
2. Vérifier que le **RetentionChart** affiche des données (pas de valeurs en dur)
3. Vérifier que le **ChurnGauge** affiche un nombre
4. Cliquer sur **"Approuver"** un congé en attente
5. Vérifier qu'un toast "Congé approuvé" apparaît

### Test 2 : Création de Tâche
1. Aller sur **"Tâches"** dans le menu
2. Cliquer sur **"Nouvelle tâche"**
3. Remplir le formulaire (titre, assigné, priorité, date)
4. Cliquer sur **"Créer"**
5. Vérifier qu'un toast "Tâche créée" apparaît
6. Vérifier que la tâche apparaît dans la colonne "À faire"

### Test 3 : Création de Congé
1. Se connecter avec `employee@smarthr.com` / `emp123`
2. Aller sur **"Congés"** dans le menu
3. Cliquer sur **"Nouvelle demande"**
4. Remplir le formulaire (type, dates, motif)
5. Cliquer sur **"Soumettre"**
6. Vérifier qu'un toast "Demande envoyée" apparaît

### Test 4 : RBAC (Contrôle d'Accès)
1. Se connecter avec `employee@smarthr.com` / `emp123`
2. Aller sur le Dashboard
3. **Vérifier** : Le bouton "Nouvel employé" NE doit PAS être visible
4. Se déconnecter et se reconnecter avec `rh@smarthr.com`
5. **Vérifier** : Le bouton "Nouvel employé" DOIT être visible

---

## 🐛 Dépannage

### Erreur : "Port 8000 already in use"
```bash
# Trouver et tuer le processus
# Linux/Mac:
lsof -ti:8000 | xargs kill -9
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Erreur : "Module not found"
```bash
# Backend
cd Backend
pip install -r requirements.txt

# Frontend
cd Frontend
npm install
```

### Erreur : "Database connection failed"
```bash
# Vérifier que PostgreSQL est lancé
# Linux:
sudo systemctl status postgresql
# Mac:
brew services list
# Windows:
# Vérifier dans Services Windows

# Vérifier la configuration dans Backend/src/gestion_taches/settings.py
```

### Erreur : "CSRF token missing"
```bash
# Vérifier que CORS_ALLOWED_ORIGINS inclut http://localhost:5173
# Backend/src/gestion_taches/settings.py
```

---

## 📊 Endpoints API Principaux

### Authentification
- `POST /api/auth/login/` - Login
- `POST /api/auth/logout/` - Logout
- `POST /api/auth/register/` - Register

### Personnel
- `GET /api/personnel/employees/` - Liste des employés
- `GET /api/personnel/employees/me/` - Mon profil
- `GET /api/personnel/employees/stats/` - Statistiques RH
- `GET /api/personnel/employees/retention_stats/` - Stats rétention

### Congés
- `GET /api/conges/leaves/` - Liste des congés
- `POST /api/conges/leaves/` - Créer une demande
- `PATCH /api/conges/leaves/{id}/approve/` - Approuver
- `PATCH /api/conges/leaves/{id}/reject/` - Refuser

### Tâches
- `GET /api/taches/tasks/` - Liste des tâches
- `POST /api/taches/tasks/` - Créer une tâche
- `PATCH /api/taches/tasks/{id}/update-status/` - Changer statut

### IA
- `GET /api/ai-engine/predictions/` - Prédictions churn
- `GET /api/ai-engine/high-risk/` - Employés à risque
- `POST /api/genai/chat/` - Chat AI

---

## 📁 Structure du Projet

```
Smart-HR/
├── Backend/
│   ├── src/
│   │   ├── gestion_taches/     # Configuration Django
│   │   ├── personnel/          # Gestion employés
│   │   ├── conge/              # Gestion congés
│   │   ├── tache/              # Gestion tâches
│   │   ├── ai_engine/          # Prédiction churn
│   │   ├── genai/              # Chat AI
│   │   └── ...
│   ├── venv/                   # Environnement virtuel
│   └── requirements.txt
│
├── Frontend/
│   ├── src/
│   │   ├── pages/              # Pages React
│   │   ├── components/         # Composants
│   │   ├── services/           # API services
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
│
├── CLAUDE.md                   # Cahier des charges
├── DEPLOYMENT_READY.md         # Statut de déploiement
├── SECURITY_INCIDENT.md        # Incident de sécurité
└── QUICKSTART.md               # Ce fichier
```

---

## 🎯 Checklist Avant Présentation

- [ ] Backend Django lancé sans erreurs
- [ ] Frontend React lancé sans erreurs
- [ ] Login fonctionne avec les 4 comptes de test
- [ ] Dashboard RH affiche les vraies données (pas de mocks)
- [ ] Création de tâche fonctionne
- [ ] Création de congé fonctionne
- [ ] Approve/Reject congés affiche des toasts
- [ ] Boutons RBAC corrects (Nouvel employé visible uniquement pour RH/Admin)

---

## 📞 Support

**Documentation :**
- Cahier des charges complet : `CLAUDE.md`
- Statut de déploiement : `DEPLOYMENT_READY.md`
- Incident de sécurité : `SECURITY_INCIDENT.md`

**Problèmes connus :**
- Clé ZHIPU API à renouveler (voir `SECURITY_INCIDENT.md`)
- Build warning "chunk >500KB" (normal, ignorer)

---

**Bonne démo ! 🚀**
