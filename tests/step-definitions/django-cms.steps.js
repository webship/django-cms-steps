'use strict';

/**
 * django-cms-steps / tests/step-definitions/django-cms.steps.js
 *
 * The page tree and the welcome screen of a site with no pages. The session
 * steps are in django-cms-session.steps.js, the toolbar, modal and sideframe
 * steps in django-cms-toolbar.steps.js, and the shared selectors and helpers
 * in django-cms-helpers.js.
 */

const { Given, Then } = require('@cucumber/cucumber');
const {
  SELECTORS, gotoUrl, explain, adminUrl, budget, settle, assertPresence, findPageTreeRow, requirePageTreeRow,
} = require('./django-cms-helpers');

const TREE_HINT = 'Open the page tree first ("I am on the page tree"); it needs a staff user who may change pages.';

// ---------------------------------------------------------------------------
// Page tree
// ---------------------------------------------------------------------------

/**
 * Open the page tree, the admin list of pages (/admin/cms/pagecontent/).
 *
 * Example #1: Given I am on the django CMS page tree
 * Example #2: Given we are on the django CMS page tree
 * Example #3: And on the django CMS page tree
 * Example #4: Given I am on the CMS page tree
 * Example #5: Given I am on the page tree
 *
 */
Given(/^(I am |we are )*on the (?:(?:django )?CMS )?page tree$/, async function (pronounCase) {
  await gotoUrl(this.page, adminUrl(this, 'cms/pagecontent/'));
  await settle(this);
});

/**
 * Assert the page tree is (or is not) on the page, with pages or empty.
 *
 * Example #1: Then I should see the page tree
 * Example #2: Then we should see the page tree
 * Example #3: And should see the CMS page tree
 * Example #4: Then I should not see the page tree
 * Example #5: And we should see the django CMS page tree
 *
 */
Then(/^(I |we )*should( not)* see the (?:(?:django )?CMS )?page tree$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator(SELECTORS.pageTree), notCase, {
    label: 'the page tree (`.cms-pagetree`)',
    hint: TREE_HINT,
    timeout: notCase ? 2000 : budget(this),
  });
});

/**
 * Assert the page tree lists (or does not list) a page with exactly this
 * title. The step opens collapsed branches, so a sub page is found too.
 *
 * Example #1: Then I should see "Home" in the page tree
 * Example #2: Then we should see "About" in the page tree
 * Example #3: And should see "Team" in the page tree
 * Example #4: Then I should not see "Old news" in the page tree
 * Example #5: And we should see "Contact" in the CMS page tree
 *
 */
Then(/^(I |we )*should( not)* see "([^"]*)" in the (?:(?:django )?CMS )?page tree$/, async function (pronounCase, notCase, title) {
  const row = await findPageTreeRow(this, title);
  if (notCase && row) {
    throw explain({ message: `Expected the page tree not to list "${title}", but it does.`, hint: 'Titles match exactly, in the language the page tree shows.' });
  }
  if (!notCase && !row) await requirePageTreeRow(this, title);
});

// ---------------------------------------------------------------------------
// Welcome screen (a site with no pages)
// ---------------------------------------------------------------------------

/**
 * Assert the django CMS "no pages yet" welcome screen is (or is not)
 * showing. django CMS renders it on the site root while the site has no
 * page at all.
 *
 * Example #1: Then I should see the django CMS welcome screen
 * Example #2: Then we should see the django CMS welcome screen
 * Example #3: And should see the CMS welcome screen
 * Example #4: Then I should see the welcome screen
 * Example #5: Then I should not see the welcome screen
 *
 */
Then(/^(I |we )*should( not)* see the (?:(?:django )?CMS )?welcome screen$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator(SELECTORS.welcomePart), notCase, {
    label: 'the "no pages yet" welcome screen',
    hint: notCase
      ? 'The welcome screen shows while the site has no page at all; create a page to replace it.'
      : 'The welcome screen only renders on the site root of a site with no pages.',
    timeout: notCase ? 2000 : budget(this),
  });
});
