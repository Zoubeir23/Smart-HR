"""
Views for the Smart-HR voice agent.

- ask: accept a user query and return a text + optional audio response.
- index_docs: (admin only) trigger re-indexing of HR documents into Qdrant.
"""

import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from utilisateur.permissions import IsAdmin

from .serializers import VoiceQuerySerializer, VoiceResponseSerializer
from .services import VoiceResponseService, get_vector_store

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ask(request):
    """Handle a voice query from an authenticated user.

    Expects JSON body: {"query": "...", "voice": "nova|alloy|echo"}
    Returns: {"text_response": "...", "audio_url": "...|null", "sources": [...], "mode": "ai|simulated"}
    """
    serializer = VoiceQuerySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    query = serializer.validated_data["query"]
    voice = serializer.validated_data.get("voice", "nova")

    service = VoiceResponseService()
    result = service.generate_response(
        query=query,
        voice=voice,
        user=request.user,
    )

    response_serializer = VoiceResponseSerializer(result)
    return Response(response_serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdmin])
def index_docs(request):
    """Re-index default HR FAQ documents into Qdrant.

    Admin-only endpoint. Uses the same document set as the
    ``index_hr_docs`` management command.
    """
    from ai_agents.management.commands.index_hr_docs import HR_FAQ_DOCUMENTS

    vector_store = get_vector_store()

    if vector_store.client is None:
        return Response(
            {"detail": "Qdrant client is not available. Install qdrant-client."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    ok = vector_store.setup_collection()
    if not ok:
        return Response(
            {"detail": "Failed to setup Qdrant collection."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    count = vector_store.store_documents(HR_FAQ_DOCUMENTS)
    return Response(
        {"detail": f"{count} documents indexed successfully."},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdmin])
def index_from_url(request):
    """
    Index documentation from a URL using Firecrawl (optional).

    POST body: {"url": "https://docs.example.com", "limit": 5}
    Requires FIRECRAWL_API_KEY and firecrawl-py package.
    """
    url = request.data.get("url")
    if not url:
        return Response(
            {"detail": "Missing required field: url"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    limit = request.data.get("limit", 5)

    from ai_agents.voice_agent.url_indexer import crawl_url_to_documents

    documents = crawl_url_to_documents(url, limit=limit)
    if not documents:
        return Response(
            {
                "detail": (
                    "No documents crawled. Ensure FIRECRAWL_API_KEY is set and "
                    "firecrawl-py is installed: pip install firecrawl-py"
                ),
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    vector_store = get_vector_store()
    if vector_store.client is None:
        return Response(
            {"detail": "Qdrant client is not available."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    vector_store.setup_collection()
    count = vector_store.store_documents(documents)
    return Response(
        {"detail": f"{count} documents indexed from URL successfully.", "url": url},
        status=status.HTTP_200_OK,
    )
