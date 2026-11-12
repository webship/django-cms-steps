'use strict';

/**
 * django-cms-steps / tests/step-definitions/django-cms-site.steps.js
 *
 * Steps for what a visitor sees on a django CMS site: the navigation menu,
 * the breadcrumb, the language chooser, the "page not found" page, and the
 * welcome screen of a site with no pages.
 *
 * The menu, the breadcrumb and the language chooser are rendered by the
 * site's own templates. The default selectors cover the quickstart's
 * Bootstrap 5 base template and django CMS's own menu templates
 * (`{% show_menu %}`, `{% show_breadcrumb %}`, `{% language_chooser %}`); a
 * project with other markup sets its selectors in cucumber.js:
 *
 *   worldParameters: { djangoCms: { menu: 'nav.main ul', breadcrumb: '.crumbs', languageChooser: '.languages li' } }
 */

const { When, Then } = require('@cucumber/cucumber');
const {
  SELECTORS, explain, frontEnd, budget, settle, escapeRegex, cleanLabel, actOrExplain, assertPresence, toolbarMenu, openToolbarMenu,
} = require('./django-cms-helpers');

const exact = (text) => new RegExp(`^\\s*${escapeRegex(text)}\\s*$`, 'i');
const MENU_HINT = 'The navigation menu is rendered by the site template; set worldParameters.djangoCms.menu in cucumber.js when the site uses other markup.';

function menuLinks(world) {
  return world.page.locator(frontEnd(world, 'menu')).locator('a');
}

async function menuLabels(world) {
  return [...new Set((await menuLinks(world).allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean))];
}

function chooserItems(world) {
  return world.page.locator(frontEnd(world, 'languageChooser'));
}

// ---------------------------------------------------------------------------
// Navigation menu and breadcrumb
// ---------------------------------------------------------------------------

/**
 * Assert the navigation menu lists (or does not list) a page, by its menu
 * title. Entries of a sub-menu count, open or not. Only pages that are
 * published and in the navigation show in the menu.
 *
 * Example #1: Then the navigation menu should list "About"
 * Example #2: Then the navigation menu should not list "Draft notes"
 * Example #3: And the navigation menu should list "Team"
 * Example #4: Then the navigation menu should contain "Contact"
 * Example #5: But the navigation menu should not contain "News"
 *
 */
Then(/^the navigation menu should( not)* (?:list|contain) "([^"]*)"$/, async function (notCase, title) {
  try {
    await menuLinks(this).filter({ hasText: exact(title) }).first().waitFor({ state: notCase ? 'detached' : 'attached', timeout: notCase ? 2000 : budget(this) });
  } catch {
    const labels = await menuLabels(this);
    throw explain({
      message: notCase ? `Expected the navigation menu not to list "${title}", but it does.` : `Expected the navigation menu to list "${title}". It lists: ${labels.map((l) => `"${l}"`).join(', ') || '(nothing)'}.`,
      hint: `A page shows in the menu when it is published and "in navigation". ${MENU_HINT}`,
    });
  }
});

/**
 * Click an entry of the navigation menu. An entry inside a closed sub-menu
 * is reached by opening its parent first, as a visitor would.
 *
 * Example #1: When I click "About" in the navigation menu
 * Example #2: When I click "Team" in the navigation menu
 * Example #3: And we click "Contact" in the navigation menu
 * Example #4: When click "Home" in the navigation menu
 * Example #5: And we click "Team" in the navigation menu
 *
 */
When(/^(I |we )*click "([^"]*)" in the navigation menu$/, async function (pronounCase, title) {
  const link = menuLinks(this).filter({ hasText: exact(title) }).first();
  if (!(await link.count())) {
    const labels = await menuLabels(this);
    throw explain({ message: `The navigation menu has no "${title}" entry. It lists: ${labels.map((l) => `"${l}"`).join(', ') || '(nothing)'}.`, hint: MENU_HINT });
  }
  await actOrExplain('click', `"${title}" in the navigation menu`, async () => {
    if (!(await link.isVisible())) {
      // The entry sits in a closed sub-menu: open the parent entry first.
      const parent = link.locator('xpath=ancestor::li[1]').locator(':scope > a').first();
      await parent.click();
      await link.waitFor({ state: 'visible', timeout: budget(this) });
    }
    await link.click();
  }, MENU_HINT);
  await settle(this);
});

/**
 * Assert an entry of the navigation menu is (or is not) marked as the
 * current page (the `active` or `selected` class, or `aria-current`).
 *
 * Example #1: Then "About" should be the active navigation menu entry
 * Example #2: Then "Home" should not be the active navigation menu entry
 * Example #3: And "Team" should be the active navigation menu entry
 * Example #4: Then "Contact" should be the active navigation menu entry
 * Example #5: But "About" should not be the active navigation menu entry
 *
 */
