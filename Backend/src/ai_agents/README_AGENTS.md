# Agents IA Smart-HR

Architecture des agents intégrés au backend Django.

## Structure

```
ai_agents/
├── config.py              # Clés API, configuration centralisée
├── recruitment_agent/     # Analyse CV, emails, Zoom
│   ├── services.py        # Analyse PDF, planification, emails
│   ├── views.py           # Endpoints REST
│   └── urls.py
├── voice_agent/           # Assistant vocal FAQ RH
│   ├── services.py        # Qdrant + FastEmbed, recherche RAG
│   ├── url_indexer.py     # Indexation URL via Firecrawl (optionnel)
│   ├── views.py           # ask/, index-docs/, index-from-url/
│   └── urls.py
└── README_AGENTS.md       # Ce fichier
```

## Endpoints

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| POST | `/api/agents/voice/ask/` | RH/Admin | Poser une question FAQ RH |
| POST | `/api/agents/voice/index-docs/` | Admin | Ré-indexer la FAQ par défaut |
| POST | `/api/agents/voice/index-from-url/` | Admin | Indexer une doc depuis une URL (Firecrawl) |
| POST | `/api/agents/recruitment/analyze-resume/` | RH/Admin | Analyser un CV PDF |
| POST | `/api/agents/recruitment/schedule-interview/` | RH/Admin | Planifier un entretien Zoom |

## Dépendances optionnelles

- **firecrawl-py** : pour indexer une doc depuis une URL. Variable `FIRECRAWL_API_KEY`.
- **Qdrant** : requis pour le voice agent (`QDRANT_URL`, `QDRANT_API_KEY`).
- **OpenAI** : requis pour l’analyse de CV et TTS.

## Agents de référence

Les démos Streamlit sont dans `Backend/reference_agents/`. Voir `reference_agents/SMART_HR_README.md`.
