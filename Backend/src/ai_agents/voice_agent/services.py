"""
Services pour l'agent vocal RH Smart-HR.

- VectorStoreService : gestion de la base vectorielle Qdrant + FastEmbed.
- VoiceResponseService : generation de reponses texte + audio (OpenAI TTS).
"""

import logging
import os
import uuid

from django.conf import settings

from ai_agents.config import OPENAI_API_KEY, QDRANT_URL, QDRANT_API_KEY, is_openai_configured
from ai_agents.models import VoiceSession, AgentLog

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Singleton VectorStoreService
# ---------------------------------------------------------------------------

_vector_store: "VectorStoreService | None" = None


def get_vector_store() -> "VectorStoreService":
    """Return (and lazily create) the module-level VectorStoreService singleton."""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStoreService()
    return _vector_store


class VectorStoreService:
    """Manages Qdrant vector storage and FastEmbed embeddings."""

    DEFAULT_COLLECTION = "hr_docs"

    def __init__(self):
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.models import Distance, VectorParams

            if QDRANT_URL and QDRANT_URL != "http://localhost:6333":
                kwargs = {"url": QDRANT_URL}
                if QDRANT_API_KEY:
                    kwargs["api_key"] = QDRANT_API_KEY
                self.client = QdrantClient(**kwargs)
                logger.info("Qdrant client connected to %s", QDRANT_URL)
            else:
                self.client = QdrantClient(":memory:")
                logger.info("Qdrant client running in-memory mode")
        except ImportError:
            logger.warning("qdrant-client is not installed. VectorStoreService will be unavailable.")
            self.client = None

        # FastEmbed embedding model
        try:
            from fastembed import TextEmbedding

            self.embedding_model = TextEmbedding()
            logger.info("FastEmbed TextEmbedding model loaded")
        except ImportError:
            logger.warning("fastembed is not installed. Embedding will be unavailable.")
            self.embedding_model = None

    # ------------------------------------------------------------------
    def setup_collection(self, collection_name: str | None = None) -> bool:
        """Create the Qdrant collection if it does not already exist.

        Returns True on success, False if dependencies are missing.
        """
        if self.client is None:
            logger.error("Qdrant client not available. Cannot setup collection.")
            return False

        collection_name = collection_name or self.DEFAULT_COLLECTION

        try:
            from qdrant_client.models import Distance, VectorParams

            collections = [c.name for c in self.client.get_collections().collections]
            if collection_name not in collections:
                # FastEmbed default model produces 384-dim vectors
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=384, distance=Distance.COSINE),
                )
                logger.info("Created Qdrant collection '%s'", collection_name)
            else:
                logger.info("Qdrant collection '%s' already exists", collection_name)
            return True
        except Exception as exc:
            logger.exception("Error setting up Qdrant collection: %s", exc)
            return False

    # ------------------------------------------------------------------
    def _embed(self, texts: list[str]) -> list[list[float]]:
        """Embed a list of texts using FastEmbed."""
        if self.embedding_model is None:
            raise RuntimeError("FastEmbed is not available. Install fastembed.")
        embeddings = list(self.embedding_model.embed(texts))
        return [e.tolist() if hasattr(e, "tolist") else list(e) for e in embeddings]

    # ------------------------------------------------------------------
    def store_documents(
        self,
        documents: list[dict],
        collection_name: str | None = None,
    ) -> int:
        """Store documents in Qdrant.

        Each document dict must contain keys: 'content', 'title', 'source'.
        Returns the number of documents stored.
        """
        if self.client is None or self.embedding_model is None:
            logger.error("Qdrant or FastEmbed not available. Cannot store documents.")
            return 0

        collection_name = collection_name or self.DEFAULT_COLLECTION
        contents = [doc["content"] for doc in documents]
        embeddings = self._embed(contents)

        from qdrant_client.models import PointStruct

        points = []
        for idx, (doc, vector) in enumerate(zip(documents, embeddings)):
            points.append(
                PointStruct(
                    id=idx,
                    vector=vector,
                    payload={
                        "content": doc["content"],
                        "title": doc["title"],
                        "source": doc.get("source", ""),
                    },
                )
            )

        self.client.upsert(collection_name=collection_name, points=points)
        logger.info("Stored %d documents in collection '%s'", len(points), collection_name)
        return len(points)

    # ------------------------------------------------------------------
    def search(
        self,
        query: str,
        limit: int = 3,
        collection_name: str | None = None,
    ) -> list[dict]:
        """Search the vector store and return the most relevant documents."""
        if self.client is None or self.embedding_model is None:
            logger.error("Qdrant or FastEmbed not available. Cannot search.")
            return []

        collection_name = collection_name or self.DEFAULT_COLLECTION

        try:
            query_vector = self._embed([query])[0]
            # qdrant-client >= 1.7 uses query_points instead of search
            try:
                from qdrant_client.models import models as qmodels
                results = self.client.query_points(
                    collection_name=collection_name,
                    query=query_vector,
                    limit=limit,
                )
                return [
                    {
                        "content": hit.payload.get("content", ""),
                        "title": hit.payload.get("title", ""),
                        "source": hit.payload.get("source", ""),
                        "score": hit.score,
                    }
                    for hit in results.points
                ]
            except (AttributeError, TypeError):
                # Fallback for older qdrant-client versions
                results = self.client.search(
                    collection_name=collection_name,
                    query_vector=query_vector,
                    limit=limit,
                )
                return [
                    {
                        "content": hit.payload.get("content", ""),
                        "title": hit.payload.get("title", ""),
                        "source": hit.payload.get("source", ""),
                        "score": hit.score,
                    }
                    for hit in results
                ]
        except Exception as exc:
            logger.exception("Error searching Qdrant: %s", exc)
            return []


