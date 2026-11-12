#!/usr/bin/env bash
# Build the django CMS site once, then run the Django development server.
# DDEV runs this script as a web_extra_daemon; it is safe to run again.
set -euo pipefail

PROJECT_ROOT="/var/www/html"
SITE_DIR="$PROJECT_ROOT/djangocmssite"
VENV_DIR="$PROJECT_ROOT/.venv"
SETTINGS="$SITE_DIR/djangocmssite/settings.py"

if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
fi
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

if [ ! -f "$SITE_DIR/manage.py" ]; then
  pip install --quiet --upgrade pip
  pip install --quiet "django-cms>=5.1,<6"
  cd "$PROJECT_ROOT"
  # The django CMS quickstart: django CMS with djangocms-versioning,
  # djangocms-alias, djangocms-text, djangocms-frontend and django-filer.
  djangocms djangocmssite --noinput --username admin --email admin@example.com --versioning --alias
fi

# The site overlay: hosts, two languages, and a base template with the
# navigation menu, the breadcrumb and the language chooser.
cp "$PROJECT_ROOT/overlay/site_settings.py" "$SITE_DIR/djangocmssite/site_settings.py"
cp "$PROJECT_ROOT/overlay/templates/"*.html "$SITE_DIR/djangocmssite/templates/"
if ! grep -q "site_settings" "$SETTINGS"; then
  printf '\nfrom .site_settings import *  # noqa: E402,F401,F403\n' >> "$SETTINGS"
fi

cd "$SITE_DIR"
python manage.py migrate --noinput
python manage.py shell < "$PROJECT_ROOT/scripts/accounts.py"

# DEBUG is off so the site answers with its real 404 page; --insecure keeps
# the development server serving the static files.
exec python manage.py runserver --insecure 0.0.0.0:8000
