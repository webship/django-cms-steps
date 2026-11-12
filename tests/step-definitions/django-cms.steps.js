'use strict';

/**
 * django-cms-steps / tests/step-definitions/django-cms.steps.js
 *
 * The welcome screen of a site with no pages. The other steps are in the
 * files next to this one, by area: session, toolbar, pages, page tree.
 */

const { Then } = require('@cucumber/cucumber');
const { SELECTORS, budget, assertPresence } = require('./django-cms-helpers');

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
