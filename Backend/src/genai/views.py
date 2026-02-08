import google.generativeai as genai
from decouple import config
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ChatHistory
from .train import train


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat(request):
    question = request.data.get("question", "").strip()
    if not question:
        return Response({"error": "La question est requise."}, status=400)

    api_key = config('GEMINI_API_KEY', default='')
    if not api_key:
        return Response({"error": "Clé API Gemini non configurée."}, status=503)

    # Load last 5 messages for conversation context
    recent_history = ChatHistory.objects.filter(user=request.user).order_by('-created_at')[:5]
    history_context = ""
    if recent_history:
        history_context = "\n\nHistorique de conversation récent:\n"
        for entry in reversed(list(recent_history)):
            history_context += f"Q: {entry.question}\nR: {entry.response}\n\n"

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash')

    prompt = train(question) + history_context
    try:
        response = model.generate_content(prompt)
        response_text = response.text
    except Exception as exc:
        error_msg = str(exc)
        if '429' in error_msg or 'quota' in error_msg.lower():
            return Response({"error": "Quota API Gemini dépassé. Réessayez dans quelques minutes."}, status=429)
        return Response({"error": f"Erreur API Gemini: {error_msg[:200]}"}, status=503)

    # Save to history
    ChatHistory.objects.create(
        user=request.user,
        question=question,
        response=response_text,
    )

    return Response({"response": response_text})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_history(request):
    history = ChatHistory.objects.filter(user=request.user).order_by('-created_at')[:20]
    data = [
        {
            "id": entry.id,
            "question": entry.question,
            "response": entry.response,
            "created_at": entry.created_at.isoformat(),
        }
        for entry in history
    ]
    return Response(data)