Then(/^"([^"]*)" should( not)* be the active navigation menu entry$/, async function (title, notCase) {
  const link = menuLinks(this).filter({ hasText: exact(title) }).first();
  if (!(await link.count())) {
    throw explain({ message: `The navigation menu has no "${title}" entry. It lists: ${(await menuLabels(this)).map((l) => `"${l}"`).join(', ') || '(nothing)'}.`, hint: MENU_HINT });
  }
  const active = await link.evaluate((a, selector) => a.matches(selector) || (a.parentElement && a.parentElement.matches(selector)), frontEnd(this, 'menuActive'));
  if (Boolean(notCase) === active) {
    throw explain({ message: `Expected "${title}" ${notCase ? 'not ' : ''}to be the active navigation menu entry, but it ${active ? 'is' : 'is not'}.`, hint: 'django CMS marks the entry of the current page; an entry above it is an ancestor, not the active one.' });
  }
});

/**
 * Assert the breadcrumb is (or is not) on the page.
 *
 * Example #1: Then I should see the breadcrumb
 * Example #2: Then I should not see the breadcrumb
 * Example #3: And we should see the breadcrumb
 * Example #4: Then should see the breadcrumb trail
 * Example #5: But we should not see the breadcrumbs
 *
 */
Then(/^(I |we )*should( not)* see the breadcrumbs?(?: trail)?$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator(frontEnd(this, 'breadcrumb')), notCase, {
    label: 'the breadcrumb',
    hint: 'The breadcrumb is rendered by the site template ({% show_breadcrumb %}); set worldParameters.djangoCms.breadcrumb in cucumber.js when the site uses other markup.',
    timeout: notCase ? 2000 : budget(this),
  });
});

/**
 * Assert the breadcrumb contains (or does not contain) a page, by its menu
 * title: a link for an ancestor, plain text for the current page.
 *
 * Example #1: Then the breadcrumb should contain "About"
 * Example #2: Then the breadcrumb should not contain "Contact"
 * Example #3: And the breadcrumb should contain "Team"
 * Example #4: Then the breadcrumbs should contain "Home"
 * Example #5: But the breadcrumb should not contain "Draft notes"
 *
 */
Then(/^the breadcrumbs? should( not)* contain "([^"]*)"$/, async function (notCase, title) {
  const crumbs = this.page.locator(frontEnd(this, 'breadcrumb')).locator('a, span:not(.separator), li');
  try {
    await crumbs.filter({ hasText: exact(title) }).first().waitFor({ state: notCase ? 'detached' : 'attached', timeout: notCase ? 2000 : budget(this) });
  } catch {
    const trail = [...new Set((await this.page.locator(frontEnd(this, 'breadcrumb')).locator('a, span:not(.separator)').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean))];
    throw explain({
      message: notCase ? `Expected the breadcrumb not to contain "${title}", but it does.` : `Expected the breadcrumb to contain "${title}". It reads: ${trail.join(' > ') || '(empty)'}.`,
      hint: 'The breadcrumb lists the pages from the home page down to the current page.',
    });
  }
});

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------

/**
 * Switch the page to another language, by the name the site shows
 * ("Deutsch") or by its code ("de"). The step uses the language chooser of
 * the page; when the page has none and the toolbar shows, it uses the
 * toolbar's "Language" menu.
 *
 * Example #1: When I switch the language to "Deutsch"
 * Example #2: When I switch the language to "English"
 * Example #3: And we switch the language to "de"
 * Example #4: When switch the page language to "Deutsch"
 * Example #5: And we switch the site language to "en"
 *
 */
When(/^(I |we )*switch the (?:page |site )?language to "([^"]*)"$/, async function (pronounCase, language) {
  const page = this.page;
  const byName = chooserItems(this).locator('a').filter({ hasText: exact(language) });
  const byCode = chooserItems(this).locator(`a[href^="/${language.replace(/["\\]/g, '')}/"], a[hreflang="${language.replace(/["\\]/g, '')}"]`);
  const link = byName.or(byCode).first();
  await actOrExplain('switch the language to', language, async () => {
    if (await link.count()) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
        link.click(),
      ]);
      return;
    }
    if (!(await page.locator(SELECTORS.toolbarBar).count())) {
      const offered = (await chooserItems(this).locator('a').allTextContents()).map((t) => `"${t.trim()}"`);
      throw explain({ message: `The language chooser does not offer "${language}". It offers: ${offered.join(', ') || '(nothing)'}.`, hint: 'The language chooser is rendered by the site template ({% language_chooser %}); set worldParameters.djangoCms.languageChooser in cucumber.js when the site uses other markup.' });
    }
    const menu = await openToolbarMenu(this, 'Language');
    const entry = menu.locator(':scope > ul > li > a').filter({ hasText: exact(language) }).first();
    await entry.waitFor({ state: 'visible', timeout: budget(this) });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      entry.click(),
    ]);
  }, 'A page can only be switched to a language it is translated into.');
  await settle(this);
});

