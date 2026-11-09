'use strict';

/**
 * django-cms-steps / tests/step-definitions/django-cms.steps.js
 *
 * Custom webship-js step definitions for testing django CMS sites:
 * Django admin authentication, the CMS toolbar and its navigation menu,
 * the page tree, and the "no pages yet" welcome screen.
 *
 * These steps assume the standard webship-js World: `this.page`
 * (Playwright Page), `this.context` (BrowserContext), `this.launchUrl`,
 * and `this.parameters` (cucumber.js worldParameters).
 *
 * Selectors below were captured against a real django CMS 5 install
 * (Django admin login form, the `#cms-top` / `.cms-toolbar` toolbar, and
 * the `.cms-pagetree` page-tree admin). Every step documents its Gherkin
 * phrasing in the JSDoc block right above it.
 */

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { gotoUrl, smartSettle } = require('webship-js/tests/step-definitions/webship');

// ---------------------------------------------------------------------------
// Shared selectors (django CMS toolbar / Django admin)
// ---------------------------------------------------------------------------

const SELECTORS = {
  // The CMS toolbar is mounted as #cms-top and always carries the
  // .cms-toolbar class on its inner bar, whether or not there are any
  // pages yet.
  toolbar: '#cms-top',
  toolbarBar: '#cms-top .cms-toolbar',
  toolbarNav: '#cms-top .cms-toolbar-item-navigation',
  // Django's own admin login form (served at /admin/login/).
  loginForm: '#login-form',
  loginUsername: '#id_username',
  loginPassword: '#id_password',
  // The page-tree change list at /admin/cms/pagecontent/.
  pageTree: '.cms-pagetree-jstree, .cms-pagetree',
  pageTreeEmpty: '.cms-pagetree-empty',
  // The "no pages yet" welcome screen shown on a fresh install.
  welcomeScreen: '.cms-welcome-heading, .cms-welcome-section, .cms-welcome, #cms-welcome-config',
};

function siteRoot(launchUrl) {
  return String(launchUrl).replace(/\/$/, '');
}

async function settle(world, fallback) {
  await smartSettle(world.page, (world.minWaitTime && world.minWaitTime.page) || fallback || 3000);
}

/**
 * Look up a named user from cucumber.js worldParameters.users
 * (`{ <key>: { username, password } }`), throwing a helpful error if it is
 * not configured.
 */
function resolveUser(parameters, userKey) {
  const users = (parameters && parameters.users) || {};
  const entry = users[userKey];
  if (!entry) {
    throw new Error(
      `User "${userKey}" is not configured. Add it to worldParameters.users in cucumber.js. ` +
        `Known users: ${Object.keys(users).join(', ') || '(none)'}.`
    );
  }
  const username = entry.username || userKey;
  const password = typeof entry === 'string' ? entry : entry.password;
  if (!password) {
    throw new Error(
      `User "${userKey}" has no password configured. Set worldParameters.users.${userKey}.password ` +
        'in cucumber.js, ideally from an environment variable.'
    );
  }
  return { username, password };
}

/**
 * Open the toolbar's site-name dropdown. It opens on click, toggling a
 * "-hover" class via JS; it is not a plain CSS :hover menu.
 */
async function openToolbarSiteMenu(page) {
  await page.waitForSelector(SELECTORS.toolbarNav, { state: 'visible', timeout: 10000 });
  const siteMenu = page.locator(`${SELECTORS.toolbarNav} > li`).first();
  await siteMenu.click();
}

// ---------------------------------------------------------------------------
// Authentication (Django admin login)
// ---------------------------------------------------------------------------

/**
 * Log in through the Django admin login form as a user from the `users`
 * registry in cucumber.js worldParameters (`{ <key>: { username, password } }`,
 * with the password read from an environment variable so no credential has
 * to live in a feature file).
 *
 * The CMS toolbar is only injected on pages served through the CMS, not on
 * the raw Django admin index, so the login redirects back to the front end
 * ("/"). A default django CMS project (as scaffolded by the `python -m cms`
 * installer) serves a single, unprefixed language, so URLs here are bare:
 * no "/en/" (or other language code) segment.
 *
 * Example #1: Given I am a logged in user with the username "admin"
 * Example #2: Given we are a logged in user with username "admin"
 * Example #3: Given I am a logged in user with "admin"
 * Example #4: And a logged in user with the username "admin"
 * Example #5: Given I am a logged in user with the username "admin" user
 *
 */
