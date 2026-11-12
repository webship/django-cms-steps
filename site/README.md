# The test site

A real django CMS site for this suite, built with DDEV from the django CMS
quickstart (`djangocms <name>`): django CMS 5.1 with djangocms-versioning,
djangocms-alias, djangocms-text, djangocms-frontend and django-filer, on
SQLite. The Django version follows the Python of the DDEV image (Django 5.2
on Python 3.11, Django 6.1 on newer). CI builds the same site on every push.

| Path | What it is |
| --- | --- |
| `.ddev/` | The DDEV project (`generic` type): Python in the web image, the site as a daemon, nginx as a proxy to it. |
| `scripts/start.sh` | Builds the site on the first start, applies the overlay, creates the accounts, runs the server. |
| `scripts/accounts.py` | The accounts the suite logs in with: `admin` (superuser) and `editor` (staff, group "Editors"). |
| `scripts/seed.py` | Resets the content to the baseline the features expect. |
| `scripts/empty.py` | Deletes every page, for the welcome-screen lane. |
| `overlay/` | What the suite adds to the quickstart project: two languages (English, German), and a base template with the menu, the breadcrumb and the language chooser. |

From the repository root:

```bash
npm run site:start   # ddev start; the first start installs django CMS (a few minutes)
npm run site:seed    # the baseline content: Home, About > Team, Contact, Draft notes
npm test             # the suite, against https://django-cms-steps.ddev.site
npm run site:empty   # no pages at all, for: CUCUMBER_TAGS=@empty-site npm test
npm run site:stop
```

The accounts are configuration, not test data: `admin` / `admin` and
`editor` / `editor`, for this local site only. `DJANGOCMS_ADMIN_PASS` and
`DJANGOCMS_EDITOR_PASS` set other passwords, on the site (in `.ddev/config.yaml`
under `web_environment`) and for the suite.
