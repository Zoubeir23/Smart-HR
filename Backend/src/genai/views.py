from django.shortcuts import render
from google import genai
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .train import train

# Create your views here.


@api_view(['POST'])
def chat(request):
    client = genai.Client(api_key="AIzaSyAoImjsZ15f18j5DGn0cirWCZ5gNxkDXFs")

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=train(request.data.get("question")),
    )

    print(response.text)
    return Response({"response": response.text})