Given(/^(I am |we are )*a logged in user with( the)*( username)* "([^"]*)?"( user)*$/, async function (pronounCase, theCase, usernameCase, userKey, userCase) {
  const { username, password } = resolveUser(this.parameters, userKey);
  const page = this.page;
  await gotoUrl(page, `${siteRoot(this.launchUrl)}/admin/login/?next=/`);
  await page.waitForSelector(SELECTORS.loginUsername, { state: 'visible', timeout: 10000 });
  await page.fill(SELECTORS.loginUsername, username);
  await page.fill(SELECTORS.loginPassword, password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
    page.evaluate((formSelector) => {
      const submit = document.querySelector(`${formSelector} input[type="submit"], ${formSelector} button[type="submit"]`);
      if (!submit) throw new Error(`The login form "${formSelector}" has no submit button.`);
      submit.click();
    }, SELECTORS.loginForm),
  ]);
  await settle(this);
  const stillOnLogin = await page.locator(`${SELECTORS.loginForm} .errornote`).count();
  if (stillOnLogin) {
    const text = (await page.locator(`${SELECTORS.loginForm} .errornote`).innerText()).trim();
    throw new Error(`Login as "${username}" was rejected: ${text}`);
  }
});

/**
 * Make sure nobody is logged in: clear the browser's cookies and web
 * storage, load the Django admin login page again, and assert its login
 * form (`#login-form`) is showing.
 *
 * Example #1: Given I am not logged in
 * Example #2: Given we are not logged in
 * Example #3: And not logged in
 * Example #4: Given I am not logged in
 * Example #5: And we are not logged in
 *
 */
Given(/^(I am |we are )*not logged in$/, async function (pronounCase) {
  await this.context.clearCookies();
  await this.page.evaluate(() => {
    try { window.localStorage.clear(); } catch (e) { /* storage may be unavailable */ }
    try { window.sessionStorage.clear(); } catch (e) { /* storage may be unavailable */ }
  }).catch(() => {});
  const loginUrl = `${siteRoot(this.launchUrl)}/admin/login/`;
  if (this.page.url().startsWith(loginUrl)) {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
  } else {
    await gotoUrl(this.page, loginUrl);
  }
  await this.page.waitForSelector(SELECTORS.loginForm, { state: 'visible', timeout: 10000 });
  await settle(this, 1000);
});

/**
 * Log out of the Django admin / CMS toolbar.
 *
 * django CMS's "Logout <username>" toolbar link submits an AJAX POST
 * (Django's admin logout view rejects a bare GET), so this step opens the
 * toolbar's site-name menu and clicks through it rather than navigating
 * to /admin/logout/ directly.
 *
 * Example #1: When I log out
 * Example #2: When we log out
 * Example #3: And I log out
 *
 */
When(/^(I |we )*log out$/, async function (pronounCase) {
  await openToolbarSiteMenu(this.page);
  const logoutLink = this.page.locator(`${SELECTORS.toolbarNav} a`).filter({ hasText: /Logout/i });
  await Promise.all([
    this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
    logoutLink.first().click(),
  ]);
  await settle(this);
});

// ---------------------------------------------------------------------------
// CMS toolbar
// ---------------------------------------------------------------------------

/**
 * Assert the django CMS toolbar is (or is not) visible. It renders for
 * logged-in staff users and never for anonymous visitors.
 *
 * Example #1: Then I should see the CMS toolbar
 * Example #2: Then I should not see the CMS toolbar
 * Example #3: And we should see the CMS toolbar
 * Example #4: But we should not see the CMS toolbar
 *
 */
Then(/^(I |we )*should( not)* see the CMS toolbar$/, async function (pronounCase, notCase) {
  if (notCase) {
    const count = await this.page.locator(SELECTORS.toolbar).count();
    assert.strictEqual(count, 0, 'CMS toolbar should not be visible but it is.');
    return;
  }
  await this.page.waitForSelector(SELECTORS.toolbarBar, { state: 'visible', timeout: 10000 });
});

/**
 * Open the toolbar's site-name menu and click a link by its visible text
 * (e.g. the "Pages...", "Users...", "Administration...", "Aliases...", or
 * "User settings..." entries). Matching is case-insensitive and ignores a
 * trailing ellipsis, so "Pages" matches "Pages...".
 *
 * Most of these links carry `data-rel="sideframe"`: django CMS opens them
 * in an in-page iframe overlay (`.cms-sideframe`) rather than navigating
 * the main page. Assert on the sideframe with the step below, not with
 * webship-js's generic "I should be on ..." page-URL steps.
 *
 * Example #1: When I click "Pages" in the CMS toolbar menu
 * Example #2: When I click "Users" in the CMS toolbar menu
 * Example #3: And we click "Administration" in the CMS toolbar menu
 *
 */
