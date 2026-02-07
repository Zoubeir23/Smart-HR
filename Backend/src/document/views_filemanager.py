import os
import json
from django.conf import settings
from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

BASE_DIR_FILEMANAGER = os.path.join(settings.MEDIA_ROOT, 'documents')

@csrf_exempt
def list_files(request):
    """Lister tous les fichiers du dossier"""
    files = []
    for filename in os.listdir(BASE_DIR_FILEMANAGER):
        file_path = os.path.join(BASE_DIR_FILEMANAGER, filename)
        if os.path.isfile(file_path):
            files.append({
                "name": filename,
                "size": os.path.getsize(file_path),
                "url": f"{settings.MEDIA_URL}documents/{filename}"
            })
    return JsonResponse(files, safe=False)

@csrf_exempt
def upload_file(request):
    """Uploader un fichier"""
    if request.method == "POST":
        file = request.FILES.get('file')
        if not file:
            return JsonResponse({"error": "Aucun fichier reçu"}, status=400)
        
        save_path = os.path.join(BASE_DIR_FILEMANAGER, file.name)
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        
        with open(save_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)
        
        return JsonResponse({"success": True, "name": file.name})

    return JsonResponse({"error": "Méthode non autorisée"}, status=405)

@csrf_exempt
def delete_file(request):
    """Supprimer un fichier"""
    if request.method == "DELETE":
        data = json.loads(request.body)
        filename = data.get("name")
        file_path = os.path.join(BASE_DIR_FILEMANAGER, filename)

        if os.path.exists(file_path):
            os.remove(file_path)
            return JsonResponse({"success": True})
        
        return JsonResponse({"error": "Fichier introuvable"}, status=404)

    return JsonResponse({"error": "Méthode non autorisée"}, status=405)

@csrf_exempt
def download_file(request):
    """Télécharger un fichier"""
    filename = request.GET.get("name")
    file_path = os.path.join(BASE_DIR_FILEMANAGER, filename)

    if os.path.exists(file_path):
        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=filename)

    return JsonResponse({"error": "Fichier introuvable"}, status=404)
