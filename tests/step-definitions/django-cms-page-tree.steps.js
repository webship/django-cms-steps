'use strict';

/**
 * django-cms-steps / tests/step-definitions/django-cms-page-tree.steps.js
 *
 * Steps for the page tree, the admin list of pages at
 * /admin/cms/pagecontent/ (`.cms-pagetree`, a jsTree grid): find a page by
 * its title, read its state, open it or its settings, publish, unpublish,
 * move and delete it. Titles match exactly, in the language the tree shows,
 * and the steps open collapsed branches to find a page.
 *
 * The steps work on the page tree as a full page. Open it with "I am on the
 * page tree"; a step that names a page opens the tree itself when the page
 * in the browser shows none. The copy of the tree in the CMS sideframe is for
 * the sideframe steps.
 */

const { Given, When, Then } = require('@cucumber/cucumber');
const {
  SELECTORS, gotoUrl, explain, adminUrl, budget, settle, labelRegex, actOrExplain, assertPresence,
  requirePageTree, pageTreeRows, findPageTreeRow, requirePageTreeRow, pageTreeCells,
} = require('./django-cms-helpers');

const STATES = {
  published: 'published', draft: 'draft', 'a draft': 'draft', unpublished: 'unpublished', archived: 'archived', changed: 'dirty', empty: 'empty',
};
const TREE_HINT = 'Open the page tree first ("I am on the page tree"); it needs a staff user who may change pages.';

/** The state the tree shows for a page ("published", "draft", "unpublished", "archived", "dirty", "empty"). */
async function rowState(world, row) {
  return pageTreeCells(world, row).locator('.cms-pagetree-node-state').first().evaluate((el) => {
    const match = el.className.match(/cms-pagetree-node-state-([a-z]+)/);
    return match ? match[1] : null;
  }).catch(() => null);
}

/** Open the "Options" menu of a page tree row; its entries load on first use. */
async function openRowOptions(world, row) {
  const cell = pageTreeCells(world, row).locator('.js-cms-pagetree-actions-dropdown').first();
  if (!(await cell.evaluate((el) => el.classList.contains('cms-pagetree-dropdown-menu-open')))) {
    await cell.locator('.js-cms-pagetree-dropdown-trigger').first().click();
  }
  await cell.locator('.js-cms-tree-item-cut, a[href*="/delete/"]').first().waitFor({ state: 'visible', timeout: budget(world) });
  return cell;
}

/** Wait for the tree to finish a reload after a change. */
async function treeSettled(world) {
  await settle(world, 1000);
  await requirePageTree(world);
}

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

/**
 * Assert the state the page tree shows for a page, in the language the
 * tree shows: "published", "a draft" (never published, or a new draft with
 * no published version), "unpublished", "archived", "changed" (published,
 * with a newer draft) or "empty" (no content in this language).
 *
 * Example #1: Then the page "About" should be published in the page tree
 * Example #2: Then the page "Draft notes" should be a draft in the page tree
 * Example #3: And the page "Draft notes" should not be published in the page tree
 * Example #4: Then the page "Old news" should be unpublished in the page tree
 * Example #5: And the page "Home" should be changed in the CMS page tree
 *
 */
Then(/^the page "([^"]*)" should( not)* be (published|a draft|draft|unpublished|archived|changed|empty) in the (?:(?:django )?CMS )?page tree$/, async function (title, notCase, stateWord) {
  const row = await requirePageTreeRow(this, title);
  const wanted = STATES[stateWord];
  const actual = await rowState(this, row);
  if (Boolean(notCase) === (actual === wanted)) {
    const readable = Object.keys(STATES).find((word) => STATES[word] === actual) || actual || 'unknown';
    throw explain({
      message: `Expected the page "${title}" ${notCase ? 'not ' : ''}to be ${stateWord} in the page tree, but it is ${readable}.`,
      hint: 'The page tree shows the state of the page in one language; its legend explains the colours.',
    });
  }
});

/**
 * Assert a page is (or is not) a sub page of another page in the page
 * tree.
 *
 * Example #1: Then the page "Team" should be a sub page of "About" in the page tree
 * Example #2: Then the page "Team" should not be a sub page of "Contact" in the page tree
 * Example #3: And the page "Board" should be a sub page of "Team" in the page tree
 * Example #4: Then the page "Contact" should not be a sub page of "About" in the CMS page tree
 * Example #5: But the page "Home" should not be a sub page of "About" in the page tree
 *
 */
