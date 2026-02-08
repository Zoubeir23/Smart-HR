# Agents de référence (Awesome LLM Apps)

Ce dossier contient des **démos standalone** (Streamlit) issues du repo [awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps). Elles servent de référence pour l’architecture et ne sont **pas intégrées** au projet Django.

## Rôle par rapport à Smart-HR

| Référence | Implémentation Django | Emplacement |
|-----------|------------------------|-------------|
| `voice_ai_agents/customer_support_voice_agent/` | Agent vocal avec Qdrant + FastEmbed | `src/ai_agents/voice_agent/` |
| `advanced_ai_agents/.../ai_recruitment_agent_team/` | Agent recrutement (analyse CV, emails, Zoom) | `src/ai_agents/recruitment_agent/` |

## Exécution des démos

Chaque sous-dossier dispose de son propre `requirements.txt` et environnement. Exemple :

```bash
cd reference_agents/voice_ai_agents/customer_support_voice_agent
pip install -r requirements.txt
streamlit run customer_support_voice_agent.py
```

## Fonctionnalités reprises dans Django

- **Voice Agent** : indexation URL via Firecrawl → `POST /api/agents/voice/index-from-url/`
- **Recruitment Agent** : analyse de CV, emails, Zoom via les services Django dans `ai_agents/recruitment_agent/`

Pour les APIs Smart-HR, utiliser uniquement les endpoints Django (`/api/agents/...`).
