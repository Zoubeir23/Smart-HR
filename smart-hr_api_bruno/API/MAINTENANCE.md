# 🔧 Maintenance de la Collection Bruno

## 📝 Comment ajouter une nouvelle requête

### Format de fichier Bruno (.bru)

```bru
meta {
  name: Description de la requête
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/api/{{apiVersion}}/module/resource/
  auth: bearer {
    token: {{authToken}}
  }
}
```

### Étapes

1. **Créer le fichier** dans le bon dossier
   ```bash
   # Exemple: smart-hr/API/Module/XX_Description.bru
   ```

2. **Structure requise**:
   ```bru
   meta {
     name: Nom compréhensible
     type: http
     seq: 3  # Numéro de séquence dans le dossier
   }
   
   [METHOD] {
     url: URL complète
     auth: bearer {
       token: {{authToken}}
     }
     headers {
       Content-Type: application/json
     }
     body: json {
       {
         "field": "value"
       }
     }
   }
   ```

3. **Ajouter au ENDPOINTS.md**
   ```markdown
   | # | Method | Endpoint | Description | Auth |
   |---|--------|----------|-------------|------|
   | 1 | GET | `/api/v1/module/` | Description | ✅ |
   ```

## 🔄 Types de requêtes

### GET (Lister)
```bru
get {
  url: {{baseUrl}}/api/{{apiVersion}}/module/
}
```

### POST (Créer)
```bru
post {
  url: {{baseUrl}}/api/{{apiVersion}}/module/
  body: json {
    {
      "field1": "value",
      "field2": 123
    }
  }
}
```

### PUT (Remplacer)
```bru
put {
  url: {{baseUrl}}/api/{{apiVersion}}/module/1/
  body: json {
    {
      "field1": "new_value"
    }
  }
}
```

### PATCH (Modifier partiellement)
```bru
patch {
  url: {{baseUrl}}/api/{{apiVersion}}/module/1/
  body: json {
    {
      "field1": "updated_value"
    }
  }
}
```

### DELETE (Supprimer)
```bru
delete {
  url: {{baseUrl}}/api/{{apiVersion}}/module/1/
}
```

## 🔐 Authentification

### Sans authentification
```bru
get {
  url: {{baseUrl}}/api/{{apiVersion}}/auth/login/
}
```

### Avec authentification JWT
```bru
get {
  url: {{baseUrl}}/api/{{apiVersion}}/protected/
  auth: bearer {
    token: {{authToken}}
  }
}
```

## 📤 Uploader des fichiers

```bru
post {
  url: {{baseUrl}}/api/{{apiVersion}}/document/
  auth: bearer {
    token: {{authToken}}
  }
  body: form-data {
    file: @file ~/path/to/file.pdf
    document_type: certificate
  }
}
```

## 📝 Tests et assertions

### Ajouter des tests de réponse

```bru
tests {
  test("Status code is 200", function() {
    expect(res.getStatus()).to.equal(200);
  });
  
  test("Response has data", function() {
    expect(res.getBody().results).to.exist;
  });
}
```

### Pre-requêtes

```bru
pre-request {
  // Définir variables dynamiques
  bru.setVar('timestamp', Date.now());
  
  // Générer UUID
  const uuid = generateUUID();
  bru.setVar('requestId', uuid);
}
```

## 🔍 Variables dynamiques

### Dans le body
```json
{
  "created_at": "{{timestamp}}",
  "request_id": "{{requestId}}"
}
```

### Dans l'URL
```
{{baseUrl}}/api/{{apiVersion}}/resource/{{resourceId}}/
```

### Dans les headers
```
Authorization: Bearer {{authToken}}
X-Request-ID: {{requestId}}
```

## 📁 Organisation des dossiers

