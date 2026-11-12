"""Create the accounts the suite logs in with. Accounts are configuration:
they are created here, once, and named in cucumber.js (worldParameters.users);
no feature creates a user."""
import os

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission

User = get_user_model()


def account(username, password, email, **flags):
    user, _ = User.objects.get_or_create(username=username, defaults={"email": email})
    for key, value in flags.items():
        setattr(user, key, value)
    user.set_password(password)
    user.save()
    return user


account("admin", os.environ.get("DJANGOCMS_ADMIN_PASS", "admin"), "admin@example.com", is_staff=True, is_superuser=True)

# An editor: staff, no superuser rights, in the "Editors" group, which may
# work on pages, plugins, versions, aliases and files, but not on users,
# groups or page permissions.
ACCESS_MODELS = ["globalpagepermission", "pagepermission", "pageuser", "pageusergroup"]
editors, _ = Group.objects.get_or_create(name="Editors")
editors.permissions.set(
    Permission.objects.filter(
        content_type__app_label__in=["cms", "djangocms_text", "djangocms_versioning", "djangocms_alias", "djangocms_link", "djangocms_frontend", "filer"]
    ).exclude(content_type__model__in=ACCESS_MODELS)
)
editor = account("editor", os.environ.get("DJANGOCMS_EDITOR_PASS", "editor"), "editor@example.com", is_staff=True, is_superuser=False)
editor.groups.set([editors])

# With CMS_PERMISSION on, a non-superuser also needs a global page permission.
from cms.models import GlobalPagePermission  # noqa: E402
from django.contrib.sites.models import Site  # noqa: E402

gpp, _ = GlobalPagePermission.objects.get_or_create(group=editors)
for field in ["can_change", "can_add", "can_delete", "can_publish", "can_change_advanced_settings", "can_move_page", "can_view"]:
    setattr(gpp, field, True)
gpp.can_change_permissions = False
gpp.save()
gpp.sites.set(Site.objects.all())
print("accounts: admin, editor (group Editors)")
