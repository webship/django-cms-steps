'use strict';

/**
 * django-cms-steps / tests/step-definitions/django-cms-session.steps.js
 *
 * Session steps for a django CMS site: log in as an account from the users
 * registry, log in with given credentials, log out, and assert who may open
 * what. django CMS has no login form of its own: staff log in through the
 * Django admin login form (`/admin/login/`, `#login-form`, `#id_username`,
 * `#id_password`), and a site that uses language prefixes redirects that
 * path to `/<language>/admin/login/`.
 *
 * Accounts are configuration. Create them on the site once (`manage.py
 * createsuperuser`, a fixture, a provisioning script) and name them in
 * cucumber.js under worldParameters.users; no step here creates a user.
 */

const { Given, When, Then } = require('@cucumber/cucumber');
const {
  SELECTORS, gotoUrl, explain, adminUrl, budget, settle, actOrExplain, assertPresence, resolveUser, openToolbarMenu,
} = require('./django-cms-helpers');

const LOGIN_HINT = 'The Django admin login form (`#login-form` with `#id_username` and `#id_password`) must be served at /admin/login/ under `launchUrl`.';

/** Fill the admin login form and submit it; the caller checks the outcome. */
async function submitLogin(world, username, password, next) {
  const page = world.page;
  await gotoUrl(page, adminUrl(world, `login/?next=${encodeURIComponent(next)}`));
  await actOrExplain('log in as', username, async () => {
    await page.locator(SELECTORS.loginUsername).waitFor({ state: 'visible', timeout: budget(world) });
    await page.fill(SELECTORS.loginUsername, username);
    await page.fill(SELECTORS.loginPassword, password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
      page.locator(`${SELECTORS.loginForm} input[type="submit"], ${SELECTORS.loginForm} button[type="submit"]`).first().click(),
    ]);
  }, LOGIN_HINT);
  await settle(world);
}

/** True when the session belongs to a staff user: the admin index answers 200 instead of redirecting to the login form. */
async function isStaffSession(world) {
  const response = await world.page.request.get(adminUrl(world, ''), { maxRedirects: 5 });
  return response.ok() && !/\/login\//.test(response.url());
}

/**
 * Log in through the Django admin login form as an account from the users
 * registry in cucumber.js (worldParameters.users: `{ <handle>: { username,
 * password } }`), so no credential lives in a feature file. The step lands on
 * the front page, where the CMS toolbar shows, and fails with the form's own
 * message when the site rejects the credentials.
 *
 * Example #1: Given I am a logged in user with the "admin" user
 * Example #2: Given we are a logged in user with the username "editor"
 * Example #3: Given I am a logged in user with "admin"
 * Example #4: And a logged in user with username "editor"
 * Example #5: Given I am a logged in user with the username "admin" user
 *
 */
Given(/^(I am |we are )*a logged in user with( the)*( username)* "([^"]*)?"( user)*$/, async function (pronounCase, theCase, usernameCase, handle, userCase) {
  const { username, password } = resolveUser(this.parameters, handle);
  await submitLogin(this, username, password, '/');
  const errorNote = this.page.locator(SELECTORS.loginError).first();
  if (await errorNote.isVisible().catch(() => false)) {
    throw explain({
      message: `Login as "${username}" was rejected: ${(await errorNote.innerText()).trim()}`,
      hint: `Check worldParameters.users.${handle} in cucumber.js against the account on the site.`,
    });
  }
});

/**
 * Fill the admin login form with a username and a password and submit it,
 * without asserting the outcome: use it to test the form itself (a wrong
 * password, an inactive account). To log in for a scenario, use the registry
 * step above.
 *
 * Example #1: When I log in as "admin" with password "wrong-password"
 * Example #2: When we log in as "editor" with password "not-the-password"
 * Example #3: And I sign in as "nobody" with password "secret"
 * Example #4: When log in as "admin" with the password "wrong-password"
 * Example #5: And we sign in as "editor" with the password "editor"
 *
 */
When(/^(I |we )*(?:log in|sign in) as "([^"]*)" with (?:the )?password "([^"]*)"$/, async function (pronounCase, username, password) {
  await submitLogin(this, username, password, '/');
});

/**
 * Assert the admin login form shows (or does not show) its error note
 * (`.errornote`), optionally with a text it must contain.
 *
 * Example #1: Then I should see a login error
 * Example #2: Then I should not see a login error
 * Example #3: And we should see a login error "Please enter the correct username and password"
 * Example #4: Then should see the login error "staff account"
 * Example #5: But I should not see a login error "inactive"
 *
 */
Then(/^(I |we )*should( not)* see (?:a|the) login error(?: "([^"]*)")?$/, async function (pronounCase, notCase, text) {
  let note = this.page.locator(SELECTORS.loginError);
  if (text) note = note.filter({ hasText: text });
  await assertPresence(note, notCase, {
    label: text ? `a login error containing "${text}"` : 'a login error',
    hint: 'Django shows `.errornote` above the login form when it rejects the username and password.',
    timeout: notCase ? 2000 : budget(this),
  });
});

/**
 * Open the Django admin login page.
 *
 * Example #1: Given I am on the login page
 * Example #2: Given we are on the login page
 * Example #3: And on the admin login page
 * Example #4: When I go to the login page
 * Example #5: When we go to the admin login page
 *
 */
Given(/^(?:(?:I am |we are )*on|(?:I |we )*go to) the (?:admin )?login page$/, async function () {
  await gotoUrl(this.page, adminUrl(this, 'login/'));
  await settle(this, 1000);
});