Then(/^the page "([^"]*)" should( not)* be a sub ?page of "([^"]*)" in the (?:(?:django )?CMS )?page tree$/, async function (title, notCase, parent) {
  const row = await requirePageTreeRow(this, title);
  if (Boolean(notCase) === (row.parent === parent)) {
    throw explain({
      message: `Expected the page "${title}" ${notCase ? 'not ' : ''}to be a sub page of "${parent}", but it is ${row.parent ? `a sub page of "${row.parent}"` : 'at the top level'}.`,
      hint: 'Move a page with "I move the page "<title>" under the page "<parent>" in the page tree".',
    });
  }
});

/**
 * Assert a page is (or is not) the home page of the site, as the page tree
 * marks it.
 *
 * Example #1: Then the page "Home" should be the home page in the page tree
 * Example #2: Then the page "About" should not be the home page in the page tree
 * Example #3: And the page "Start" should be the home page in the CMS page tree
 * Example #4: Then the page "Contact" should not be the home page in the page tree
 * Example #5: But the page "Team" should not be the home page in the page tree
 *
 */
Then(/^the page "([^"]*)" should( not)* be the home ?page in the (?:(?:django )?CMS )?page tree$/, async function (title, notCase) {
  const row = await requirePageTreeRow(this, title);
  if (Boolean(notCase) === row.home) {
    const home = (await pageTreeRows(this)).find((r) => r.home);
    throw explain({ message: `Expected the page "${title}" ${notCase ? 'not ' : ''}to be the home page; the home page is ${home ? `"${home.title}"` : 'not set'}.`, hint: 'The home page is set with "Set as home" in the options of a page.' });
  }
});

/**
 * Open a page from the page tree, with the "view" link of its row. A draft
 * opens in edit mode; this is the way to reach a draft that was never
 * published, which has no public URL.
 *
 * Example #1: When I open the page "Draft notes" from the page tree
 * Example #2: When we open the page "About" from the page tree
 * Example #3: And I open the page "Team" from the page tree
 * Example #4: When open the page "Contact" from the CMS page tree
 * Example #5: And we open the page "Home" from the page tree
 *
 */
When(/^(I |we )*open the page "([^"]*)" from the (?:(?:django )?CMS )?page tree$/, async function (pronounCase, title) {
  const row = await requirePageTreeRow(this, title);
  await actOrExplain('open', `the page "${title}" from the page tree`, async () => {
    const link = pageTreeCells(this, row).locator('a.js-cms-pagetree-page-view').first();
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      link.click(),
    ]);
  }, TREE_HINT);
  await settle(this);
});

/**
 * Open the settings form of a page from the page tree: its title, slug,
 * menu title and meta description; "advanced settings" opens the form with
 * the template, the redirect and the application. The form is a Django admin
 * form: fill it and save it with the webship-js form steps.
 *
 * Example #1: When I open the settings of the page "About" in the page tree
 * Example #2: When I open the advanced settings of the page "About" in the page tree
 * Example #3: And we open the settings of the page "Contact" in the page tree
 * Example #4: When open the settings of the page "Team" in the CMS page tree
 * Example #5: And we open the advanced settings of the page "Home" in the page tree
 *
 */
When(/^(I |we )*open the (advanced )?settings of the page "([^"]*)" in the (?:(?:django )?CMS )?page tree$/, async function (pronounCase, advanced, title) {
  const row = await requirePageTreeRow(this, title);
  await actOrExplain('open', `the settings of the page "${title}"`, async () => {
    const link = pageTreeCells(this, row).locator('a.js-cms-tree-advanced-settings').first();
    const target = await link.getAttribute(advanced ? 'data-url' : 'href');
    await gotoUrl(this.page, new URL(target, this.page.url()).toString());
    await this.page.locator('#content-main form').first().waitFor({ state: 'visible', timeout: budget(this) });
  }, TREE_HINT);
  await settle(this, 1000);
});

/**
 * Publish or unpublish a page from the page tree, with the menu of its
 * state indicator (djangocms-versioning). "Publish" needs a draft;
 * "Unpublish" needs a published version and asks for a confirmation, which
 * the step gives.
 *
 * Example #1: When I publish the page "Draft notes" in the page tree
 * Example #2: When I unpublish the page "Contact" in the page tree
 * Example #3: And we publish the page "News" in the page tree
 * Example #4: When unpublish the page "Team" in the CMS page tree
 * Example #5: And we unpublish the page "Old news" in the page tree
 *
 */
