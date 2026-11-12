"""Settings the django-cms-steps test site adds to the quickstart project."""
from django.utils.translation import gettext_lazy as _

# The site is only reachable through the DDEV router.
DEBUG = False
ALLOWED_HOSTS = ["*"]
CSRF_TRUSTED_ORIGINS = ["https://*.ddev.site", "http://*.ddev.site", "http://localhost:8000", "http://127.0.0.1:8000"]
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Two languages, so the language steps have something to switch between.
LANGUAGE_CODE = "en"
LANGUAGES = [
    ("en", _("English")),
    ("de", _("German")),
]
CMS_LANGUAGES = {
    1: [
        {"code": "en", "name": "English", "public": True, "fallbacks": [], "hide_untranslated": True},
        {"code": "de", "name": "Deutsch", "public": True, "fallbacks": [], "hide_untranslated": True},
    ],
    "default": {"redirect_on_fallback": False},
}

# One cache for the server and for manage.py, so the seed script can clear
# the menus the server has cached.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.filebased.FileBasedCache",
        "LOCATION": "/tmp/django-cms-steps-cache",
    }
}
