# django-cms-steps

Custom [webship-js](https://www.npmjs.com/package/webship-js) step definitions
for testing [django CMS](https://www.django-cms.org/) sites: Django admin
login/logout (as a user from the `users` registry), the CMS toolbar, toolbar
navigation (including the sideframe overlay), the page tree, and the
"no pages yet" welcome screen.

`@webship-js/django-cms-steps` is a **plugin** for webship-js — it does not replace it. It
ships one file, `tests/step-definitions/django-cms.steps.js`, of extra `Given`/`When`/`Then`
steps that you load alongside webship-js's own step library in your project's
`cucumber.js`. There is no `custom.js`; every step this package provides
lives in `django-cms.steps.js`.

## Install

```bash
npm install --save-dev webship-js @webship-js/django-cms-steps
```

Both packages are devDependencies of your test project. `webship-js` is a
peer dependency of `@webship-js/django-cms-steps`.

## Quick start

Add this package's steps to your `cucumber.js` `require` array, next to
webship-js's own:

```js
// cucumber.js
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js',
      'node_modules/@webship-js/django-cms-steps/tests/step-definitions/*.steps.js',
      'tests/step-definitions/**/*.js', // your own project-specific steps, if any
    ],
    paths: ['tests/features/**/*.feature'],
    worldParameters: {
      launchUrl: process.env.LAUNCH_URL || 'http://localhost',
      // Accounts for "a logged in user with the "<key>" user". Keep the
      // password out of the repo: read it from an environment variable.
      users: {
        admin: {
          username: process.env.DJANGOCMS_ADMIN_USER || 'admin',
          password: process.env.DJANGOCMS_ADMIN_PASS || 'admin',
        },
      },
    },
  },
};
```

Then write a feature using the new steps:

```gherkin
Feature: CMS toolbar

  Scenario: Admin sees the CMS toolbar and opens the page tree
    Given I am a logged in user with the "admin" user
    Then I should see the CMS toolbar
    When I click "Pages" in the CMS toolbar menu
    Then the CMS sideframe should be showing "/admin/cms/pagecontent/"
```

```bash
npx cucumber-js --config cucumber.js
```

## Steps

| Step | Type |
| --- | --- |
| `I am a logged in user with the "<key>" user` (reads `worldParameters.users`) | Given |
| `I am not logged in` (clears cookies and storage, asserts the admin login form) | Given |
| `I log out` | When |
| `I should( not) see the CMS toolbar` | Then |
| `I click "<label>" in the CMS toolbar menu` | When |
| `the CMS sideframe should( not) be showing "<url part>"` | Then |
| `I am on the page tree` | Given |
| `I should( not) see the page tree` | Then |
| `I should( not) see "<title>" in the page tree` | Then |
| `I should( not) see the welcome screen` | Then |

The product word is optional in every sentence: "the CMS toolbar", "the
django CMS toolbar" and "the toolbar" all match, so a feature written for
another pack reads here too. Every Then step takes `should` or `should not`,
every When/Then step takes `I`, `we` or no pronoun, and every failure is a
friendly message with a hint (no Playwright stack). Assertions wait on their
locator for the `minWaitTime.page` budget (at least 10 s) instead of reading
the page once.

Every step's regex and five Gherkin examples are in the JSDoc block above it in
[`tests/step-definitions/django-cms.steps.js`](tests/step-definitions/django-cms.steps.js);
`npm run test:examples` checks that each example matches its own step (and no
webship-js core step) and that every feature step is defined exactly once.

## Testing this package itself

This repository also contains its own test suite (`tests/features/`) that
exercises the steps in `tests/step-definitions/django-cms.steps.js`. It
doesn't bundle a demo site — point it at any django CMS install you have via
`LAUNCH_URL`. CI builds a throwaway django CMS site with
[ddev](https://ddev.com/) at run time to test against on every push/PR — see
[.github/workflows/test.yml](.github/workflows/test.yml).

## License

[MIT](LICENSE) © Webship.co