When(/^(I |we )*(publish|unpublish) the page "([^"]*)" in the (?:(?:django )?CMS )?page tree$/, async function (pronounCase, action, title) {
  const row = await requirePageTreeRow(this, title);
  const page = this.page;
  await actOrExplain(action, `the page "${title}" in the page tree`, async () => {
    const cell = pageTreeCells(this, row).locator('.cms-tree-item-lang').first();
    await cell.locator('.js-cms-pagetree-dropdown-trigger').first().click();
    const entry = cell.locator('.cms-pagetree-dropdown-menu a').filter({ hasText: labelRegex(action) }).first();
    try {
      await entry.waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      const entries = (await cell.locator('.cms-pagetree-dropdown-menu a').allTextContents()).map((e) => `"${e.replace(/\s+/g, ' ').trim()}"`);
      throw explain({ message: `The page "${title}" cannot be ${action}ed: its state menu offers ${entries.join(', ') || 'nothing'}.`, hint: '"Publish" needs a draft; "Unpublish" needs a published version; both need a user who may publish.' });
    }
    await entry.click();
    // "Unpublish" asks on a confirmation page; "Publish" acts at once.
    const confirm = page.locator('input.confirm-link, form[action=""] input[type="submit"].default').first();
    const confirmed = await confirm.waitFor({ state: 'visible', timeout: 4000 }).then(() => true).catch(() => false);
    if (confirmed) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
        confirm.click(),
      ]);
    }
  }, TREE_HINT);
  await settle(this);
  if (!(await page.locator(SELECTORS.pageTree).count())) {
    await gotoUrl(page, adminUrl(this, 'cms/pagecontent/'));
  }
  await treeSettled(this);
});

/**
 * Delete a page from the page tree: "Delete" in the options of its row,
 * then "Yes, I'm sure" on the confirmation page. Its sub pages are deleted
 * with it.
 *
 * Example #1: When I delete the page "News" in the page tree
 * Example #2: When we delete the page "Old news" in the page tree
 * Example #3: And I delete the page "Events" from the page tree
 * Example #4: When delete the page "Press" in the CMS page tree
 * Example #5: And we delete the page "Board" from the page tree
 *
 */
When(/^(I |we )*delete the page "([^"]*)" (?:in|from) the (?:(?:django )?CMS )?page tree$/, async function (pronounCase, title) {
  const row = await requirePageTreeRow(this, title);
  const page = this.page;
  await actOrExplain('delete', `the page "${title}" in the page tree`, async () => {
    const options = await openRowOptions(this, row);
    const entry = options.locator('a[href*="/delete/"]').first();
    if (!(await entry.count())) throw explain({ message: `The options of the page "${title}" offer no "Delete".`, hint: 'The user needs the permission to delete pages.' });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
      entry.click(),
    ]);
    const confirm = page.locator('#content form input[type="submit"]').first();
    await confirm.waitFor({ state: 'visible', timeout: budget(this) });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
      confirm.click(),
    ]);
  }, TREE_HINT);
  await settle(this);
  if (!(await page.locator(SELECTORS.pageTree).count())) {
    await gotoUrl(page, adminUrl(this, 'cms/pagecontent/'));
  }
  await treeSettled(this);
});

/**
 * Move a page in the page tree with "Cut" and "Paste" from the options of
 * the rows: under another page (as its last sub page), or to the top level.
 *
 * Example #1: When I move the page "Team" under the page "Contact" in the page tree
 * Example #2: When I move the page "Team" to the top level of the page tree
 * Example #3: And we move the page "Board" under the page "About" in the page tree
 * Example #4: When move the page "News" under the page "Home" in the CMS page tree
 * Example #5: And we move the page "Board" to the top level of the page tree
 *
 */
When(/^(I |we )*move the page "([^"]*)" (?:under the page "([^"]*)" in|to the (top) level of) the (?:(?:django )?CMS )?page tree$/, async function (pronounCase, title, parent, top) {
  const row = await requirePageTreeRow(this, title);
  const page = this.page;
  await actOrExplain('move', `the page "${title}"`, async () => {
    const options = await openRowOptions(this, row);
    await options.locator('.js-cms-tree-item-cut a').first().click();
    let paste;
    if (top) {
      const root = page.locator('.cms-pagetree-section-nav .js-cms-pagetree-dropdown').first();
      await root.locator('.js-cms-pagetree-dropdown-trigger').first().click();
      paste = root.locator('a.js-cms-tree-item-paste').first();
    } else {
      const target = await requirePageTreeRow(this, parent);
      const targetOptions = await openRowOptions(this, target);
      paste = targetOptions.locator('a.js-cms-tree-item-paste').first();
    }
    await paste.waitFor({ state: 'visible', timeout: budget(this) });
    if (await paste.evaluate((a) => a.classList.contains('cms-pagetree-dropdown-item-disabled'))) {
      throw explain({ message: `The page "${title}" cannot be pasted there.`, hint: 'A page cannot be moved under itself or its own sub pages, and the user needs the permission to move pages.' });
    }
    await paste.click();
  }, TREE_HINT);
  await treeSettled(this);
});
