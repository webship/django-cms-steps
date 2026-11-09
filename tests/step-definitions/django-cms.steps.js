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
 * phrasing in the JSDoc block right above it. The product word is optional
 * in every sentence ("the CMS toolbar", "the page tree", "the welcome
 * screen"), so a feature written for another pack reads here too.
 *
 * Every assertion waits on its locator (the assertion is the wait), and
 * every failure is a friendly error with a hint instead of a raw Playwright
 * timeout stack.
 */

const { Given, When, Then } = require('@cucumber/cucumber');
const { gotoUrl, smartSettle, friendly } = require('webship-js/tests/step-definitions/webship');

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
  welcomePart: '.cms-welcome-heading, .cms-welcome-section, #cms-welcome-config',
};

const TOOLBAR_HINT = 'The CMS toolbar (`#cms-top`) only renders for a logged-in staff user on a page served through the CMS; log in first and check the toolbar markup.';

function siteRoot(launchUrl) {
  return String(launchUrl).replace(/\/$/, '');
}

/** The per-assertion wait budget: `minWaitTime.page` from cucumber.js, else 10 s. */
function budget(world) {
  return Math.max((world.minWaitTime && world.minWaitTime.page) || 0, 10000);
}

async function settle(world, fallback) {
  await smartSettle(world.page, (world.minWaitTime && world.minWaitTime.page) || fallback || 3000);
}

/**
 * Run a locator action and rethrow as a friendly error (action, target,
 * cause and a hint) instead of Playwright's raw timeout stack.
 */
async function actOrExplain(label, target, fn, hint) {
  try {
    return await fn();
  } catch (err) {
    throw friendly({ action: label, target, cause: err, hint });
  }
}

/**
 * Wait until `locator` has (or, with `notCase`, has no) match in the given
 * state, then throw a friendly error otherwise: the wait and the assertion
 * are one call.
 */
async function assertPresence(locator, notCase, { label, hint, timeout, state = 'visible' }) {
  try {
    await locator.first().waitFor({ state: notCase ? (state === 'attached' ? 'detached' : 'hidden') : state, timeout });
  } catch {
    throw friendly({
      message: notCase ? `Expected not to see ${label}, but it is still on the page.` : `Expected ${label}, but it did not appear within ${timeout} ms.`,
      hint,
    });
  }
}

/**
 * Look up a named user from cucumber.js worldParameters.users
 * (`{ <key>: { username, password } }`), throwing a friendly error with a
 * hint if it is not configured.
 */
function resolveUser(parameters, userKey) {
  const users = (parameters && parameters.users) || {};
  const entry = users[userKey];
  if (!entry) {
    throw friendly({
      message: `User "${userKey}" is not configured. Known users: ${Object.keys(users).join(', ') || '(none)'}.`,
      hint: `Add it to worldParameters.users in cucumber.js: users: { ${userKey}: { username: '...', password: process.env.DJANGOCMS_ADMIN_PASSWORD } }.`,
    });
  }
  const username = entry.username || userKey;
  const password = typeof entry === 'string' ? entry : entry.password;
  if (!password) {
    throw friendly({
      message: `User "${userKey}" has no password configured.`,
      hint: `Set worldParameters.users.${userKey}.password in cucumber.js, ideally from an environment variable such as DJANGOCMS_ADMIN_PASSWORD.`,
    });
  }
  return { username, password };
}

/**
 * Open the toolbar's site-name dropdown. It opens on click, toggling a
 * "-hover" class via JS; it is not a plain CSS :hover menu.
 */
