# Guide d'utilisation de la Collection Bruno - Smart HR

## Installation de Bruno

### macOS
```bash
brew install bruno
# ou télécharger depuis https://www.usebruno.com/
```

### Autres OS
Télécharger depuis: https://www.usebruno.com/downloads

## Première utilisation

### 1. Démarrer le serveur Django
```bash
cd Backend
source .venv/bin/activate  # ou .venv\Scripts\activate sur Windows
python manage.py runserver
```

Le serveur est accessible à `http://localhost:8000`

### 2. Importer la collection dans Bruno

1. Ouvrir Bruno
2. Cliquer sur "New Collection"
3. Sélectionner le dossier `/Users/zoubeir/zoubeircode/Soutenance/Smart-HR/smart-hr`
4. La collection devrait se charger automatiquement

## Configuration des variables d'environnement

### Option 1: Via le fichier `.env`
Le fichier `API/.env` contient les variables par défaut:
```
@baseUrl = http://localhost:8000
@apiVersion = v1
@authToken = votre_jwt_token_ici
```

### Option 2: Via Bruno (interface)
1. Cliquer sur "Environment" en bas à gauche
2. Sélectionner "Create New"
3. Ajouter les variables:
   - `baseUrl`: `http://localhost:8000`
   - `apiVersion`: `v1`
   - `authToken`: Obtenu après login

## Flux de test recommandé

### Étape 1: Authentification
1. **Aller à**: Auth > 01_Login.bru
2. **Modifier le body** avec vos identifiants:
   ```json
   {
     "username": "admin",  // ou votre username
     "password": "votre_mot_de_passe"
   }
   ```
3. **Cliquer sur "Send"**
4. **Récupérer le token** de la réponse:
   ```json
   {
     "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
     "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
     "user": {...}
   }
   ```
5. **Mettre à jour** la variable `authToken` dans l'environnement

### Étape 2: Tester les endpoints principaux

#### Personnel
```
GET /api/v1/personnel/employees/
GET /api/v1/personnel/departments/
GET /api/v1/personnel/positions/
```

#### Congés
```
GET /api/v1/conge/
POST /api/v1/conge/ (créer une demande)
```

#### Tâches
```
GET /api/v1/tache/
POST /api/v1/tache/ (créer une tâche)
```

#### Présence
```
GET /api/v1/presence/
POST /api/v1/presence/ (enregistrer la présence)
```

## Exemples de requêtes avec réponses

### Authentification - Login

**Request:**
```http
POST /api/v1/auth/login/ HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "username": "admin",
  "password": "<demo_password>"
}
```

**Response (200 OK):**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "first_name": "Admin",
    "last_name": "User"
  }
}
```

### Personnel - List Employees

**Request:**
```http
GET /api/v1/personnel/employees/ HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

**Response (200 OK):**
```json
{
  "count": 25,
  "next": "http://localhost:8000/api/v1/personnel/employees/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "position": {
        "id": 1,
        "title": "Senior Developer"
      },
      "department": {
        "id": 1,
        "name": "IT"
      },
      "hire_date": "2022-01-15"
    }
  ]
}
```

### Personnel - Create Employee

**Request:**
```http
POST /api/v1/personnel/employees/ HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
Content-Type: application/json

{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "position": 2,
  "department": 1,
  "hire_date": "2024-04-25"
}
```

**Response (201 Created):**
```json
{
  "id": 26,
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "position": {
    "id": 2,
    "title": "Developer"
  },
  "department": {
    "id": 1,
    "name": "IT"
  },
  "hire_date": "2024-04-25"
}
```

### Congés - Create Leave Request

**Request:**
```http
POST /api/v1/conge/ HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
Content-Type: application/json

{
  "employee": 1,
  "start_date": "2024-05-20",
  "end_date": "2024-05-31",
  "reason": "Vacation"
}
```

**Response (201 Created):**
```json
{
  "id": 15,
  "employee": {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe"
  },
  "start_date": "2024-05-20",
  "end_date": "2024-05-31",
  "reason": "Vacation",
  "status": "pending",
  "created_at": "2024-04-25T10:30:00Z"
}
```

## Codes de statut HTTP

| Code | Signification | Action |
|------|---------------|--------|
| 200 | OK | Succès |
| 201 | Created | Ressource créée |
| 204 | No Content | Succès (pas de contenu) |
| 400 | Bad Request | Erreur de requête |
| 401 | Unauthorized | Token JWT manquant/invalide |
| 403 | Forbidden | Accès refusé |
| 404 | Not Found | Ressource non trouvée |
| 500 | Server Error | Erreur serveur |

## Dépannage

### "401 Unauthorized"
- Vérifier que le token JWT est correct
- Vérifier que le token n'a pas expiré
- Refaire l'authentification via Login

### "404 Not Found"
- Vérifier l'URL du endpoint
- Vérifier que la ressource existe
- Consulter les logs du serveur

### "Connection refused"
- Vérifier que le serveur Django est en cours d'exécution
- Vérifier l'URL de base (baseUrl)
- Vérifier les pare-feu

### "No response"
- Vérifier la connexion réseau
- Vérifier les logs du serveur
- Essayer avec curl: `curl http://localhost:8000/api/v1/personnel/employees/`

## Scripts d'aide

### Vérifier tous les endpoints
```bash
chmod +x API/check_api.sh
./API/check_api.sh http://localhost:8000
```

Cela générera un rapport `api-test-report.md` avec les résultats de tous les tests.

## Fonctionnalités avancées de Bruno

### Tests automatisés
Dans le fichier d'une requête, ajouter des tests:
```javascript
tests {
  test("Status code is 200", function() {
    expect(res.getStatus()).to.equal(200);
  });

  test("Response has user data", function() {
    expect(res.getBody().user).to.exist;
  });
}
```

### Scripts de pré-requête
Avant d'exécuter une requête:
```javascript
pre-request {
  // Définir des variables dynamiques
  bru.setVar('timestamp', Date.now());
}
```

### Assertions
Pour valider les réponses automatiquement:
```javascript
assert(res.status === 200);
assert(res.body.access !== null);
```

## Ressources supplémentaires

- [Documentation Bruno](https://docs.usebruno.com/)
- [Documentation API Django REST Framework](https://www.django-rest-framework.org/)
- [JWT Token Documentation](https://django-rest-framework-simplejwt.readthedocs.io/)

## Notes importantes

1. ⚠️ **Production**: Changer `baseUrl` vers votre URL de production
2. 🔒 **Sécurité**: Ne jamais commiter les tokens JWT
3. 📝 **Logs**: Consulter `Backend/logs/` pour le dépannage
4. 🧪 **Tests**: Utiliser des données de test pour éviter de modifier les données production