When(/^(I |we )*click "([^"]*)" in the CMS toolbar menu$/, async function (pronounCase, linkText) {
  await openToolbarSiteMenu(this.page);
  const label = linkText.trim().replace(/[.…]+$/, '');
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const link = this.page
    .locator(`${SELECTORS.toolbarNav} a`)
    .filter({ hasText: new RegExp(`^\\s*${escaped}(?:\\.\\.\\.|…)?\\s*$`, 'i') });
  await link.first().click();
  await settle(this, 1000);
});

/**
 * Assert the CMS sideframe overlay is open and its iframe is showing a
 * URL containing the given substring.
 *
 * Example #1: Then the CMS sideframe should be showing "/admin/cms/pagecontent/"
 * Example #2: Then the CMS sideframe should be showing "/admin/auth/user/"
 * Example #3: And the CMS sideframe should be showing "/admin/"
 *
 */
Then(/^the CMS sideframe should be showing "([^"]*)"$/, async function (urlSubstring) {
  const iframe = this.page.locator('.cms-sideframe-frame iframe').first();
  await iframe.waitFor({ state: 'attached', timeout: 10000 });
  const src = await iframe.getAttribute('src');
  assert.ok(
    src && src.includes(urlSubstring),
    `Expected the CMS sideframe to be showing a URL containing "${urlSubstring}" but it was showing "${src}".`
  );
});

// ---------------------------------------------------------------------------
// Page tree
// ---------------------------------------------------------------------------

/**
 * Navigate directly to the django CMS page-tree admin
 * (/admin/cms/pagecontent/).
 *
 * Example #1: Given I am on the django CMS page tree
 * Example #2: Given we are on the django CMS page tree
 * Example #3: And on the django CMS page tree
 *
 */
Given(/^(I am |we are )*on the django CMS page tree$/, async function (pronounCase) {
  await gotoUrl(this.page, `${siteRoot(this.launchUrl)}/admin/cms/pagecontent/`);
  await settle(this);
});

/**
 * Assert the page tree admin has rendered (either populated or the
 * "no pages yet" empty state).
 *
 * Example #1: Then I should see the page tree
 * Example #2: Then we should see the page tree
 * Example #3: And should see the page tree
 *
 */
Then(/^(I |we )*should see the page tree$/, async function (pronounCase) {
  await this.page.waitForSelector(SELECTORS.pageTree, { state: 'visible', timeout: 10000 });
});

/**
 * Assert a page with the given title is listed in the page tree.
 *
 * Example #1: Then I should see "Home" in the page tree
 * Example #2: Then we should see "About" in the page tree
 * Example #3: And should see "Contact" in the page tree
 *
 */
Then(/^(I |we )*should see "([^"]*)" in the page tree$/, async function (pronounCase, title) {
  await this.page.waitForSelector(SELECTORS.pageTree, { state: 'visible', timeout: 10000 });
  const entry = this.page.locator('.cms-pagetree-jstree').getByText(title, { exact: false });
  await entry.first().waitFor({ state: 'visible', timeout: 10000 });
});

// ---------------------------------------------------------------------------
// Welcome screen (fresh install, no pages yet)
// ---------------------------------------------------------------------------

/**
 * Assert the django CMS "no pages yet" welcome screen is showing. django CMS
 * renders it for the site root while the site has no pages at all, for a
 * signed-in user: its script sends an anonymous visitor to the login form, so
 * log in first.
 *
 * Example #1: Then I should see the django CMS welcome screen
 * Example #2: Then we should see the django CMS welcome screen
 * Example #3: And should see the django CMS welcome screen
 *
 */
Then(/^(I |we )*should see the django CMS welcome screen$/, async function (pronounCase) {
  // The welcome wrapper itself can report no box of its own (its parts are positioned), so the
  // assertion is on a part a visitor reads: the heading or a section.
  await this.page.waitForSelector(SELECTORS.welcomeScreen, { state: 'attached', timeout: 10000 });
  const part = this.page.locator('.cms-welcome-heading, .cms-welcome-section, #cms-welcome-config').first();
  await part.waitFor({ state: 'visible', timeout: 10000 });
});
