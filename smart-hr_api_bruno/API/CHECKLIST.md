# ✅ Checklist de Vérification des API Smart HR

## Avant de commencer

- [ ] Django server est en cours d'exécution (`python manage.py runserver`)
- [ ] Bruno est installé sur la machine
- [ ] Collection Bruno est importée dans Bruno
- [ ] Variables d'environnement sont configurées

## 1️⃣ Configuration initiale

- [ ] `baseUrl` est configuré à `http://localhost:8000`
- [ ] `apiVersion` est configuré à `v1`
- [ ] Fichier `API/.env` existe

## 2️⃣ Authentification

- [ ] Tester **Login** (Auth > 01_Login.bru)
  - Status attendu: **200 OK**
  - Réponse contient: `access`, `refresh`, `user`
- [ ] Copier le token `access` et le mettre dans `authToken`
- [ ] Vérifier que le token n'est pas vide
- [ ] Tester **Admin Stats** (Auth > 05_Admin_Stats.bru)
  - Status attendu: **200 OK** (si authentifié)

## 3️⃣ Module Personnel

### Endpoints publics
- [ ] **List Employees**: `GET /api/v1/personnel/employees/`
  - Status attendu: **200 OK** ou **401 Unauthorized**
- [ ] **List Departments**: `GET /api/v1/personnel/departments/`
- [ ] **List Positions**: `GET /api/v1/personnel/positions/`

### Endpoints de création
- [ ] **Create Employee**: `POST /api/v1/personnel/employees/`
  - Status attendu: **201 Created** (si autorisé)
  - Vérifier que les champs requis sont présents

## 4️⃣ Module Congés

- [ ] **List Leave Requests**: `GET /api/v1/conge/`
  - Status attendu: **200 OK**
- [ ] **Create Leave Request**: `POST /api/v1/conge/`
  - Status attendu: **201 Created**
  - Body doit contenir: `employee`, `start_date`, `end_date`

## 5️⃣ Module Tâches

- [ ] **List Tasks**: `GET /api/v1/tache/`
  - Status attendu: **200 OK**
- [ ] **Create Task**: `POST /api/v1/tache/`
  - Status attendu: **201 Created**

## 6️⃣ Module Présence

- [ ] **List Attendance**: `GET /api/v1/presence/`
  - Status attendu: **200 OK**
- [ ] **Record Attendance**: `POST /api/v1/presence/`
  - Status attendu: **201 Created**

## 7️⃣ Module Paiement

- [ ] **List Payments**: `GET /api/v1/paiement/`
  - Status attendu: **200 OK**
- [ ] **Create Payment**: `POST /api/v1/paiement/`
  - Status attendu: **201 Created**

## 8️⃣ Module Document

- [ ] **List Documents**: `GET /api/v1/document/`
  - Status attendu: **200 OK**
- [ ] **Upload Document**: `POST /api/v1/document/`
  - Status attendu: **201 Created**
  - Format attendu: `multipart/form-data`

## 9️⃣ Module Formation

- [ ] **List Trainings**: `GET /api/v1/formation/`
  - Status attendu: **200 OK**
- [ ] **Create Training**: `POST /api/v1/formation/`
  - Status attendu: **201 Created**

## 🔟 Module Recrutement

- [ ] **List Job Postings**: `GET /api/v1/recruitment/`
  - Status attendu: **200 OK**
- [ ] **Create Job Posting**: `POST /api/v1/recruitment/`
  - Status attendu: **201 Created**

## 🔟➕ Module IA

- [ ] **List AI Models**: `GET /api/v1/ai/`
  - Status attendu: **200 OK**
- [ ] **AI Engine Query**: `POST /api/v1/ai-engine/query/`
  - Status attendu: **200 OK**
- [ ] **Voice Ask**: `POST /api/v1/agents/voice/ask/`
  - Status attendu: **200 OK**

## 🔒 Tests de sécurité

- [ ] Vérifier que les endpoints sans token retournent **401 Unauthorized**
- [ ] Vérifier que les endpoints avec mauvais token retournent **401 Unauthorized**
- [ ] Vérifier que seuls les utilisateurs autorisés peuvent créer des ressources

## 🚨 Gestion des erreurs

### Tester les cas d'erreur:

- [ ] Requête avec données invalides → **400 Bad Request**
- [ ] Requête vers ressource inexistante → **404 Not Found**
- [ ] Requête sans authentification (protégée) → **401 Unauthorized**
- [ ] Requête sans permission → **403 Forbidden**
- [ ] Erreur serveur → **500 Server Error**

## 📊 Vérification finale

### Performance
- [ ] Les requêtes répondent en moins de 2 secondes
- [ ] Les requêtes list supportent la pagination
- [ ] Les requêtes list supportent les filtres

### Données
- [ ] Les réponses contiennent les champs attendus
- [ ] Les types de données sont corrects (string, number, date, etc.)
- [ ] Les timestamps sont au bon format ISO 8601

### Documentation
- [ ] Tous les endpoints sont documentés
- [ ] Les exemples de requête/réponse sont corrects
- [ ] Les codes d'erreur sont expliqués

## 📋 Rapport de test

Après avoir complété tous les tests, générer un rapport:

```bash
# Générer un rapport en markdown
./API/check_api.sh http://localhost:8000 > api-test-report.md
```

## ❓ Troubleshooting

| Problème | Solution |
|----------|----------|
| Connection refused | Vérifier que Django server est démarré |
| 401 Unauthorized | Vérifier le token JWT, refaire login |
| 404 Not Found | Vérifier l'URL, vérifier que la ressource existe |
| 500 Server Error | Consulter les logs Django |
| Timeout | Vérifier la connexion réseau, relancer la requête |

## 💾 Enregistrement des résultats

Document à partager:
- [ ] Résultats des tests (screenshot de Bruno)
- [ ] Rapport d'erreurs (si applicable)
- [ ] Performance metrics
- [ ] Notes sur les problèmes rencontrés

---

**Date de vérification**: _______________
**Vérifié par**: _______________
**Résultat global**: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL
**Commentaires**: _________________________________________________________________