async function openToolbarSiteMenu(world) {
  const nav = world.page.locator(SELECTORS.toolbarNav);
  const siteMenu = world.page.locator(`${SELECTORS.toolbarNav} > li`).first();
  await actOrExplain('open', 'the CMS toolbar site menu', async () => {
    await nav.waitFor({ state: 'visible', timeout: budget(world) });
    await siteMenu.click();
  }, TOOLBAR_HINT);
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
 * Example #1: Given I am a logged in user with the "admin" user
 * Example #2: Given we are a logged in user with the username "admin"
 * Example #3: Given I am a logged in user with "admin"
 * Example #4: And a logged in user with username "admin"
 * Example #5: Given I am a logged in user with the username "admin" user
 *
 */
Given(/^(I am |we are )*a logged in user with( the)*( username)* "([^"]*)?"( user)*$/, async function (pronounCase, theCase, usernameCase, userKey, userCase) {
  const { username, password } = resolveUser(this.parameters, userKey);
  const page = this.page;
  const timeout = budget(this);
  await gotoUrl(page, `${siteRoot(this.launchUrl)}/admin/login/?next=/`);
  await actOrExplain('log in as', username, async () => {
    await page.locator(SELECTORS.loginUsername).waitFor({ state: 'visible', timeout });
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
  }, 'The Django admin login form (`#login-form` with `#id_username` / `#id_password`) must be served at /admin/login/ under `launchUrl`.');
  await settle(this);
  // The login has two outcomes: the front end (no login form) or the form
  // again with Django's `.errornote`. Wait for whichever comes first.
  const errorNote = page.locator(`${SELECTORS.loginForm} .errornote`);
  await Promise.race([
    page.locator(SELECTORS.loginForm).waitFor({ state: 'detached', timeout }),
    errorNote.waitFor({ state: 'visible', timeout }),
  ]).catch(() => {});
  if (await errorNote.isVisible()) {
    throw friendly({
      message: `Login as "${username}" was rejected: ${(await errorNote.innerText()).trim()}`,
      hint: `Check worldParameters.users.${userKey} against the site's admin account (DJANGOCMS_ADMIN_USER / DJANGOCMS_ADMIN_PASSWORD).`,
    });
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
  await assertPresence(this.page.locator(SELECTORS.loginForm), null, {
    label: 'the Django admin login form (`#login-form`)',
    hint: 'Check that `launchUrl` points at the site root (the step opens /admin/login/ under it).',
    timeout: budget(this),
  });
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
 * Example #4: When log out
 * Example #5: And we log out
 *
 */
When(/^(I |we )*log out$/, async function (pronounCase) {
  await openToolbarSiteMenu(this);
  const logoutLink = this.page.locator(`${SELECTORS.toolbarNav} a`).filter({ hasText: /Logout/i }).first();
  await actOrExplain('click', 'the toolbar "Logout" link', async () => {
    await logoutLink.waitFor({ state: 'visible', timeout: budget(this) });
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
      logoutLink.click(),
    ]);
  }, 'The "Logout <username>" entry lives in the toolbar site-name menu; you must be logged in first.');
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
 * Example #3: And we should see the django CMS toolbar
 * Example #4: But we should not see the CMS toolbar
 * Example #5: Then should see the toolbar
 *
 */
Then(/^(I |we )*should( not)* see the (?:(?:django )?CMS )?toolbar$/, async function (pronounCase, notCase) {
  if (notCase) {
    // The toolbar is never rendered for an anonymous visitor, so the
    // negative case waits for the element to be gone from the DOM.
    await assertPresence(this.page.locator(SELECTORS.toolbar), notCase, {
      label: 'the CMS toolbar',
      hint: 'The toolbar is still in the DOM: the session was not cleared, or the logout did not complete.',
      timeout: budget(this),
      state: 'attached',
    });
    return;
  }
  await assertPresence(this.page.locator(SELECTORS.toolbarBar), null, {
    label: 'the CMS toolbar',
    hint: TOOLBAR_HINT,
    timeout: budget(this),
  });
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
 * Example #3: And we click "Administration" in the django CMS toolbar menu
 * Example #4: When I click "User settings" in the toolbar menu
 * Example #5: And click "Aliases" in the CMS toolbar menu
 *
 */
When(/^(I |we )*click "([^"]*)" in the (?:(?:django )?CMS )?toolbar menu$/, async function (pronounCase, linkText) {
  await openToolbarSiteMenu(this);
  const label = linkText.trim().replace(/[.…]+$/, '');
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const link = this.page
    .locator(`${SELECTORS.toolbarNav} a`)
    .filter({ hasText: new RegExp(`^\\s*${escaped}(?:\\.\\.\\.|…)?\\s*$`, 'i') })
    .first();
  await actOrExplain('click', `"${linkText}" in the CMS toolbar menu`, async () => {
    await link.waitFor({ state: 'visible', timeout: budget(this) });
    await link.click();
  }, 'The label must match a toolbar site-menu entry (e.g. "Pages", "Users", "Administration"); a trailing "..." is optional.');
  await settle(this, 1000);
});

