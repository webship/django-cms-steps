# django-cms-steps

Step definitions for testing [django CMS](https://www.django-cms.org/) sites
with [webship-js](https://www.npmjs.com/package/webship-js) (Cucumber and
Playwright): log in by a registry handle, the toolbar and its menus, the modal
and the sideframe, the create wizard, the structure board and its plugins,
versions, the page tree, users and permissions, languages, the navigation menu
and the breadcrumb.

`@webship-js/django-cms-steps` is a plugin for webship-js. It adds `Given`,
`When` and `Then` steps that you load next to webship-js's own steps in the
`cucumber.js` of your project.

Every step is proven on a real django CMS site that this repository builds
with DDEV ([`site/`](site/README.md)) and that CI builds again on every push:
django CMS 5.1 from the django CMS quickstart, with djangocms-versioning 2.8,
djangocms-alias 3.2, djangocms-text 1.0 and djangocms-frontend 2.5, on Django
5.2 (Python 3.11) and Django 6.1 (the Python of the CI image).

## Install

```bash
npm install --save-dev webship-js @webship-js/django-cms-steps
```

`webship-js` is a peer dependency of `@webship-js/django-cms-steps`.

## Quick start

Add the steps of this package to the `require` array of your `cucumber.js`,
after webship-js's own, and name the accounts your features log in with:

```js
// cucumber.js
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js',
      'node_modules/@webship-js/django-cms-steps/tests/step-definitions/*.steps.js',
      'tests/step-definitions/**/*.js', // your own steps, if any
    ],
    paths: ['tests/features/**/*.feature'],
    worldParameters: {
      launchUrl: process.env.LAUNCH_URL || 'http://localhost:8000',
      users: {
        admin: { username: process.env.DJANGOCMS_ADMIN_USER, password: process.env.DJANGOCMS_ADMIN_PASS },
        editor: { username: process.env.DJANGOCMS_EDITOR_USER, password: process.env.DJANGOCMS_EDITOR_PASS },
      },
      djangoCms: { adminLanguage: 'en' },
    },
  },
};
```

Then write a feature:

```gherkin
Feature: News

  Scenario: An editor publishes a news page
    Given I am a logged in user with the "editor" user
    When I go to the homepage
    And I create a page titled "News" with the wizard
    And I add a text plugin with "We have moved." to the "Page Content" placeholder
    And I publish the page
    Then the page version should be "Published"
    And the navigation menu should list "News"
```

```bash
npx cucumber-js --config cucumber.js
```

## Configuration

### Accounts: the users registry

Accounts are configuration, not test data. Create them on the site once
(`manage.py createsuperuser`, a fixture, a provisioning script) and give each a
handle under `worldParameters.users`. A feature logs in by the handle (`Given I
am a logged in user with the "editor" user`), so no password lives in a
feature file, and no step of this package creates a user.

### The site: `worldParameters.djangoCms`

All keys are optional.

| Key | Default | Use |
| --- | --- | --- |
| `adminLanguage` | none | The language prefix of the admin (`'en'` opens `/en/admin/`). Set it on a site that prefixes its URLs with the language, so the admin and the page tree answer in the language of your features. |
| `adminPath` | `admin` | The path of the Django admin. |
| `menu` | the quickstart's Bootstrap 5 menu and django CMS's `menu/menu.html` | CSS selector of the navigation menu list. |
| `menuActive` | `.active, .selected, [aria-current="page"]` | CSS selector that marks the current entry (on the link or its list item). |
| `breadcrumb` | `.breadcrumb`, `nav[aria-label="Breadcrumb"]` | CSS selector of the breadcrumb list. |
| `languageChooser` | `li.lang` (django CMS's `menu/language_chooser.html`) | CSS selector of one entry of the language chooser. |

The toolbar, the modal, the sideframe, the structure board and the page tree
are django CMS's own markup and need no configuration.

## Steps

Every Then step takes `should` or `should not`. Every step takes `I`, `we` or
no pronoun. "CMS" and "django CMS" are optional before "toolbar" and "page
tree"; the modal and the sideframe are always "the CMS modal" and "the CMS
sideframe", which keeps them apart from webship-js's own modal steps. Every
failure is a short message with a hint that names what the page really shows.

### Session ([`django-cms-session.steps.js`](tests/step-definitions/django-cms-session.steps.js))

| Step | Type |
| --- | --- |
| `I am a logged in user with the "<handle>" user` | Given |
| `I am not logged in` | Given |
| `I am on the login page` | Given |
| `I log in as "<username>" with password "<password>"` (tests the form; asserts nothing) | When |
| `I log out` | When |
| `I should( not) be logged in` | Then |
| `I should( not) see the login form` | Then |
| `I should( not) see a login error( "<text>")` | Then |
| `I should( not) be allowed to open "<path>"` | Then |

### Toolbar, modal and sideframe ([`django-cms-toolbar.steps.js`](tests/step-definitions/django-cms-toolbar.steps.js))

| Step | Type |
| --- | --- |
| `I should( not) see the CMS toolbar` | Then |
| `I click "<entry>" in the CMS toolbar menu` (the site menu) | When |
| `I click "<entry>" in the "<menu>" toolbar menu` (`"Parent > Child"` for a sub-menu) | When |
| `the toolbar should( not) have the "<menu>" menu` | Then |
| `the "<menu>" toolbar menu should( not) list "<entry>"` | Then |
| `I click the "<label>" toolbar button` | When |
| `the toolbar should( not) have the "<label>" button` | Then |
| `I should( not) see the CMS message "<text>"` | Then |
| `the CMS modal should( not) be open` | Then |
| `the CMS modal title should( not) (be\|contain) "<text>"` | Then |
| `the CMS sideframe should( not) be showing "<url part>"` | Then |
| `I should( not) see "<text>" in the CMS (modal\|sideframe)` | Then |
| `I fill in "<field>" with "<value>" in the CMS (modal\|sideframe)` | When |
| `I click "<label>" in the CMS (modal\|sideframe)` | When |
| `I close the CMS (modal\|sideframe)` | When |

The modal and the sideframe load their content in an iframe. These steps
enter it; a feature never switches frames by hand.

### Pages, plugins and versions ([`django-cms-pages.steps.js`](tests/step-definitions/django-cms-pages.steps.js))

| Step | Type |
| --- | --- |
| `I open the create wizard` | When |
| `the create wizard should( not) offer "<choice>"` | Then |
| `I create a (page\|sub page) titled "<title>"( with the text "<text>") with the wizard` | When |
| `I open the page for editing` | When |
| `I should( not) be in edit mode` | Then |
| `I preview the page` | When |
| `I (open\|close) the structure board` | When |
| `I should( not) see the structure board` | Then |
| `I should( not) see the "<name>" placeholder` | Then |
| `I add a "<type>" plugin to the "<name>" placeholder` | When |
| `I add a text plugin with "<text>" to the "<name>" placeholder` | When |
| `I fill in the text editor with "<text>"` | When |
| `the text editor should( not) contain "<text>"` | Then |
| `I save the plugin` | When |
| `I edit the( first\|second\|last\|3rd) "<type>" plugin in the "<name>" placeholder` | When |
| `I delete the( first\|second\|last\|3rd) "<type>" plugin in the "<name>" placeholder` | When |
| `the "<name>" placeholder should( not) have a "<type>" plugin` | Then |
| `the "<name>" placeholder should have <n> plugins` | Then |
| `the page should( not) have editable plugins` | Then |
| `I publish the page` | When |
| `I unpublish the page` | When |
| `the page version should( not) be "<state>"` | Then |
| `the page should( not) be at version <n>` | Then |

### Page tree ([`django-cms-page-tree.steps.js`](tests/step-definitions/django-cms-page-tree.steps.js))

| Step | Type |
| --- | --- |
| `I am on the page tree` | Given |
| `I should( not) see the page tree` | Then |
| `I should( not) see "<title>" in the page tree` | Then |
| `the page "<title>" should( not) be (published\|a draft\|unpublished\|archived\|changed\|empty) in the page tree` | Then |
| `the page "<title>" should( not) be a sub page of "<parent>" in the page tree` | Then |
| `the page "<title>" should( not) be the home page in the page tree` | Then |
| `I open the page "<title>" from the page tree` | When |
| `I open the (advanced )settings of the page "<title>" in the page tree` | When |
| `I (publish\|unpublish) the page "<title>" in the page tree` | When |
| `I move the page "<title>" under the page "<parent>" in the page tree` | When |
| `I move the page "<title>" to the top level of the page tree` | When |
| `I delete the page "<title>" in the page tree` | When |

Titles match exactly, and the steps open collapsed branches to find a page.

### Users, groups and permissions ([`django-cms-admin.steps.js`](tests/step-definitions/django-cms-admin.steps.js))

| Step | Type |
| --- | --- |
| `I am on the (users\|groups\|sites\|aliases\|global page permissions) list` | Given |
| `I should( not) see "<name>" in the admin list` | Then |
| `I open "<name>" in the admin list` | When |
| `the user "<username>" should( not) be (staff\|a superuser\|active)` | Then |
| `the user "<username>" should( not) be in the "<group>" group` | Then |
| `the "<group>" group should( not) have the "<permission>" permission` | Then |
| `the administration should( not) offer "<section>"` | Then |

These steps read the admin; none of them creates or changes an account.

### Site ([`django-cms-site.steps.js`](tests/step-definitions/django-cms-site.steps.js))

| Step | Type |
| --- | --- |
| `the navigation menu should( not) list "<title>"` | Then |
| `I click "<title>" in the navigation menu` | When |
| `"<title>" should( not) be the active navigation menu entry` | Then |
| `I should( not) see the breadcrumb` | Then |
| `the breadcrumb should( not) contain "<title>"` | Then |
| `I switch the language to "<name or code>"` | When |
| `the language chooser should( not) offer "<name>"` | Then |
| `the active language should( not) be "<name>"` | Then |
| `I should( not) be on the page not found page` | Then |
| `I should( not) see the welcome screen` | Then |
| `the site should( not) be running django CMS( <version>)` | Then |

webship-js itself brings the steps for the rest: `the page language should be
"de"`, the accessibility audits (`the page should have no serious
accessibility violations`), forms, links and responses.

The regex and five examples of every step are in the comment above it in
[`tests/step-definitions/`](tests/step-definitions/), and
[`tests/features/`](tests/features/) shows every step at work.

## What the steps expect

- **The editing interface in English.** The steps find menus, buttons and
  wizard choices by the labels a feature gives them, and a few by django CMS's
  English labels ("New page", "Next", "Create", "Save"). Set `adminLanguage`
  when the site has more than one language.
- **djangocms-versioning** for the version steps (`I publish the page`, `the
  page version should be "Draft"`, the states in the page tree).
- **djangocms-text** for the text editor steps. Other editors are not covered.
- **The site templates** for the menu, the breadcrumb and the language
  chooser; see `worldParameters.djangoCms` above.

## Testing this package

The suite in [`tests/features/`](tests/features/) runs against the django CMS
site in [`site/`](site/README.md), a DDEV project:

```bash
npm install
npx playwright install chromium
npm run site:start        # the first start installs django CMS (a few minutes)

npm run site:empty && CUCUMBER_TAGS=@empty-site npm test   # the welcome screen of a site with no pages
npm run site:seed  && npm test                             # everything else, on the baseline content
```

- `npm run test:examples` checks that every `Example #n:` line matches its own
  step and no other, and that every feature step is defined exactly once.
- `npm run test:dry-run` loads every step and feature without a browser.
- `FEATURES=tests/features/a.feature,tests/features/b.feature npm test` runs a
  subset; `CUCUMBER_TAGS=@tag npm test` runs a lane. The default run leaves
  `@wip` and `@empty-site` out.
- `LAUNCH_URL` points the suite at another site. The features expect the
  baseline content of `npm run site:seed`; they create the pages they change
  and delete them again.
- `WEBSHIP_VIDEO=on-failure` records the browser, `WEBSHIP_JS_ERROR_MODE=fail`
  fails a scenario on a JavaScript error, and `WEBSHIP_STEP_TIMEOUT=<ms>`
  changes the step timeout of webship-js (45 seconds).

## License

[MIT](LICENSE) © Webship.co
