'use strict';

/**
 * django-cms-steps / tests/step-definitions/django-cms-admin.steps.js
 *
 * Steps for the Django admin behind a django CMS site: the lists of users
 * and groups (`#result_list`), what an account is and belongs to, what a
 * group may do, and what the administration offers the current user. They
 * read the admin as a user sees it; none of them creates or changes an
 * account. Accounts are configuration, created on the site once and named in
 * cucumber.js.
 */

const { Given, When, Then } = require('@cucumber/cucumber');
const {
  SELECTORS, gotoUrl, explain, adminUrl, budget, settle, escapeRegex, actOrExplain,
} = require('./django-cms-helpers');

const LISTS = {
  users: 'auth/user/',
  groups: 'auth/group/',
  sites: 'sites/site/',
  aliases: 'djangocms_alias/alias/',
  'global page permissions': 'cms/globalpagepermission/',
};
const FLAGS = { staff: '#id_is_staff', 'a superuser': '#id_is_superuser', superuser: '#id_is_superuser', active: '#id_is_active' };
const LIST_HINT = 'Open an admin list first ("I am on the users list"); the user needs the permission to view it.';

const exact = (text) => new RegExp(`^\\s*${escapeRegex(text)}\\s*$`);

/** The row link of an admin list whose text is exactly `name` (the first column links to the change form). */
function listLink(world, name) {
  return world.page.locator(`${SELECTORS.resultList} tbody tr th a, ${SELECTORS.resultList} tbody tr td a`).filter({ hasText: exact(name) });
}

async function listNames(world) {
  return (await world.page.locator(`${SELECTORS.resultList} tbody tr th`).allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
}

/** Open the change form of a user or a group, through the search of its admin list. */
async function openChangeForm(world, list, name) {
  await gotoUrl(world.page, adminUrl(world, `${LISTS[list]}?q=${encodeURIComponent(name)}`));
  await settle(world, 1000);
  const link = listLink(world, name).first();
  if (!(await link.count())) {
    const status = (await world.page.locator(SELECTORS.loginForm).count()) ? 'the site asked to log in' : `the ${list} list shows: ${(await listNames(world)).map((n) => `"${n}"`).join(', ') || '(nothing)'}`;
    throw explain({
      message: `Could not find "${name}" in the ${list} list: ${status}.`,
      hint: `Reading ${list} needs a logged-in user who may view them (a superuser). Accounts and groups are created on the site, not by a feature.`,
    });
  }
  await Promise.all([
    world.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
    link.click(),
  ]);
  await world.page.locator('#content-main form').first().waitFor({ state: 'visible', timeout: budget(world) });
}

/** The chosen options of a Django admin multiple select, with or without its two-box widget. */
async function chosenOptions(world, fieldId) {
  return world.page.evaluate((id) => {
    const chosen = document.querySelector(`#${id}_to`);
    const options = chosen ? [...chosen.options] : [...document.querySelectorAll(`#${id} option`)].filter((o) => o.selected);
    return options.map((o) => o.textContent.replace(/\s+/g, ' ').trim());
  }, fieldId);
}

/**
 * Open an admin list: users, groups, sites, aliases or global page
 * permissions.
 *
 * Example #1: Given I am on the users list
 * Example #2: Given I am on the groups list
 * Example #3: And we are on the users admin list
 * Example #4: When I go to the sites list
 * Example #5: When we go to the global page permissions list
 *
 */
Given(/^(?:(?:I am |we are )*on|(?:I |we )*go to) the (users|groups|sites|aliases|global page permissions) (?:admin )?list$/, async function (list) {
  await gotoUrl(this.page, adminUrl(this, LISTS[list]));
  await settle(this, 1000);
});

/**
 * Assert the admin list on the page has (or does not have) a row named
 * exactly so: a username in the users list, a group name in the groups list.
 *
 * Example #1: Then I should see "editor" in the admin list
 * Example #2: Then I should not see "nobody" in the admin list
 * Example #3: And we should see "Editors" in the admin list
 * Example #4: Then should see "admin" in the admin list
 * Example #5: But we should not see "Publishers" in the admin list
 *
 */
Then(/^(I |we )*should( not)* see "([^"]*)" in the admin list$/, async function (pronounCase, notCase, name) {
  try {
    await this.page.locator(SELECTORS.resultList).first().waitFor({ state: 'visible', timeout: budget(this) });
  } catch {
    if (!notCase || !(await this.page.locator('#changelist, .paginator').count())) throw explain({ message: 'The page shows no admin list.', hint: LIST_HINT });
  }
  const has = (await listLink(this, name).count()) > 0;
  if (Boolean(notCase) === has) {
    throw explain({
      message: notCase ? `Expected the admin list not to have "${name}", but it does.` : `Expected the admin list to have "${name}". It shows: ${(await listNames(this)).map((n) => `"${n}"`).join(', ') || '(nothing)'}.`,
      hint: 'Names match exactly; the list may be filtered or on another page.',
    });
  }
});

/**
 * Open a row of the admin list on the page, by its exact name: the change
 * form of that user or group.
 *
 * Example #1: When I open "editor" in the admin list
 * Example #2: When we open "Editors" in the admin list
 * Example #3: And I open "admin" in the admin list
 * Example #4: When open "example.com" in the admin list
 * Example #5: And we open "editor" in the admin list
 *
 */
