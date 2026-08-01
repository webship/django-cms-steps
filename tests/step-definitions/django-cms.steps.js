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
 * Selectors below were captured against a real django CMS 5.1 install
 * (Django admin login form, the `#cms-top` / `.cms-toolbar` toolbar, and
 * the `.cms-pagetree` page-tree admin) — see docs/step-reference.md for
 * the full list with examples.
 */

const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

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
  // Django's own admin login form (used at /<lang>/admin/login/).
  loginForm: '#login-form',
  loginUsername: '#id_username',
  loginPassword: '#id_password',
  // The page-tree change list at /admin/cms/pagecontent/.
  pageTree: '.cms-pagetree-jstree, .cms-pagetree',
  pageTreeEmpty: '.cms-pagetree-empty',
  // The "no pages yet" welcome screen shown on a fresh install.
  welcomeScreen: '.cms-welcome, #cms-welcome-config',
};

/**
 * Look up a named user (username/password) from cucumber.js
 * worldParameters.users, throwing a helpful error if it is not configured.
 */
function resolveUser(parameters, role) {
  const users = (parameters && parameters.users) || {};
  if (!(role in users)) {
    throw new Error(
      `User "${role}" is not defined in cucumber.js worldParameters.users. ` +
        `Available users: ${Object.keys(users).join(', ') || '(none configured)'}`
    );
  }
  return users[role];
}

// ---------------------------------------------------------------------------
// Authentication (Django admin login)
// ---------------------------------------------------------------------------

/**
 * Log in through the Django admin login form as a named user from
 * cucumber.js worldParameters.users.
 *
 * Example: Given I am logged in as "admin"
 */
Given(/^I am logged in as "([^"]*)"$/, async function (role) {
  const { username, password } = resolveUser(this.parameters, role);
  // The CMS toolbar is only injected on pages served through the CMS
  // request/response cycle, not on the raw Django admin index, so redirect
  // back to the front end ("/") rather than "/admin/" after login. A
  // default django CMS project (as scaffolded by the `python -m cms`
  // installer) serves a single, unprefixed language and does not wrap its
  // urlpatterns in `django.conf.urls.i18n.i18n_patterns`, so URLs here are
  // bare — no "/en/" (or other language code) segment.
  await this.page.goto(`${this.launchUrl}/admin/login/?next=/`, {
    waitUntil: 'domcontentloaded',
  });
  await this.page.waitForSelector(SELECTORS.loginUsername, { state: 'visible', timeout: 10000 });
  await this.page.fill(SELECTORS.loginUsername, username);
  await this.page.fill(SELECTORS.loginPassword, password);
  await this.page.locator(`${SELECTORS.loginForm} input[type="submit"]`).click();
  await this.page.waitForLoadState('domcontentloaded');
});

/**
 * Log out of the Django admin / CMS toolbar.
 *
 * django CMS's "Logout <username>" toolbar link submits an AJAX POST
 * (Django's admin logout view rejects a bare GET), so this step opens the
 * toolbar's site-name menu and clicks through it rather than navigating
 * to /admin/logout/ directly.
 *
 * Example: When I log out
 */
When(/^I log out$/, async function () {
  await this.page.waitForSelector(SELECTORS.toolbarNav, { state: 'visible', timeout: 10000 });
  // The toolbar's site-name dropdown opens on click, toggling a
  // "-hover" class via JS — it is not a plain CSS :hover menu.
  const siteMenu = this.page.locator(`${SELECTORS.toolbarNav} > li`).first();
  await siteMenu.click();
  const logoutLink = this.page.locator(`${SELECTORS.toolbarNav} a`).filter({ hasText: /Logout/i });
  await logoutLink.first().click();
  await this.page.waitForLoadState('domcontentloaded');
});

// ---------------------------------------------------------------------------
// CMS toolbar
// ---------------------------------------------------------------------------

/**
 * Assert the django CMS toolbar is visible (logged-in staff users).
 *
 * Example: Then I should see the CMS toolbar
 */
Then(/^I should see the CMS toolbar$/, async function () {
  await this.page.waitForSelector(SELECTORS.toolbarBar, { state: 'visible', timeout: 10000 });
});

/**
 * Assert the django CMS toolbar is NOT visible (anonymous users, or
 * staff who have disabled the toolbar).
 *
 * Example: Then I should not see the CMS toolbar
 */
Then(/^I should not see the CMS toolbar$/, async function () {
  const count = await this.page.locator(SELECTORS.toolbar).count();
  assert.strictEqual(count, 0, 'CMS toolbar should not be visible but it is.');
});

/**
 * Open the toolbar's site-name menu and click a link by its visible text
 * (e.g. the "Pages...", "Users...", "Administration...", "Aliases...", or
 * "User settings..." entries). Matching is substring/case-insensitive and
 * ignores a trailing ellipsis, so "Pages" matches "Pages...".
 *
 * Most of these links carry `data-rel="sideframe"`: django CMS opens them
 * in an in-page iframe overlay (`.cms-sideframe`) rather than navigating
 * the main page — assert on the sideframe with the step below, not with
 * webship-js's generic "I should be on ..." page-URL steps.
 *
 * Example: When I click "Pages" in the CMS toolbar menu
 */
When(/^I click "([^"]*)" in the CMS toolbar menu$/, async function (linkText) {
  await this.page.waitForSelector(SELECTORS.toolbarNav, { state: 'visible', timeout: 10000 });
  // The toolbar's site-name dropdown opens on click, toggling a
  // "-hover" class via JS — it is not a plain CSS :hover menu.
  const siteMenu = this.page.locator(`${SELECTORS.toolbarNav} > li`).first();
  await siteMenu.click();
  const label = linkText.trim();
  const link = this.page
    .locator(`${SELECTORS.toolbarNav} a`)
    .filter({ hasText: new RegExp(`^\\s*${label}\\.*\\s*$`, 'i') });
  await link.first().click();
});

/**
 * Assert the CMS sideframe overlay is open and its iframe is showing a
 * URL containing the given substring.
 *
 * Example: Then the CMS sideframe should be showing "/admin/auth/user/"
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
 * Example: Given I am on the django CMS page tree
 */
Given(/^I am on the django CMS page tree$/, async function () {
  await this.page.goto(`${this.launchUrl}/admin/cms/pagecontent/`, {
    waitUntil: 'domcontentloaded',
  });
  await this.page.waitForLoadState('domcontentloaded');
});

/**
 * Assert the page tree admin has rendered (either populated or the
 * "no pages yet" empty state).
 *
 * Example: Then I should see the page tree
 */
Then(/^I should see the page tree$/, async function () {
  await this.page.waitForSelector(SELECTORS.pageTree, { state: 'visible', timeout: 10000 });
});

/**
 * Assert a page with the given title is listed in the page tree.
 *
 * Example: Then I should see "Home" in the page tree
 */
Then(/^I should see "([^"]*)" in the page tree$/, async function (title) {
  await this.page.waitForSelector(SELECTORS.pageTree, { state: 'visible', timeout: 10000 });
  const entry = this.page.locator('.cms-pagetree-jstree').getByText(title, { exact: false });
  await entry.first().waitFor({ state: 'visible', timeout: 10000 });
});

// ---------------------------------------------------------------------------
// Welcome screen (fresh install, no pages yet)
// ---------------------------------------------------------------------------

/**
 * Assert the django CMS "no pages yet" welcome screen is showing.
 *
 * Example: Then I should see the django CMS welcome screen
 */
Then(/^I should see the django CMS welcome screen$/, async function () {
  await this.page.waitForSelector(SELECTORS.welcomeScreen, { state: 'visible', timeout: 10000 });
});
