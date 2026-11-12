#!/usr/bin/env bash
# Run a manage.py command inside the site's virtual environment:
#   ddev exec bash scripts/manage.sh shell < scripts/seed.py
set -euo pipefail
# shellcheck disable=SC1091
source /var/www/html/.venv/bin/activate
cd /var/www/html/djangocmssite
exec python manage.py "$@"
