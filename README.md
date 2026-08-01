# django-cms-steps

Custom [webship-js](https://www.npmjs.com/package/webship-js) step definitions
for testing [django CMS](https://www.django-cms.org/) sites: Django admin
login/logout, the CMS toolbar, toolbar navigation (including the sideframe
overlay), and the page tree.

`@webship/django-cms-steps` is a **plugin** for webship-js — it does not replace it. It
ships one file, `tests/step-definitions/django-cms.steps.js`, of extra `Given`/`When`/`Then`
steps that you load alongside webship-js's own step library in your project's
`cucumber.js`. There is no `custom.js`; every step this package provides
lives in `django-cms.steps.js`.

## Install

```bash
npm install --save-dev webship-js @webship/django-cms-steps
```

Both packages are devDependencies of your test project. `webship-js` is a
peer dependency of `@webship/django-cms-steps`.

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
      'node_modules/@webship/django-cms-steps/tests/step-definitions/*.steps.js',
      'tests/step-definitions/**/*.js', // your own project-specific steps, if any
    ],
    paths: ['tests/features/**/*.feature'],
    worldParameters: {
      launchUrl: process.env.LAUNCH_URL || 'http://localhost',
      users: {
        admin: { username: 'admin', password: 'admin' },
      },
    },
  },
};
```

Then write a feature using the new steps:

```gherkin
Feature: CMS toolbar

  Scenario: Admin sees the CMS toolbar and opens the page tree
    Given I am logged in as "admin"
    Then I should see the CMS toolbar
    When I click "Pages" in the CMS toolbar menu
    Then the CMS sideframe should be showing "/admin/cms/pagecontent/"
```

```bash
npx cucumber-js --config cucumber.js
```

## Testing this package itself

This repository also contains its own test suite (`tests/features/`) that
exercises the steps in `tests/step-definitions/django-cms.steps.js`. It
doesn't bundle a demo site — point it at any django CMS install you have via
`LAUNCH_URL`. CI builds a throwaway django CMS site with
[ddev](https://ddev.com/) at run time to test against on every push/PR — see
[.github/workflows/test.yml](.github/workflows/test.yml).

## License

[MIT](LICENSE) © Webship.co