```
API/
├── Auth/                    # Authentification
├── Personnel/              # Gestion du personnel
├── Conge/                  # Congés
├── Tache/                  # Tâches
├── Presence/               # Présence
├── Paiement/               # Paiement
├── Document/               # Documents
├── Formation/              # Formation
├── Recruitment/            # Recrutement
└── AI/                     # IA
```

### Ajouter un nouveau module

1. **Créer le dossier**:
   ```bash
   mkdir -p smart-hr/API/NewModule
   ```

2. **Ajouter les requêtes**:
   ```bash
   # Lister
   smart-hr/API/NewModule/01_List.bru
   
   # Créer
   smart-hr/API/NewModule/02_Create.bru
   
   # Détail
   smart-hr/API/NewModule/03_Detail.bru
   
   # Mettre à jour
   smart-hr/API/NewModule/04_Update.bru
   
   # Supprimer
   smart-hr/API/NewModule/05_Delete.bru
   ```

## ✅ Checklist pour une nouvelle requête

- [ ] Fichier créé avec le bon nom: `XX_Description.bru`
- [ ] Meta information complète (name, type, seq)
- [ ] URL correcte avec variables
- [ ] Authentification appropriée
- [ ] Body formaté correctement (JSON)
- [ ] Variable d'environnement définie si besoin
- [ ] Documentation mise à jour (ENDPOINTS.md)
- [ ] Testé dans Bruno
- [ ] Requête enregistrée dans le dossier approprié

## 📚 Documentation à mettre à jour

Quand vous ajoutez une requête:

1. **ENDPOINTS.md** - Ajouter le tableau
2. **CHECKLIST.md** - Ajouter l'étape de vérification
3. **GUIDE.md** - Ajouter un exemple si notable
4. **README.md** - Mettre à jour le nombre de requêtes

## 🔄 Gérer les erreurs courants

### URL incorrecte
```bru
# ❌ Mauvais
url: {{baseUrl}}/api/v1/personnel  # Pas de /

# ✅ Correct
url: {{baseUrl}}/api/{{apiVersion}}/personnel/
```

### Authentification manquante
```bru
# ❌ Mauvais - API protégée sans token
get {
  url: {{baseUrl}}/api/{{apiVersion}}/protected/
}

# ✅ Correct
get {
  url: {{baseUrl}}/api/{{apiVersion}}/protected/
  auth: bearer {
    token: {{authToken}}
  }
}
```

### Body mal formaté
```bru
# ❌ Mauvais
body: json {
  field: "value"  # Pas de guillemets
}

# ✅ Correct
body: json {
  {
    "field": "value"
  }
}
```

## 🧪 Tester une nouvelle requête

1. Ouvrir Bruno
2. Cliquer sur la nouvelle requête
3. Vérifier l'URL et les paramètres
4. Cliquer "Send"
5. Vérifier la réponse (statut, body)
6. Ajouter des assertions si nécessaire

## 📊 Template complète

```bru
meta {
  name: Complete Example
  type: http
  seq: 1
}

post {
  url: {{baseUrl}}/api/{{apiVersion}}/module/
  auth: bearer {
    token: {{authToken}}
  }
  headers {
    Content-Type: application/json
    X-Custom-Header: custom-value
  }
  body: json {
    {
      "name": "Test",
      "description": "Test description",
      "related_id": 1
    }
  }
}

tests {
  test("Status code is 201", function() {
    expect(res.getStatus()).to.equal(201);
  });
  
  test("Response has id", function() {
    const body = res.getBody();
    expect(body.id).to.exist;
    expect(body.id).to.be.a('number');
  });
}

pre-request {
  // Code exécuté avant la requête
}
```

## 🔗 Ressources

- [Bruno Documentation](https://docs.usebruno.com/)
- [Bruno Scripting](https://docs.usebruno.com/scripting/basics)
- [Bruno Variables](https://docs.usebruno.com/scripting/variables)
- [Bruno Testing](https://docs.usebruno.com/testing/introduction)

---

**Dernière mise à jour**: 2024-04-25  
**Responsable**: Équipe développement
