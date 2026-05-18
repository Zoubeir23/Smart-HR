# Smart-HR — Actions manuelles VPS (post-déploiement)

> Ces étapes ne sont pas automatisables par le code source.
> À exécuter une seule fois après le déploiement sur le VPS.

---

## Q27 — Vérifier HTTPS actif (Dokploy + Let's Encrypt)

Le SSL est géré par **Dokploy** (reverse proxy externe).
Le conteneur frontend expose le port 80 sur le réseau `dokploy-network` ;
Dokploy s'occupe de la terminaison TLS.

### Vérification

```bash
# Tester que le certificat est valide et que HTTPS répond
curl -I https://ton-domaine.com

# Résultat attendu :
# HTTP/2 200
# strict-transport-security: max-age=31536000; includeSubDomains; preload

# Inspecter le certificat (émetteur Let's Encrypt)
openssl s_client -connect ton-domaine.com:443 2>/dev/null | grep -E "subject|issuer"
# Résultat attendu :
# subject=CN = ton-domaine.com
# issuer=C = US, O = Let's Encrypt, CN = R3
```

### Si le certificat n'est pas encore généré dans Dokploy

1. Aller dans Dokploy > Application > Domaines
2. Ajouter le domaine et activer "Generate SSL Certificate"
3. Attendre 30-60 secondes — Let's Encrypt émet le certificat automatiquement

---

## Q29 — Sauvegardes automatiques quotidiennes de la base PostgreSQL

Le script `backup` (pg_dump + gzip) est déjà intégré dans l'image PostgreSQL du projet
(`Backend/compose/production/postgres/maintenance/backup`).
Il suffit de le planifier via **cron** sur le VPS.

### Configurer le cron

```bash
# Se connecter au VPS en SSH, puis :
crontab -e
```

Ajouter la ligne suivante (sauvegarde chaque nuit à 02h00) :

```
0 2 * * * docker compose -f /chemin/vers/Smart-HR/docker-compose.vps.yml exec -T postgres /usr/local/bin/backup >> /var/log/smarthr_backup.log 2>&1
```

> Remplacer `/chemin/vers/Smart-HR/` par le chemin réel sur le VPS.

### Vérifier manuellement qu'une sauvegarde fonctionne

```bash
docker compose -f docker-compose.vps.yml exec postgres /usr/local/bin/backup
# Résultat attendu :
# Backing up the 'smart_hr' database...
# 'smart_hr' database backup 'backup_2026_05_18T02_00_00.sql.gz' has been created.
```

### Lister les sauvegardes existantes

```bash
docker compose -f docker-compose.vps.yml exec postgres /usr/local/bin/backups
```

### Restaurer une sauvegarde

```bash
docker compose -f docker-compose.vps.yml exec postgres /usr/local/bin/restore backup_2026_05_18T02_00_00.sql.gz
```

---

## Q34 — Emails transactionnels (DKIM / SPF / boîte principale)

Les emails (OTP, validation congé, alerte churn) sont envoyés via **Gmail SMTP**.
Sans DKIM/SPF, ils risquent d'atterrir en spam.

### Tester la réception

```bash
# Déclencher un email OTP depuis le VPS
curl -X POST https://ton-domaine.com/api/v1/auth/register/candidate/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testspam","email":"ton-email@gmail.com","password":"TestPass1234","password2":"TestPass1234"}'

# Vérifier : boîte principale OU spam ?
```

### Configurer SPF sur le domaine (DNS)

Ajouter un enregistrement TXT sur le domaine :

```
v=spf1 include:_spf.google.com ~all
```

### Configurer DKIM (Gmail)

1. Aller dans **Google Workspace Admin > Apps > Gmail > Authenticate email**
2. Générer la clé DKIM
3. Ajouter l'enregistrement DNS TXT fourni par Google

### Vérifier la configuration

```bash
# Outil en ligne : https://mxtoolbox.com/SuperTool.aspx
# Taper le domaine et tester SPF + DKIM + DMARC
```

---

## Q15 — Ré-entraînement du modèle de prédiction de churn

Le modèle Random Forest (`churn_model.pkl`) est **pré-entraîné** sur 1 500 données
synthétiques et livré avec le projet. Il n'y a pas de ré-entraînement automatique
en production (complexité ML hors périmètre MVP).

### Ré-entraîner manuellement (sur demande)

```bash
# Sur le VPS, dans le conteneur Django
docker compose -f docker-compose.vps.yml exec django \
  python manage.py train_churn_model

# Résultat attendu :
# Generating 1500 synthetic HR samples...
# Training Random Forest classifier...
# Classification Report: accuracy ~0.87
# Model saved to ai_engine/ml_models/churn_model.pkl
```

### Quand ré-entraîner ?

- Après 3 mois d'utilisation réelle, avec les données des vrais employés
- Pour cela, adapter `train_churn_model.py` pour lire depuis la base PostgreSQL
  au lieu de générer des données synthétiques

### Note pour le mémoire (discours soutenance)

> "Le modèle MVP est entraîné sur des données synthétiques réalistes (1 500 entrées,
> 5 features : salaire, ancienneté, statut, département, poste).
> En production, il serait ré-entraîné périodiquement sur les données réelles
> des employés, enrichies de variables supplémentaires (absentéisme, évaluations,
> heures supplémentaires) pour améliorer la précision."

---

## Q8 / Q16 — Discours soutenance : NLP et features ML

### Q8 — Score de matching CV (ne pas dire "cosine similarity")

**Ce qu'il faut dire :**

> "Le score de matching utilise l'analyse sémantique de Gemini Flash (LLM).
> Le modèle compare le contenu du CV et de la lettre de motivation avec les exigences
> du poste, et retourne un score d'adéquation de 0 à 100 % accompagné des compétences
> détectées et d'un résumé de la candidature.
> Cette approche est plus robuste que la similarité cosine classique car elle comprend
> le contexte, les synonymes et les compétences implicites."

**Avantage à valoriser en soutenance :**
L'approche LLM surpasse cosine sur les cas ambigus ("Support client" = "Customer success",
"Java EE" ≠ "JavaScript", etc.).

### Q16 — Features du modèle churn (ne pas prétendre avoir toutes les variables)

**Ce qu'il faut dire :**

> "Le modèle MVP utilise 5 features disponibles dans le système :
> salaire, ancienneté, statut du contrat, rattachement à un département et à un poste.
> Ces features suffisent à démontrer le principe de prédiction.
> En version 2, l'ajout de variables comportementales (taux d'absentéisme,
> résultats d'évaluation, heures supplémentaires) permettrait d'atteindre
> une précision > 85 % sur données réelles."

---

## Résumé des actions à effectuer avant la soutenance

| Action | Priorité | Durée estimée | Statut |
|--------|----------|---------------|--------|
| Vérifier HTTPS dans Dokploy | Critique | 5 min | A faire |
| Configurer cron backup | Important | 10 min | A faire |
| Tester réception email OTP | Important | 5 min | A faire |
| Configurer SPF sur le domaine | Recommandé | 15 min | A faire |
| Ré-entraîner modèle (optionnel) | Optionnel | 2 min | A faire |
| Préparer discours NLP/ML | Soutenance | 10 min | A faire |
