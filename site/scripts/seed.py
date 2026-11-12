"""Reset the site content to the baseline the suite expects.

Deletes every page and creates a small, published site in two languages:

    Home (en, de)            the home page
    About (en, de)
      Team (en)
    Contact (en)
    Draft notes (en)         a draft that was never published

Run it with `npm run site:seed` (CI runs it once, after the empty-site lane).
"""
from cms import api
from cms.models import Page, PageContent
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from djangocms_versioning.models import Version

admin = get_user_model().objects.get(username="admin")


def text(content, language, body):
    placeholder = content.get_placeholders().first() or content.rescan_placeholders().get("Page Content")
    api.add_plugin(placeholder, "TextPlugin", language, body=body)


def publish(content):
    Version.objects.get_for_content(content).publish(admin)


def page(title, body, parent=None, publish_it=True, **kwargs):
    new_page = api.create_page(title, "base.html", "en", created_by=admin, parent=parent, in_navigation=True, **kwargs)
    content = PageContent.admin_manager.get(page=new_page, language="en")
    content.rescan_placeholders()
    text(content, "en", body)
    if publish_it:
        publish(content)
    return new_page


def translate(target, title, body):
    content = api.create_page_content("de", title, target, created_by=admin, in_navigation=True)
    content.rescan_placeholders()
    text(content, "de", body)
    publish(content)


@transaction.atomic
def seed():
    for old in Page.objects.filter(parent__isnull=True):
        old.delete()
    Page.objects.all().delete()

    home = page("Home", "<p>Welcome to the django CMS test site.</p>")
    home.set_as_homepage()
    translate(home, "Startseite", "<p>Willkommen auf der django CMS Testseite.</p>")

    about = page("About", "<p>About this site.</p>")
    translate(about, "Über uns", "<p>Über diese Website.</p>")
    page("Team", "<p>The people behind this site.</p>", parent=about)
    page("Contact", "<p>How to reach us.</p>")
    page("Draft notes", "<p>Not published yet.</p>", publish_it=False)


seed()
cache.clear()
print("seed: %d pages" % Page.objects.count())
