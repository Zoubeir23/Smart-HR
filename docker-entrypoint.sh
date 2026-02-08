#!/bin/bash
set -e

echo "==> Waiting for database..."
while ! python -c "
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(2)
try:
    s.connect(('${DB_HOST:-db}', int('${DB_PORT:-5432}')))
    s.close()
    exit(0)
except:
    exit(1)
" 2>/dev/null; do
    sleep 1
done

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Indexing HR docs for voice agent..."
python manage.py index_hr_docs 2>/dev/null || echo "    (skipped - Qdrant not available)"

echo "==> Starting server..."
exec "$@"
