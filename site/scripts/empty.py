"""Delete every page, so the site shows the welcome screen of a fresh
install again. Run it with `npm run site:empty`, before the empty-site lane."""
from cms.models import Page
from django.core.cache import cache
from django.db import transaction

with transaction.atomic():
    for page in Page.objects.filter(parent__isnull=True):
        page.delete()
    Page.objects.all().delete()
cache.clear()
print("empty: %d pages" % Page.objects.count())