# ---------------------------------------------------------------------------
# VoiceResponseService
# ---------------------------------------------------------------------------


class VoiceResponseService:
    """Generates text + optional audio responses for the HR voice agent."""

    SYSTEM_PROMPT = (
        "You are a helpful HR assistant for Smart-HR. "
        "Answer questions about HR policies, leave management, recruitment, "
        "and company procedures. Be clear, concise, and professional. "
        "Answer in French."
    )

    def generate_response(
        self,
        query: str,
        voice: str = "nova",
        user=None,
    ) -> dict:
        """Generate a response (text + optional audio) for the given query.

        Returns a dict with keys: text_response, audio_url, sources, mode.
        """
        vector_store = get_vector_store()

        # 1. Retrieve relevant documents
        search_results = vector_store.search(query, limit=3)
        sources = [r["title"] for r in search_results if r.get("title")]
        context = "\n\n".join(
            f"### {r['title']}\n{r['content']}" for r in search_results
        )

        text_response = ""
        audio_url = None
        mode = "simulated"

        if is_openai_configured():
            try:
                text_response, audio_url = self._generate_with_openai(
                    query, context, voice
                )
                mode = "ai"
            except Exception as exc:
                logger.exception("OpenAI generation failed: %s", exc)
                # Fallback to simulated mode
                text_response = self._build_fallback_response(search_results)
                mode = "simulated"
        else:
            text_response = self._build_fallback_response(search_results)
            mode = "simulated"

        # 5. Persist VoiceSession
        try:
            session = VoiceSession.objects.create(
                user=user,
                query=query,
                text_response=text_response,
                voice=voice,
                sources=sources,
            )
            if audio_url:
                # Store relative path in FileField
                relative_path = audio_url.lstrip("/media/")
                session.audio_file.name = relative_path
                session.save(update_fields=["audio_file"])
        except Exception as exc:
            logger.exception("Failed to save VoiceSession: %s", exc)

        # 6. Log to AgentLog
        try:
            AgentLog.objects.create(
                agent_type="voice_agent",
                action="generate_response",
                input_data={"query": query, "voice": voice},
                output_data={
                    "mode": mode,
                    "sources": sources,
                    "has_audio": audio_url is not None,
                },
                status="success" if mode == "ai" else "fallback",
            )
        except Exception as exc:
            logger.exception("Failed to save AgentLog: %s", exc)

        return {
            "text_response": text_response,
            "audio_url": audio_url,
            "sources": sources,
            "mode": mode,
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _generate_with_openai(
        self, query: str, context: str, voice: str
    ) -> tuple[str, str | None]:
        """Call OpenAI GPT-4o for text and TTS for audio.

        Returns (text_response, audio_url).
        """
        from openai import OpenAI

        client = OpenAI(api_key=OPENAI_API_KEY)

        # --- Text generation ---
        user_message = (
            f"Based on the following documentation:\n\n{context}\n\n"
            f"Question: {query}"
        )
        chat_response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.4,
            max_tokens=1024,
        )
        text_response = chat_response.choices[0].message.content.strip()

        # --- Audio generation (TTS) ---
        audio_dir = os.path.join(settings.MEDIA_ROOT, "audio")
        os.makedirs(audio_dir, exist_ok=True)

        filename = f"response_{uuid.uuid4().hex}.mp3"
        filepath = os.path.join(audio_dir, filename)

        tts_response = client.audio.speech.create(
            model="gpt-4o-mini-tts",
            voice=voice,
            input=text_response,
            response_format="mp3",
        )
        tts_response.stream_to_file(filepath)

        audio_url = f"/media/audio/{filename}"
        return text_response, audio_url

    @staticmethod
    def _build_fallback_response(search_results: list[dict]) -> str:
        """Build a plain-text response from raw search results (no OpenAI)."""
        if not search_results:
            return (
                "Aucune documentation pertinente trouvee. "
                "Veuillez reformuler votre question ou contacter le service RH."
            )
        parts = []
        for r in search_results:
            parts.append(f"**{r['title']}**\n{r['content']}")
        return "\n\n---\n\n".join(parts)
