# 🎯 Démarrage Rapide - Collection Bruno Smart HR

## ✅ Fichiers créés

**Collection complète avec 26+ requêtes d'API testées:**

```
smart-hr/API/
├── 📄 bruno.json                    # Configuration collection
├── 📄 env.bru                       # Variables d'environnement
├── 📄 .env                          # Configuration locale
│
├── 📁 Auth/                         # 5 requêtes d'authentification
├── 📁 Personnel/                    # 4 requêtes personnel
├── 📁 Conge/                        # 2 requêtes congés
├── 📁 Tache/                        # 2 requêtes tâches
├── 📁 Presence/                     # 2 requêtes présence
├── 📁 Paiement/                     # 2 requêtes paiement
├── 📁 Document/                     # 2 requêtes documents
├── 📁 Formation/                    # 2 requêtes formation
├── 📁 Recruitment/                  # 2 requêtes recrutement
├── 📁 AI/                           # 3 requêtes IA
│
└── 📚 Documentation
    ├── README.md                    # Structure collection
    ├── README_COLLECTION.md         # Résumé (ce fichier)
    ├── GUIDE.md                     # Guide complet (7KB)
    ├── CHECKLIST.md                 # Checklist vérification (5KB)
    ├── VARIABLES.md                 # Gestion variables
    └── QUICKSTART.md                # Ce fichier
```

## 🚀 En 3 étapes

### Étape 1: Ouvrir Bruno
```bash
# macOS
brew install bruno
bruno

# Ou télécharger: https://www.usebruno.com/
```

### Étape 2: Importer la collection
1. Ouvrir Bruno
2. **File** → **Open Collection**
3. Sélectionner: `/Users/zoubeir/zoubeircode/Soutenance/Smart-HR/smart-hr`
4. ✅ Collection chargée !

### Étape 3: Démarrer l'API
```bash
cd Backend
source .venv/bin/activate
python manage.py runserver

# ✅ Serveur démarré: http://localhost:8000
```

## 🔐 Test rapide (1 min)

1. **Aller à**: Auth > 01_Login.bru
2. **Entrer**:
   ```json
   {
     "username": "admin",
     "password": "votre_mot_de_passe"
   }
   ```
3. **Cliquer**: "Send"
4. **Copier**: Le token `access` de la réponse
5. **Mettre à jour**: Variable `authToken` dans Bruno

## 📊 Premier test complet (5 min)

Suivre cet ordre dans Bruno:

- [ ] **Auth** > Login → Copier token
- [ ] **Personnel** > List Employees
- [ ] **Conge** > List Leave Requests
- [ ] **Tache** > List Tasks
- [ ] **Presence** > List Attendance

✅ Si tous répondent 200 OK, l'API fonctionne !

## 📚 Documentation disponible

### Pour commencer
- 📗 **GUIDE.md** - Guide complet avec exemples détaillés
- 📙 **CHECKLIST.md** - Tous les tests à faire
- 📕 **VARIABLES.md** - Gestion des variables

### Pour référence
- [Bruno Docs](https://docs.usebruno.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [JWT Tokens](https://jwt.io/)

## 🔧 Configuration (optionnel)

### Modifier l'URL de base
Fichier: `API/.env`
```
@baseUrl = http://localhost:8000    # Développement
@baseUrl = https://api.prod.com     # Production
```

### Utiliser différents environnements
Dans Bruno:
1. Environment → Create New
2. Nommer: "Local" ou "Production"
3. Ajouter les variables
4. Sélectionner avant test

## 🧪 Tests automatisés

```bash
chmod +x API/check_api.sh
./API/check_api.sh http://localhost:8000
```

Génère un rapport `api-test-report.md`

## ⚡ Points clés

| Point | Action |
|-------|--------|
| **URLs** | Utiliser `{{baseUrl}}` |
| **Token** | Mettre à jour après chaque login |
| **Erreur 401** | Token expiré, refaire login |
| **Erreur 404** | URL ou ID incorrects |
| **Erreur 500** | Consulter logs Django |

## 📝 Endpoint par endpoint

### ✅ Test simple
Cliquer sur une requête → Send → Vérifier le statut

### ✅ Test complet
Utiliser la [CHECKLIST.md](CHECKLIST.md) pour 50+ validations

### ✅ Test personnalisé
Dupliquer une requête → Modifier → Tester

## 🎓 Cas d'usage courants

### Obtenir un nouveau token
```
Auth → 01_Login.bru → Send → Copier "access"
```

### Lister tous les employés
```
Personnel → 01_List_Employees.bru → Send
```

### Créer un nouvel employé
```
Personnel → 02_Create_Employee.bru → Modifier body → Send
```

### Demander un congé
```
Conge → 02_Create_Leave_Request.bru → Modifier → Send
```

## 🆘 Troubleshooting rapide

### ❌ "Connection refused"
→ Démarrer Django: `python manage.py runserver`

### ❌ "401 Unauthorized"
→ Mettre à jour token: Auth > 01_Login

### ❌ "404 Not Found"
→ Vérifier URL et IDs des ressources

### ❌ "500 Server Error"
→ Consulter logs: `tail -f Backend/logs/*.log`

## ✨ Prochaines étapes

1. ✅ Importer collection Bruno
2. ✅ Configurer baseUrl
3. ✅ Tester authentification
4. ✅ Valider endpoints principaux
5. ⏭️ Utiliser pour développement
6. ⏭️ Générer rapport de test

## 📞 Besoin d'aide ?

1. Consulter **GUIDE.md** pour détails
2. Vérifier **CHECKLIST.md** pour validation
3. Consulter logs: `Backend/logs/`
4. Relancer le serveur Django

---

**Status**: ✅ Prêt à utiliser
**Créé**: 2024-04-25
**Version**: 1.0.0
