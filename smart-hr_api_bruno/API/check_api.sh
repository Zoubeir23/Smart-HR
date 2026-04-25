#!/bin/bash

# Script de vérification des API Smart HR
# Ce script teste tous les endpoints principaux de l'API

BASE_URL="${1:-http://localhost:8000}"
API_VERSION="v1"
OUTPUT_FILE="api-test-report.md"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Initialiser le rapport
> "$OUTPUT_FILE"

echo "# Rapport de Vérification des API Smart HR" >> "$OUTPUT_FILE"
echo "Date: $(date)" >> "$OUTPUT_FILE"
echo "URL de base: $BASE_URL" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Fonction pour tester un endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local name=$3
    local token=$4
    
    local url="$BASE_URL/api/$API_VERSION$endpoint"
    
    echo -n "Testing $name... "
    
    if [ -z "$token" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$url" -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$url" -H "Content-Type: application/json" -H "Authorization: Bearer $token")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $http_code)"
        echo "- ✓ $name: HTTP $http_code" >> "$OUTPUT_FILE"
    elif [ "$http_code" -eq 401 ]; then
        echo -e "${YELLOW}⚠ UNAUTHORIZED${NC} (HTTP $http_code)"
        echo "- ⚠ $name: HTTP $http_code (Auth Required)" >> "$OUTPUT_FILE"
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        echo "- ✗ $name: HTTP $http_code" >> "$OUTPUT_FILE"
    fi
}

echo "Vérification des endpoints..."
echo ""

# Vérifier la santé du serveur
echo -n "Vérification de la connexion au serveur... "
if curl -s -f "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Serveur en ligne${NC}"
    echo "## Résultats de la vérification" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
else
    echo -e "${RED}✗ Serveur hors ligne${NC}"
    echo "Impossible de se connecter à $BASE_URL"
    exit 1
fi

# Test des endpoints sans authentification
echo ""
echo "Endpoints publics:"
test_endpoint "POST" "/auth/login/" "Auth - Login"

# Test des endpoints avec authentification
echo ""
echo "Endpoints protégés (nécessitent un token JWT):"
test_endpoint "GET" "/personnel/employees/" "Personnel - List Employees" "$AUTH_TOKEN"
test_endpoint "GET" "/conge/" "Conge - List Leave Requests" "$AUTH_TOKEN"
test_endpoint "GET" "/tache/" "Tache - List Tasks" "$AUTH_TOKEN"
test_endpoint "GET" "/presence/" "Presence - List Attendance" "$AUTH_TOKEN"
test_endpoint "GET" "/paiement/" "Paiement - List Payments" "$AUTH_TOKEN"
test_endpoint "GET" "/document/" "Document - List Documents" "$AUTH_TOKEN"
test_endpoint "GET" "/formation/" "Formation - List Trainings" "$AUTH_TOKEN"
test_endpoint "GET" "/recruitment/" "Recruitment - List Jobs" "$AUTH_TOKEN"
test_endpoint "GET" "/ai/" "AI - List Models" "$AUTH_TOKEN"

echo ""
echo "Résumé:"
echo -e "Rapport généré: ${GREEN}$OUTPUT_FILE${NC}"