/**
 * Assert the language chooser of the page offers (or does not offer) a
 * language, by the name the site shows.
 *
 * Example #1: Then the language chooser should offer "Deutsch"
 * Example #2: Then the language chooser should offer "English"
 * Example #3: And the language chooser should not offer "Français"
 * Example #4: Then the language chooser should list "Deutsch"
 * Example #5: But the language chooser should not list "Italiano"
 *
 */
Then(/^the language chooser should( not)* (?:offer|list) "([^"]*)"$/, async function (notCase, language) {
  const offered = (await chooserItems(this).locator('a').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
  const has = offered.some((name) => name.toLowerCase() === language.trim().toLowerCase());
  if (Boolean(notCase) === has) {
    throw explain({
      message: notCase ? `Expected the language chooser not to offer "${language}", but it does.` : `Expected the language chooser to offer "${language}". It offers: ${offered.map((o) => `"${o}"`).join(', ') || '(nothing)'}.`,
      hint: 'The chooser lists the languages of the site (CMS_LANGUAGES); set worldParameters.djangoCms.languageChooser in cucumber.js when the site uses other markup.',
    });
  }
});

/**
 * Assert which language the language chooser marks as the current one, by
 * the name the site shows.
 *
 * Example #1: Then the active language should be "English"
 * Example #2: Then the active language should be "Deutsch"
 * Example #3: And the active language should not be "English"
 * Example #4: Then the active language should be "Français"
 * Example #5: But the active language should not be "Deutsch"
 *
 */
Then(/^the active language should( not)* be "([^"]*)"$/, async function (notCase, language) {
  const active = (await chooserItems(this).and(this.page.locator('.active, .selected, [aria-current]')).locator('a').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
  const is = active.some((name) => name.toLowerCase() === language.trim().toLowerCase());
  if (Boolean(notCase) === is) {
    throw explain({ message: `Expected the active language ${notCase ? 'not ' : ''}to be "${language}", but the chooser marks ${active.map((a) => `"${a}"`).join(', ') || 'none'}.`, hint: 'django CMS marks the current language with the `active` class in its language chooser.' });
  }
});

// ---------------------------------------------------------------------------
// Page not found, the welcome screen, the version
// ---------------------------------------------------------------------------

/**
 * Assert the page in the browser is (or is not) a "page not found" page:
 * the site answers its URL with the 404 status. A page that is not published
 * answers 404 to a visitor.
 *
 * Example #1: Then I should be on the page not found page
 * Example #2: Then I should not be on the page not found page
 * Example #3: And we should be on the 404 page
 * Example #4: Then should be on the 404 page
 * Example #5: But we should not be on the page not found page
 *
 */
Then(/^(I |we )*should( not)* be on the (?:404|page not found) page$/, async function (pronounCase, notCase) {
  const response = await this.page.request.get(this.page.url(), { maxRedirects: 5 });
  const status = response.status();
  if (Boolean(notCase) === (status === 404)) {
    throw explain({ message: `Expected "${this.page.url()}" ${notCase ? 'not ' : ''}to be a page not found page, but the site answers ${status}.`, hint: 'django CMS answers 404 for a path with no page, and for a page with no published version when the visitor may not edit it.' });
  }
});

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

/**
 * Assert the site runs django CMS, optionally a given version or version
 * line ("5", "5.1", "5.1.3"). The version is the one the toolbar reports, so
 * the step needs a logged-in staff user on a CMS page.
 *
 * Example #1: Then the site should be running django CMS
 * Example #2: Then the site should be running django CMS 5
 * Example #3: And the site should be running django CMS 5.1
 * Example #4: Then the site should not be running django CMS 3
 * Example #5: But the site should not be running django CMS 4
 *
 */
Then(/^the site should( not)* be running django CMS(?: (\d+(?:\.\d+)*))?$/, async function (notCase, wanted) {
  await toolbarMenu(this, 'site');
  const version = await this.page.evaluate(() => (window.CMS && window.CMS.config && window.CMS.config.settings ? window.CMS.config.settings.version : null))
    || cleanLabel(await this.page.locator('#cms-top .cms-toolbar-item-logo a').first().getAttribute('title').catch(() => ''));
  const matches = Boolean(version) && (!wanted || version === wanted || version.startsWith(`${wanted}.`));
  if (Boolean(notCase) === matches) {
    throw explain({ message: `Expected the site ${notCase ? 'not ' : ''}to be running django CMS${wanted ? ` ${wanted}` : ''}, but the toolbar reports ${version || 'no version'}.`, hint: 'The toolbar reports the version to a logged-in staff user on a CMS page.' });
  }
});
