#!/bin/bash
set -e

# ============================================================
# Smart-HR — Script de déploiement VPS (MVP HTTP)
# Usage : ./deploy.sh [--seed]
#   --seed : insérer les données de démo après le déploiement
# ============================================================

COMPOSE="docker compose -f docker-compose.vps.yml"

echo "==> Vérification de la clé Gemini..."
GEMINI_KEY=$(grep "^GEMINI_API_KEY=" Backend/.envs/.production/.django | cut -d= -f2)
if [ "$GEMINI_KEY" = "VOTRE_CLE_GEMINI_ICI" ] || [ -z "$GEMINI_KEY" ]; then
    echo "⚠️  ATTENTION : GEMINI_API_KEY non configurée dans Backend/.envs/.production/.django"
    echo "    Le chatbot IA ne fonctionnera pas. Continuer quand même ? (o/N)"
    read -r answer
    [ "$answer" = "o" ] || [ "$answer" = "O" ] || exit 1
fi

echo "==> Arrêt des conteneurs existants..."
$COMPOSE down --remove-orphans 2>/dev/null || true

echo "==> Construction des images Docker..."
$COMPOSE build --no-cache

echo "==> Démarrage de la base de données et Redis..."
$COMPOSE up -d postgres redis
echo "   Attente 10s pour l'initialisation de PostgreSQL..."
sleep 10

echo "==> Migrations Django..."
$COMPOSE run --rm django python manage.py migrate --noinput

echo "==> Collecte des fichiers statiques..."
$COMPOSE run --rm django python manage.py collectstatic --noinput

if [ "$1" = "--seed" ]; then
    echo "==> Insertion des données de démo..."
    $COMPOSE run --rm django python manage.py seed_demo_data
    echo "   Données de démo insérées !"
    echo ""
    echo "   Comptes de démo :"
    echo "   admin@smarthr.com    / admin123"
    echo "   rh@smarthr.com       / rh123"
    echo "   employee@smarthr.com / employee123"
    echo "   candidate@smarthr.com / candidate123"
fi

echo "==> Démarrage de tous les services..."
$COMPOSE up -d

echo ""
echo "✅ Smart-HR déployé avec succès !"
echo ""
echo "   Frontend : http://$(curl -s ifconfig.me 2>/dev/null || echo 'VPS_IP')"
echo "   Admin    : http://$(curl -s ifconfig.me 2>/dev/null || echo 'VPS_IP')/admin/"
echo ""
echo "==> Logs en temps réel : docker compose -f docker-compose.vps.yml logs -f"
