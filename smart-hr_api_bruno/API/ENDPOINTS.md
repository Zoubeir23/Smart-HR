# 📡 Résumé des Endpoints - Smart HR API

## 🔐 Authentification (5 endpoints)

| # | Method | Endpoint | Description | Auth |
|---|--------|----------|-------------|------|
| 1 | POST | `/api/v1/auth/login/` | Connexion utilisateur | ❌ |
| 2 | POST | `/api/v1/auth/registration/` | Enregistrement utilisateur | ❌ |
| 3 | POST | `/api/v1/auth/register/candidate/` | Enregistrement candidat | ❌ |
| 4 | POST | `/api/v1/auth/verify-otp/` | Vérifier OTP | ❌ |
| 5 | POST | `/api/v1/auth/resend-otp/` | Renvoyer OTP | ❌ |
| 6 | GET | `/api/v1/auth/admin/stats/` | Stats administrateur | ✅ |

## 👥 Personnel (4 endpoints)

| # | Method | Endpoint | Description | Auth |
|---|--------|----------|-------------|------|
| 1 | GET | `/api/v1/personnel/employees/` | Lister employés | ✅ |
| 2 | POST | `/api/v1/personnel/employees/` | Créer employé | ✅ |
| 3 | GET | `/api/v1/personnel/departments/` | Lister départements | ✅ |
| 4 | GET | `/api/v1/personnel/positions/` | Lister postes | ✅ |

## 🏖️ Congés (2 endpoints)

| # | Method | Endpoint | Description | Auth |
|---|--------|----------|-------------|------|
| 1 | GET | `/api/v1/conge/` | Lister congés | ✅ |
| 2 | POST | `/api/v1/conge/` | Créer demande congé | ✅ |

## ✅ Tâches (2 endpoints)

| # | Method | Endpoint | Description | Auth |
|---|--------|----------|-------------|------|
| 1 | GET | `/api/v1/tache/` | Lister tâches | ✅ |
| 2 | POST | `/api/v1/tache/` | Créer tâche | ✅ |

## 📍 Présence (2 endpoints)

| # | Method | Endpoint | Description | Auth |
|---|--------|----------|-------------|------|
| 1 | GET | `/api/v1/presence/` | Lister présences | ✅ |
| 2 | POST | `/api/v1/presence/` | Enregistrer présence | ✅ |

## 💰 Paiement (2 endpoints)

| # | Method | Endpoint | Description | Auth |
|---|--------|----------|-------------|------|
| 1 | GET | `/api/v1/paiement/` | Lister paiements | ✅ |
| 2 | POST | `/api/v1/paiement/` | Créer paiement | ✅ |

## 📄 Documents (2 endpoints)

| # | Method | Endpoint | Description | Auth |
|---|--------|----------|-------------|------|
| 1 | GET | `/api/v1/document/` | Lister documents | ✅ |
| 2 | POST | `/api/v1/document/` | Uploader document | ✅ |

## 📚 Formation (2 endpoints)

| # | Method | Endpoint | Description | Auth |
|---|--------|----------|-------------|------|
| 1 | GET | `/api/v1/formation/` | Lister formations | ✅ |
| 2 | POST | `/api/v1/formation/` | Créer formation | ✅ |

## 🎯 Recrutement (2 endpoints)

| # | Method | Endpoint | Description | Auth |
|---|--------|----------|-------------|------|
| 1 | GET | `/api/v1/recruitment/` | Lister offres | ✅ |
| 2 | POST | `/api/v1/recruitment/` | Créer offre | ✅ |

## 🤖 Intelligence Artificielle (3 endpoints)

| # | Method | Endpoint | Description | Auth |
|---|--------|----------|-------------|------|
| 1 | GET | `/api/v1/ai/` | Lister modèles IA | ✅ |
| 2 | POST | `/api/v1/ai-engine/query/` | Interroger moteur IA | ✅ |
| 3 | POST | `/api/v1/agents/voice/ask/` | Question vocale | ✅ |

## 📊 Statistiques

- **Total endpoints**: 26+
- **Endpoints publics**: 5 (authentification)
- **Endpoints protégés**: 21+
- **GET requests**: 13
- **POST requests**: 13
- **PUT/PATCH/DELETE**: À implémenter

## 🔗 Structure des URLs

```
Base URL: http://localhost:8000
API Version: v1
Format: /api/{version}/{module}/{resource}/
```

## 📝 Types d'authentification

### Public (sans token)
```http
POST /api/v1/auth/login/
```

### Protégé (avec JWT token)
```http
GET /api/v1/personnel/employees/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

## 🔄 Flux d'authentification

```
1. POST /api/v1/auth/login/
   ↓ (obtenir token)
2. GET /api/v1/personnel/employees/ + Bearer token
   ↓ (accès autorisé)
3. ✅ Données retournées
```

## 🚨 Codes de réponse

### Succès
- `200 OK` - Requête réussie
- `201 Created` - Ressource créée

### Erreurs client
- `400 Bad Request` - Erreur de requête
- `401 Unauthorized` - Token manquant/invalide
- `403 Forbidden` - Accès refusé
- `404 Not Found` - Ressource inexistante

### Erreurs serveur
- `500 Server Error` - Erreur serveur
- `503 Service Unavailable` - Service indisponible

## 📍 Localisation des fichiers de requête

```
smart-hr/API/Auth/01_Login.bru                           → Login
smart-hr/API/Auth/02_Register_Candidate.bru             → Register
smart-hr/API/Auth/03_Verify_OTP.bru                     → Verify OTP
smart-hr/API/Auth/04_Resend_OTP.bru                     → Resend OTP
smart-hr/API/Auth/05_Admin_Stats.bru                    → Admin Stats
smart-hr/API/Personnel/01_List_Employees.bru            → List
smart-hr/API/Personnel/02_Create_Employee.bru           → Create
smart-hr/API/Personnel/03_List_Departments.bru          → Departments
smart-hr/API/Personnel/04_List_Positions.bru            → Positions
...
```

## 🎯 Modèle de réponse standard

```json
{
  "count": 25,
  "next": "http://localhost:8000/api/v1/personnel/employees/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "field1": "value1",
      "field2": "value2"
    }
  ]
}
```

## 📌 Points importants

1. ✅ **Tous les endpoints** sont dans la collection Bruno
2. ✅ **Variables** sont pré-configurées
3. ✅ **Documentation** est complète
4. ✅ **Checklist** de vérification disponible
5. ✅ **Script** d'automatisation fourni

---

**Dernière mise à jour**: 2024-04-25
**Status**: ✅ Prêt pour testing