When(/^(I |we )*open "([^"]*)" in the admin list$/, async function (pronounCase, name) {
  await actOrExplain('open', `"${name}" in the admin list`, async () => {
    const link = listLink(this, name).first();
    if (!(await link.count())) throw explain({ message: `The admin list has no "${name}". It shows: ${(await listNames(this)).map((n) => `"${n}"`).join(', ') || '(nothing)'}.`, hint: LIST_HINT });
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      link.click(),
    ]);
  }, LIST_HINT);
  await settle(this, 1000);
});

/**
 * Assert an account is (or is not) staff, a superuser or active, as its
 * change form in the admin says. The step opens that form, so the page
 * changes; it needs a logged-in user who may view users.
 *
 * Example #1: Then the user "editor" should be staff
 * Example #2: Then the user "editor" should not be a superuser
 * Example #3: And the user "admin" should be a superuser
 * Example #4: Then the user "editor" should be active
 * Example #5: But the user "former-editor" should not be active
 *
 */
Then(/^the user "([^"]*)" should( not)* be (staff|a superuser|superuser|active)$/, async function (username, notCase, flag) {
  await openChangeForm(this, 'users', username);
  const checked = await this.page.locator(FLAGS[flag]).first().isChecked();
  if (Boolean(notCase) === checked) {
    throw explain({ message: `Expected the user "${username}" ${notCase ? 'not ' : ''}to be ${flag}, but the account ${checked ? 'is' : 'is not'}.`, hint: 'The account is configured on the site (its change form in the admin, or the script that creates it).' });
  }
});

/**
 * Assert an account is (or is not) in a group, as its change form in the
 * admin says. The step opens that form, so the page changes.
 *
 * Example #1: Then the user "editor" should be in the "Editors" group
 * Example #2: Then the user "admin" should not be in the "Editors" group
 * Example #3: And the user "editor" should not be in the "Publishers" group
 * Example #4: Then the user "reviewer" should be in the "Reviewers" group
 * Example #5: But the user "editor" should not be in the "Administrators" group
 *
 */
Then(/^the user "([^"]*)" should( not)* be in the "([^"]*)" group$/, async function (username, notCase, group) {
  await openChangeForm(this, 'users', username);
  const groups = await chosenOptions(this, 'id_groups');
  if (Boolean(notCase) === groups.includes(group)) {
    throw explain({ message: `Expected the user "${username}" ${notCase ? 'not ' : ''}to be in the "${group}" group. The account is in: ${groups.map((g) => `"${g}"`).join(', ') || '(no group)'}.`, hint: 'Group names match exactly.' });
  }
});

/**
 * Assert a group has (or does not have) a permission, as its change form
 * in the admin says. Name the permission as Django does ("Can change page"),
 * or in full with its application and model ("django CMS | page | Can change
 * page"). The step opens that form, so the page changes.
 *
 * Example #1: Then the "Editors" group should have the "Can change page" permission
 * Example #2: Then the "Editors" group should not have the "Can add user" permission
 * Example #3: And the "Editors" group should have the "Can publish page" permission
 * Example #4: Then the "Editors" group should have the "django CMS | page | Can delete page" permission
 * Example #5: But the "Editors" group should not have the "Can change group" permission
 *
 */
Then(/^the "([^"]*)" group should( not)* have the "([^"]*)" permission$/, async function (group, notCase, permission) {
  await openChangeForm(this, 'groups', group);
  const permissions = await chosenOptions(this, 'id_permissions');
  const wanted = permission.replace(/\s+/g, ' ').trim().toLowerCase();
  const has = permissions.some((p) => {
    const full = p.toLowerCase();
    return full === wanted || full.split('|').pop().trim() === wanted;
  });
  if (Boolean(notCase) === has) {
    throw explain({
      message: `Expected the "${group}" group ${notCase ? 'not ' : ''}to have the "${permission}" permission; it has ${permissions.length} permission(s).`,
      hint: 'Write the permission as the group form lists it: "Can change page", or "django CMS | page | Can change page" when two models share a name.',
    });
  }
});

/**
 * Assert the administration index offers (or does not offer) a section to
 * the current user: "Users", "Groups", "Page contents", "Aliases". Django
 * lists the models the user may view or change. The step opens the
 * administration index, so the page changes.
 *
 * Example #1: Then the administration should offer "Page contents"
 * Example #2: Then the administration should not offer "Users"
 * Example #3: And the administration should not offer "Groups"
 * Example #4: Then the administration should offer "Aliases"
 * Example #5: But the administration should not offer "Sites"
 *
 */
Then(/^the administration should( not)* offer "([^"]*)"$/, async function (notCase, section) {
  await gotoUrl(this.page, adminUrl(this, ''));
  await settle(this, 1000);
  if (await this.page.locator(SELECTORS.loginForm).count()) {
    throw explain({ message: 'The administration asked to log in.', hint: 'Log in first with "I am a logged in user with the "<handle>" user".' });
  }
  const sections = (await this.page.locator('#content-main th[scope="row"]').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
  const has = sections.some((s) => s.toLowerCase() === section.trim().toLowerCase());
  if (Boolean(notCase) === has) {
    throw explain({
      message: notCase ? `Expected the administration not to offer "${section}", but it does.` : `Expected the administration to offer "${section}". It offers: ${sections.map((s) => `"${s}"`).join(', ') || '(nothing)'}.`,
      hint: 'The administration index lists the models the permissions of the user cover.',
    });
  }
});