/**
 * Assert the Django admin login form (`#login-form`) is (or is not) on the
 * page. An anonymous visitor who opens an admin page is sent to it.
 *
 * Example #1: Then I should see the login form
 * Example #2: Then I should not see the login form
 * Example #3: And we should see the admin login form
 * Example #4: Then should see the login form
 * Example #5: But we should not see the admin login form
 *
 */
Then(/^(I |we )*should( not)* see the (?:admin )?login form$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator(SELECTORS.loginForm), notCase, {
    label: 'the admin login form (`#login-form`)',
    hint: notCase ? 'The login form shows while nobody is logged in; log in first.' : LOGIN_HINT,
    timeout: notCase ? 2000 : budget(this),
  });
});

/**
 * Make sure nobody is logged in: clear the browser's cookies and web
 * storage, open the admin login page and assert its form shows.
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
  await gotoUrl(this.page, adminUrl(this, 'login/'));
  await assertPresence(this.page.locator(SELECTORS.loginForm), null, {
    label: 'the admin login form (`#login-form`)',
    hint: 'Check that `launchUrl` points at the site root (the step opens /admin/login/ under it).',
    timeout: budget(this),
  });
  await settle(this, 1000);
});

/**
 * Log out. On a CMS page the step uses the toolbar's "Logout <username>"
 * entry (an AJAX POST: Django's logout view rejects a GET); on a Django admin
 * page, which has no CMS toolbar, it submits the admin's own logout form
 * (`#logout-form`).
 *
 * Example #1: When I log out
 * Example #2: When we log out
 * Example #3: And I sign out
 * Example #4: When log out
 * Example #5: And we logout
 *
 */
When(/^(I |we )*(?:log ?out|sign out)$/, async function (pronounCase) {
  const page = this.page;
  const adminLogout = page.locator('#logout-form button, #logout-form [type="submit"]').first();
  if (!(await page.locator(SELECTORS.toolbarBar).count()) && await adminLogout.count()) {
    await actOrExplain('submit', 'the admin logout form', async () => {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
        adminLogout.click(),
      ]);
    }, 'The Django admin shows "Log out" in its header (`#logout-form`) for a logged-in user.');
    await settle(this);
    return;
  }
  const menu = await openToolbarMenu(this, 'site');
  const logoutLink = menu.locator(':scope > ul > li > a[href*="/logout/"]').first();
  await actOrExplain('click', 'the toolbar "Logout" entry', async () => {
    await logoutLink.waitFor({ state: 'visible', timeout: budget(this) });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
      logoutLink.click(),
    ]);
  }, 'The "Logout <username>" entry is the last one of the toolbar\'s site menu; log in first.');
  await settle(this);
});

/**
 * Assert somebody is (or nobody is) logged in as a staff user: the admin
 * index answers the session instead of sending it to the login form. The
 * page in the browser does not change.
 *
 * Example #1: Then I should be logged in
 * Example #2: Then I should not be logged in
 * Example #3: And we should be logged in
 * Example #4: Then should not be signed in
 * Example #5: But we should not be logged in
 *
 */
Then(/^(I |we )*should( not)* be (?:logged in|signed in)$/, async function (pronounCase, notCase) {
  const staff = await isStaffSession(this);
  if (notCase && staff) {
    throw explain({ message: 'Expected nobody to be logged in, but the admin index answers this session.', hint: 'Log out first, or start with "I am not logged in".' });
  }
  if (!notCase && !staff) {
    throw explain({ message: 'Expected a logged-in staff user, but the admin index sends this session to the login form.', hint: 'Log in first with "I am a logged in user with the "<handle>" user"; the account needs the staff status.' });
  }
});

/**
 * Assert the current user may (or may not) open a path. "Allowed" is a 200
 * answer; "denied" is a 403, or a redirect to the login form for a visitor
 * who is not logged in. The step opens the path, so the page changes.
 *
 * Example #1: Then I should be allowed to open "/admin/cms/pagecontent/"
 * Example #2: Then I should not be allowed to open "/admin/auth/user/"
 * Example #3: And we should not be allowed to open "/admin/auth/group/"
 * Example #4: Then should be allowed to open "/admin/"
 * Example #5: But I should not be allowed to open "/admin/sites/site/"
 *
 */
Then(/^(I |we )*should( not)* be allowed to open "([^"]*)"$/, async function (pronounCase, notCase, path) {
  const url = /^https?:\/\//.test(path) ? path : `${String(this.launchUrl).replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  let response = null;
  try {
    response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  } catch (err) {
    throw explain({ action: 'open', target: path, cause: err, hint: 'Check `launchUrl` and that the site is running.' });
  }
  const status = response ? response.status() : 0;
  const atLogin = (await this.page.locator(SELECTORS.loginForm).count()) > 0;
  const allowed = status >= 200 && status < 300 && !atLogin;
  if (notCase && allowed) {
    throw explain({ message: `Expected "${path}" to be refused, but it answered ${status}.`, hint: 'Django refuses an admin page with 403 when the user lacks the permission, and sends an anonymous visitor to the login form.' });
  }
  if (!notCase && !allowed) {
    throw explain({
      message: `Expected "${path}" to open, but ${atLogin ? 'the site asked to log in' : `it answered ${status}`}.`,
      hint: 'Log in with an account that has the permission, or check the path.',
    });
  }
});
