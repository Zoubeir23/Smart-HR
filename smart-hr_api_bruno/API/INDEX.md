# 📖 Index - Documentation Bruno Smart HR

## 📋 Fichiers de documentation

### 🎯 Pour commencer
1. **[QUICKSTART.md](QUICKSTART.md)** ⭐ **COMMENCER ICI**
   - Démarrage en 3 étapes
   - Test rapide en 1 minute
   - Configuration basique

### 📚 Guides complets
2. **[GUIDE.md](GUIDE.md)** - Guide détaillé
   - Installation de Bruno
   - Configuration complète
   - Exemples requête/réponse
   - Cas d'usage courants
   - Dépannage

3. **[ENDPOINTS.md](ENDPOINTS.md)** - Liste complète des API
   - 26+ endpoints listés
   - Organisé par module
   - Statuts HTTP
   - Types de réponses

4. **[CHECKLIST.md](CHECKLIST.md)** - Vérification systématique
   - 50+ points de contrôle
   - Checklist par module
   - Tests de sécurité
   - Rapport final

### 🔧 Configuration
5. **[VARIABLES.md](VARIABLES.md)** - Gestion des variables
   - Variables locales/production
   - Configuration dans Bruno
   - Variables dynamiques
   - Bonnes pratiques

6. **[README.md](README.md)** - Structure de la collection
   - Organisation des dossiers
   - Points de configuration
   - Authentification JWT
   - Cas d'utilisation

### 🛠️ Maintenance
7. **[MAINTENANCE.md](MAINTENANCE.md)** - Maintenance de la collection
   - Format des fichiers .bru
   - Ajouter nouvelles requêtes
   - Types de requêtes HTTP
   - Templates complets

### 📄 Autres
- **[README_COLLECTION.md](README_COLLECTION.md)** - Résumé collection
- **[.env](.env)** - Variables par défaut
- **[check_api.sh](check_api.sh)** - Script test automatisé
- **[bruno.json](bruno.json)** - Configuration Bruno
- **[env.bru](env.bru)** - Variables Bruno

## 🗂️ Structure des dossiers de requêtes

```
API/
├── Auth/                    # 5 requêtes d'authentification
│   ├── 01_Login.bru        # Connexion
│   ├── 02_Register_Candidate.bru  # Enregistrement
│   ├── 03_Verify_OTP.bru   # Vérification OTP
│   ├── 04_Resend_OTP.bru   # Renvoi OTP
│   └── 05_Admin_Stats.bru  # Statistiques admin
│
├── Personnel/               # 4 requêtes personnel
│   ├── 01_List_Employees.bru
│   ├── 02_Create_Employee.bru
│   ├── 03_List_Departments.bru
│   └── 04_List_Positions.bru
│
├── Conge/                   # 2 requêtes congés
│   ├── 01_List_Leave_Requests.bru
│   └── 02_Create_Leave_Request.bru
│
├── Tache/                   # 2 requêtes tâches
│   ├── 01_List_Tasks.bru
│   └── 02_Create_Task.bru
│
├── Presence/                # 2 requêtes présence
│   ├── 01_List_Attendance.bru
│   └── 02_Record_Attendance.bru
│
├── Paiement/                # 2 requêtes paiement
│   ├── 01_List_Payments.bru
│   └── 02_Create_Payment.bru
│
├── Document/                # 2 requêtes documents
│   ├── 01_List_Documents.bru
│   └── 02_Upload_Document.bru
│
├── Formation/               # 2 requêtes formation
│   ├── 01_List_Trainings.bru
│   └── 02_Create_Training.bru
│
├── Recruitment/             # 2 requêtes recrutement
│   ├── 01_List_Job_Postings.bru
│   └── 02_Create_Job_Posting.bru
│
└── AI/                      # 3 requêtes IA
    ├── 01_List_AI_Models.bru
    ├── 02_AI_Engine_Query.bru
    └── 03_Voice_Ask.bru
```

## 🎯 Workflows recommandés

### Workflow 1: Première utilisation
1. Lire: [QUICKSTART.md](QUICKSTART.md)
2. Importer collection dans Bruno
3. Configurer variables
4. Test Login
5. Test 1 endpoint simple

### Workflow 2: Test complet
1. Lire: [CHECKLIST.md](CHECKLIST.md)
2. Suivre chaque point
3. Documenter les résultats
4. Générer rapport

### Workflow 3: Développement API
1. Consulter: [ENDPOINTS.md](ENDPOINTS.md)
2. Utiliser: [VARIABLES.md](VARIABLES.md)
3. Tester: Chaque endpoint
4. Modifier si besoin: [MAINTENANCE.md](MAINTENANCE.md)

### Workflow 4: Déploiement
1. Changer baseUrl en URL production
2. Obtenir token production
3. Tester endpoints clés
4. Générer rapport de test

## 📌 Points clés

### Configuration initiale
- [ ] Bruno installé
- [ ] Collection importée
- [ ] baseUrl configuré
- [ ] Token JWT obtenu

### Test recommandé
1. Auth > Login
2. Personnel > List
3. Conge > List
4. Tache > List

### Si erreur
1. Vérifier baseUrl
2. Vérifier token
3. Consulter logs Django
4. Relancer serveur

## 🔗 Ressources externes

- [Bruno Docs](https://docs.usebruno.com/)
- [REST API Best Practices](https://restfulapi.net/)
- [JWT Introduction](https://jwt.io/)
- [Django REST Framework](https://www.django-rest-framework.org/)

## 📞 Support rapide

| Situation | Action |
|-----------|--------|
| Besoin aide démarrage | Lire QUICKSTART.md |
| Besoin liste endpoints | Consulter ENDPOINTS.md |
| Erreur 401 | Refaire login, copier token |
| Erreur 404 | Vérifier URL et IDs |
| Erreur 500 | Consulter logs Django |
| Veux tester tout | Suivre CHECKLIST.md |
| Veux ajouter requête | Lire MAINTENANCE.md |

## 📊 Statistiques

- **Fichiers documentation**: 10+
- **Fichiers requêtes**: 26+
- **Modules API**: 10
- **Total endpoints**: 26+
- **Taille collection**: ~100 KB

## ✅ Checklist complet

- ✅ Collection Bruno créée
- ✅ 26+ requêtes configurées
- ✅ Documentation complète
- ✅ Guide d'utilisation
- ✅ Checklist de test
- ✅ Script d'automatisation
- ✅ Exemples requête/réponse
- ✅ Gestion des variables
- ✅ Guide de maintenance
- ✅ Template de requête

## 🚀 Prêt à utiliser

| Étape | Status |
|-------|--------|
| Installation | ✅ Done |
| Configuration | ✅ Ready |
| Documentation | ✅ Complete |
| Test | ✅ Go |

---

**Navigation rapide**:
- ⭐ **[QUICKSTART.md](QUICKSTART.md)** - Commencer maintenant
- 📘 **[GUIDE.md](GUIDE.md)** - Guide complet
- ✅ **[CHECKLIST.md](CHECKLIST.md)** - Validation
- 📡 **[ENDPOINTS.md](ENDPOINTS.md)** - Liste API

**Date**: 2024-04-25  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
