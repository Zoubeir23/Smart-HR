# Variables d'environnement pour Bruno - Smart HR API

## 🔧 Variables locales (pour développement)

### URL de base
- **baseUrl**: `http://localhost:8000`
- **apiVersion**: `v1`

### Authentification
- **authToken**: À obtenir après login
- **username**: Votre username Django
- **password**: Votre mot de passe Django

### IDs de test
- **employee_id**: `1` (à adapter selon vos données)
- **department_id**: `1`
- **position_id**: `1`

## 🌐 Variables production

### URL de base
- **baseUrl**: `https://api.smart-hr.example.com`
- **apiVersion**: `v1`

### Authentification
- **authToken**: JWT token de production
- **admin_user**: Utilisateur administrateur

## 📝 Configuration dans Bruno

### 1. Créer un nouvel environnement

1. Ouvrir Bruno
2. Cliquer sur "Environment" (bas-gauche)
3. Cliquer sur "New Environment"
4. Nommer: `Local Development` ou `Production`

### 2. Ajouter les variables

```
baseUrl = http://localhost:8000
apiVersion = v1
authToken = (obtenu après login)
employee_id = 1
department_id = 1
position_id = 1
```

### 3. Valider les variables

Les variables sont maintenant disponibles avec la syntaxe `{{variableName}}` dans toutes les requêtes.

## 🔄 Utilisation des variables

### Dans les URLs
```
GET {{baseUrl}}/api/{{apiVersion}}/personnel/employees/
```

### Dans les headers
```
Authorization: Bearer {{authToken}}
```

### Dans les body (JSON)
```json
{
  "employee": {{employee_id}},
  "department": {{department_id}}
}
```

## 🔐 Gestion sécurisée des tokens

⚠️ **Sécurité**: 
- Ne jamais commiter des tokens réels
- Utiliser des fichiers `.env` locaux (non versionés)
- Mettre à jour le token lors de chaque session

## 📌 Exemple de configuration complète

```
# Développement local
@baseUrl = http://localhost:8000
@apiVersion = v1
@authToken = 
@employee_id = 1
@department_id = 1
@position_id = 1
@username = admin
@password = admin123

# Pagination
@page = 1
@page_size = 10

# Dates
@current_date = 2024-04-25
@start_date = 2024-05-01
@end_date = 2024-05-31

# Texte
@reason = Vacation
@description = Description de test
```

## ⚡ Variables dynamiques avec scripts

Dans Bruno, vous pouvez définir des variables dynamiques:

```javascript
// Extraire le token de la réponse de login
if (res.getStatus() === 200) {
  const body = res.getBody();
  bru.setVar('authToken', body.access);
}

// Définir la date actuelle
bru.setVar('currentDate', new Date().toISOString().split('T')[0]);

// Générer un ID aléatoire
bru.setVar('randomId', Math.floor(Math.random() * 10000));
```

## 🎯 Bonnes pratiques

1. **Toujours utiliser les variables**: `{{baseUrl}}` au lieu de `http://localhost:8000`
2. **Mettre à jour régulièrement**: Les tokens JWT expirent après un certain temps
3. **Utiliser des environnements distincts**: `Local` vs `Production`
4. **Documenter les changements**: Mettre à jour ce fichier lors de changements
5. **Sauvegarder les configurations**: Exporter régulièrement les collections

## 📚 Ressources

- [Bruno Variables Docs](https://docs.usebruno.com/scripting/variables)
- [Bruno Environment Docs](https://docs.usebruno.com/environments)
- [JWT Token Format](https://jwt.io/)
