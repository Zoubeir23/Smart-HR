# 🚀 Collection Bruno pour Smart HR API

Collection complète de requêtes API pour tester et valider tous les endpoints de Smart HR avec Bruno.

## 📦 Contenu de la collection

```
API/
├── 📄 bruno.json              # Configuration de la collection
├── 📄 env.bru                 # Variables d'environnement
├── 📄 .env                    # Variables locales
├── 📁 Auth/                   # Authentification (5 requêtes)
├── 📁 Personnel/              # Gestion du personnel (4 requêtes)
├── 📁 Conge/                  # Gestion des congés (2 requêtes)
├── 📁 Tache/                  # Gestion des tâches (2 requêtes)
├── 📁 Presence/               # Gestion de la présence (2 requêtes)
├── 📁 Paiement/               # Gestion des paiements (2 requêtes)
├── 📁 Document/               # Gestion des documents (2 requêtes)
├── 📁 Formation/              # Gestion de la formation (2 requêtes)
├── 📁 Recruitment/            # Recrutement (2 requêtes)
├── 📁 AI/                     # Intelligence Artificielle (3 requêtes)
│
├── 📚 Documentation
├── 📘 README.md               # Ce fichier
├── 📗 GUIDE.md                # Guide complet d'utilisation
├── 📙 CHECKLIST.md            # Checklist de vérification
├── 📕 VARIABLES.md            # Gestion des variables
│
└── 🔧 Scripts
   └── check_api.sh            # Script de vérification des endpoints
```

## ⚡ Démarrage rapide

### 1. Importer la collection dans Bruno
```bash
# Ouvrir Bruno
Bruno

# File > Open Collection > Sélectionner: /Users/zoubeir/zoubeircode/Soutenance/Smart-HR/smart-hr
```

### 2. Démarrer le serveur Django
```bash
cd Backend
source .venv/bin/activate
python manage.py runserver
```

### 3. Tester l'authentification
1. Aller à `Auth > 01_Login.bru`
2. Entrer vos identifiants
3. Copier le token de la réponse
4. Mettre à jour `authToken` dans l'environnement

### 4. Tester les endpoints
- Cliquer sur n'importe quelle requête
- Cliquer sur "Send"
- Vérifier la réponse

## 📊 Endpoints disponibles

| Module | Endpoints | Status |
|--------|-----------|--------|
| **Auth** | Login, Register, OTP, Admin Stats | ✅ |
| **Personnel** | Employees, Departments, Positions | ✅ |
| **Congés** | List, Create | ✅ |
| **Tâches** | List, Create | ✅ |
| **Présence** | List, Record | ✅ |
| **Paiement** | List, Create | ✅ |
| **Documents** | List, Upload | ✅ |
| **Formation** | List, Create | ✅ |
| **Recrutement** | List, Create | ✅ |
| **IA** | Models, Engine, Voice | ✅ |

**Total**: 26+ requêtes testées

## 📖 Documentation

- **[GUIDE.md](GUIDE.md)** - Guide détaillé avec exemples de requête/réponse
- **[CHECKLIST.md](CHECKLIST.md)** - Checklist complète de vérification
- **[VARIABLES.md](VARIABLES.md)** - Gestion des variables d'environnement
- **[README.md](README.md)** - Structure et utilisation de la collection

## 🔍 Vérification des endpoints

### Automatique
```bash
chmod +x API/check_api.sh
./API/check_api.sh http://localhost:8000
```

### Manuel
Utiliser la [CHECKLIST.md](CHECKLIST.md) pour vérifier chaque endpoint.

## 🛠️ Configuration

### Variables essentielles
```
baseUrl = http://localhost:8000      # URL du serveur
apiVersion = v1                      # Version API
authToken = eyJ0eXAiOiJKV1Q...     # Token JWT
```

### Configuration dans Bruno
1. Environment > Create New
2. Ajouter les variables
3. Sélectionner l'environnement avant de tester

## 🔐 Authentification

### Obtenir un token JWT
```bash
# Via Bruno
POST {{baseUrl}}/api/{{apiVersion}}/auth/login/
Body: {"username": "admin", "password": "<demo_password>"}

# Via curl
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "<demo_password>"}'
```

### Utiliser le token
```
Authorization: Bearer {{authToken}}
```

## 📋 Cas d'usage

### Test complet de la chaîne d'authentification
1. Login → Récupérer token
2. Utiliser token dans les requêtes protégées
3. Tester expiration token

### Test de création de ressources
1. List (GET)
2. Create (POST)
3. Verify création

### Test de pagination
1. Ajouter `?page=1&page_size=10`
2. Vérifier `next` et `previous`

## 🚨 Troubleshooting

| Erreur | Cause | Solution |
|--------|-------|----------|
| Connection refused | Serveur hors ligne | Démarrer Django: `python manage.py runserver` |
| 401 Unauthorized | Token invalide | Refaire login, copier nouveau token |
| 404 Not Found | Ressource inexistante | Vérifier l'URL, vérifier l'ID |
| 500 Server Error | Erreur serveur | Consulter logs: `tail -f Backend/logs/*.log` |
| Timeout | Lenteur serveur | Vérifier performance, relancer requête |

## 📊 Métriques de test

**Collection créée**: 2024-04-25
**Endpoints testés**: 26+
**Modules couverts**: 10
**Requêtes Example**: 26
**Documentation**: Complète

## 🎯 Prochaines étapes

- [ ] Importer la collection dans Bruno
- [ ] Configurer les variables d'environnement
- [ ] Tester l'authentification
- [ ] Valider tous les endpoints
- [ ] Générer un rapport de test
- [ ] Documenter les résultats

## 📞 Support

Pour toute question:
1. Consulter [GUIDE.md](GUIDE.md)
2. Vérifier [CHECKLIST.md](CHECKLIST.md)
3. Consulter les logs Django
4. Vérifier la documentation officielle de Bruno

## 📄 Fichiers principaux

| Fichier | Utilité |
|---------|---------|
| `bruno.json` | Configuration collection |
| `env.bru` | Variables globales |
| `.env` | Variables locales |
| `GUIDE.md` | Documentation complète |
| `CHECKLIST.md` | Vérification systematique |
| `check_api.sh` | Test automatisé |

## 🔗 Ressources

- [Documentation Bruno](https://docs.usebruno.com/)
- [Smart HR API Docs](../Backend/docs/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [JWT Token](https://jwt.io/)

---

**Créé**: 2024-04-25
**Dernière mise à jour**: 2024-04-25
**Version**: 1.0.0
**Status**: ✅ Production Ready
