"""
Indexation optionnelle de documentation depuis une URL via Firecrawl.

Fonctionnalité inspirée de customer_support_voice_agent.
Aucune erreur d'import si firecrawl-py n'est pas installé.
"""

import logging
import time

from ai_agents.config import FIRECRAWL_API_KEY, is_firecrawl_configured

logger = logging.getLogger(__name__)


def crawl_url_to_documents(url: str, limit: int = 5) -> list[dict]:
    """
    Crawle une URL et retourne des documents pour l'indexation Qdrant.

    Chaque document a les clés: content, title, source.
    Retourne [] si Firecrawl n'est pas configuré ou en cas d'erreur.
    Gère la pagination via response['next'] comme customer_support_voice_agent.
    """
    if not is_firecrawl_configured():
        logger.warning("Firecrawl API key not configured. Cannot crawl URL.")
        return []

    try:
        from firecrawl import FirecrawlApp
    except ImportError:
        logger.warning(
            "firecrawl-py is not installed. pip install firecrawl-py to enable URL indexing."
        )
        return []

    try:
        app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
        response = app.crawl_url(
            url,
            params={
                "limit": limit,
                "scrapeOptions": {"formats": ["markdown", "html"]},
            },
        )
    except Exception as exc:
        logger.exception("Firecrawl crawl failed: %s", exc)
        return []

    documents = []
    while True:
        for page in response.get("data", []):
            content = page.get("markdown") or page.get("html", "")
            if not content or not str(content).strip():
                continue
            metadata = page.get("metadata", {}) or {}
            source_url = metadata.get("sourceURL", url)
            title = metadata.get("title") or source_url
            documents.append(
                {
                    "content": str(content)[:50000],
                    "title": str(title),
                    "source": str(source_url),
                }
            )
        next_url = response.get("next")
        if not next_url:
            break
        try:
            response = app.get(next_url)
            time.sleep(1)
        except Exception as exc:
            logger.warning("Firecrawl pagination failed: %s", exc)
            break

    return documents