/**
 * Assert the CMS sideframe overlay is (or is not) open with its iframe
 * showing a URL containing the given substring.
 *
 * Example #1: Then the CMS sideframe should be showing "/admin/cms/pagecontent/"
 * Example #2: Then the CMS sideframe should be showing "/admin/auth/user/"
 * Example #3: And the django CMS sideframe should be showing "/admin/"
 * Example #4: Then the sideframe should not be showing "/admin/auth/user/"
 * Example #5: And the CMS sideframe should not be showing "/admin/cms/pagecontent/"
 *
 */
Then(/^the (?:(?:django )?CMS )?sideframe should( not)* be showing "([^"]*)"$/, async function (notCase, urlSubstring) {
  const frames = this.page.locator('.cms-sideframe-frame iframe');
  const matching = frames.and(this.page.locator(`[src*="${urlSubstring.replace(/["\\]/g, '\\$&')}"]`));
  const timeout = budget(this);
  try {
    await matching.first().waitFor({ state: notCase ? 'detached' : 'attached', timeout });
  } catch {
    const src = await frames.first().getAttribute('src').catch(() => null);
    throw friendly({
      message: notCase
        ? `Expected the CMS sideframe not to be showing a URL containing "${urlSubstring}", but it is ("${src}").`
        : `Expected the CMS sideframe to be showing a URL containing "${urlSubstring}", but it ${src ? `is showing "${src}"` : 'is not open'}.`,
      hint: 'Toolbar entries with data-rel="sideframe" open in the `.cms-sideframe` overlay; click one with "click \\"...\\" in the CMS toolbar menu" first.',
    });
  }
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
 * Example #4: Given I am on the CMS page tree
 * Example #5: Given I am on the page tree
 *
 */
Given(/^(I am |we are )*on the (?:(?:django )?CMS )?page tree$/, async function (pronounCase) {
  await gotoUrl(this.page, `${siteRoot(this.launchUrl)}/admin/cms/pagecontent/`);
  await settle(this);
});

/**
 * Assert the page tree admin has (or has not) rendered (either populated
 * or the "no pages yet" empty state).
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
    hint: 'The page tree is the change list at /admin/cms/pagecontent/ and needs a logged-in staff user; open it with "I am on the page tree".',
    timeout: budget(this),
  });
});

/**
 * Assert a page with the given title is (or is not) listed in the page tree.
 *
 * Example #1: Then I should see "Home" in the page tree
 * Example #2: Then we should see "About" in the page tree
 * Example #3: And should see "Contact" in the page tree
 * Example #4: Then I should not see "Draft" in the page tree
 * Example #5: And we should see "Home" in the CMS page tree
 *
 */
Then(/^(I |we )*should( not)* see "([^"]*)" in the (?:(?:django )?CMS )?page tree$/, async function (pronounCase, notCase, title) {
  await assertPresence(this.page.locator(SELECTORS.pageTree), null, {
    label: 'the page tree (`.cms-pagetree`)',
    hint: 'Open the page tree first with "I am on the page tree".',
    timeout: budget(this),
  });
  await assertPresence(this.page.locator('.cms-pagetree-jstree').getByText(title, { exact: false }), notCase, {
    label: `a page titled "${title}" in the page tree`,
    hint: 'Page titles come from the pages the site really has; create the page first or check the spelling.',
    timeout: budget(this),
  });
});

// ---------------------------------------------------------------------------
// Welcome screen (fresh install, no pages yet)
// ---------------------------------------------------------------------------

/**
 * Assert the django CMS "no pages yet" welcome screen is (or is not)
 * showing. django CMS renders it for the site root while the site has no
 * pages at all, for a signed-in user: its script sends an anonymous visitor
 * to the login form, so log in first.
 *
 * Example #1: Then I should see the django CMS welcome screen
 * Example #2: Then we should see the django CMS welcome screen
 * Example #3: And should see the CMS welcome screen
 * Example #4: Then I should see the welcome screen
 * Example #5: Then I should not see the welcome screen
 *
 */
Then(/^(I |we )*should( not)* see the (?:(?:django )?CMS )?welcome screen$/, async function (pronounCase, notCase) {
  // The welcome wrapper itself can report no box of its own (its parts are positioned), so the
  // assertion is on a part a visitor reads: the heading or a section.
  await assertPresence(this.page.locator(SELECTORS.welcomePart), notCase, {
    label: 'the "no pages yet" welcome screen',
    hint: notCase
      ? 'The welcome screen shows while the site has no pages at all; create a page to replace it.'
      : 'The welcome screen only renders on the site root of a site with no pages, for a signed-in user; log in first.',
    timeout: budget(this),
  });
});
