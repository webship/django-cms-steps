'use strict';

/**
 * django-cms-steps / tests/step-definitions/django-cms-toolbar.steps.js
 *
 * Steps for the django CMS toolbar (`#cms-top`): the bar itself, its menus
 * (the site menu, "Page", "Version", "Language", "Help"), its buttons
 * ("Create", "Edit", "New Draft", "Preview", "Publish"), the messages it
 * shows, and the two overlays it opens: the modal and the sideframe. Both
 * overlays load their content in an iframe (`.cms-modal-frame iframe`,
 * `.cms-sideframe-frame iframe`); the steps here enter it, so a feature never
 * has to switch frames by hand.
 *
 * "CMS" is optional in the toolbar sentences ("the CMS toolbar", "the
 * toolbar") and required in the overlay sentences ("the CMS modal", "the CMS
 * sideframe"), which keeps them apart from webship-js's own modal steps.
 */

const { When, Then } = require('@cucumber/cucumber');
const {
  SELECTORS, TOOLBAR_HINT, OVERLAYS, explain, budget, settle, cleanLabel, labelRegex, actOrExplain, assertPresence,
  toolbarMenuLabels, toolbarMenuEntries, clickToolbarMenuEntry, toolbarButton, toolbarButtonLabels,
  overlayFrame, isModalOpen, waitForModal, frameField, frameClickable,
} = require('./django-cms-helpers');

const overlayKind = (word) => (/modal/i.test(word) ? 'modal' : 'sideframe');

// ---------------------------------------------------------------------------
// The toolbar and its menus
// ---------------------------------------------------------------------------

/**
 * Assert the django CMS toolbar is (or is not) visible. It renders for a
 * logged-in staff user on a page served through the CMS, never for an
 * anonymous visitor and not on the Django admin's own pages.
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
    await assertPresence(this.page.locator(SELECTORS.toolbar), notCase, {
      label: 'the CMS toolbar',
      hint: 'The toolbar is in the page: somebody is still logged in, or the logout did not complete.',
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
 * Click an entry of the toolbar's site menu (the first menu, named after
 * the site): "Pages", "Users", "Administration", "Aliases", "User settings",
 * "Disable toolbar". The trailing "..." of an entry is optional. Most of
 * these entries open the CMS sideframe; assert on it with the sideframe
 * steps, not with a page URL step.
 *
 * Example #1: When I click "Pages" in the CMS toolbar menu
 * Example #2: When I click "Users" in the CMS toolbar menu
 * Example #3: And we click "Administration" in the django CMS toolbar menu
 * Example #4: When I click "User settings" in the toolbar menu
 * Example #5: And click "Aliases" in the CMS toolbar menu
 *
 */
When(/^(I |we )*click "([^"]*)" in the (?:(?:django )?CMS )?toolbar menu$/, async function (pronounCase, entry) {
  await clickToolbarMenuEntry(this, 'site', entry);
  await settle(this, 1000);
});

/**
 * Click an entry of a named toolbar menu: "Page", "Version", "Language",
 * "Help", or "site" for the first menu. Write an entry of a sub-menu as
 * "Parent > Child". "Version" matches the menu whatever its number and
 * state ("Version #3 (Draft)").
 *
 * Example #1: When I click "Page settings" in the "Page" toolbar menu
 * Example #2: When I click "Create Page > New Sub Page" in the "Page" toolbar menu
 * Example #3: And we click "Manage Versions" in the "Version" CMS toolbar menu
 * Example #4: When I click "Add Translation > Deutsch" in the "Language" toolbar menu
 * Example #5: And click "Delete page" in the "Page" django CMS toolbar menu
 *
 */
When(/^(I |we )*click "([^"]*)" in the "([^"]*)" (?:(?:django )?CMS )?toolbar menu$/, async function (pronounCase, entry, menu) {
  await clickToolbarMenuEntry(this, menu, entry);
  await settle(this, 1000);
});

/**
 * Assert the toolbar has (or does not have) a menu. The "Page", "Version"
 * and "Language" menus only show on a CMS page; "Version" matches the menu
 * whatever its number and state.
 *
 * Example #1: Then the toolbar should have the "Page" menu
 * Example #2: Then the CMS toolbar should not have the "Page" menu
 * Example #3: And the toolbar should have the "Language" menu
 * Example #4: Then the django CMS toolbar should have the "Version" menu
 * Example #5: But the toolbar should not have the "Version" menu
 *
 */
Then(/^the (?:(?:django )?CMS )?toolbar should( not)* have the "([^"]*)" menu$/, async function (notCase, menu) {
  await assertPresence(this.page.locator(SELECTORS.toolbarBar), null, { label: 'the CMS toolbar', hint: TOOLBAR_HINT, timeout: budget(this) });
  const wanted = cleanLabel(menu).toLowerCase();
  const labels = await toolbarMenuLabels(this);
  const has = labels.some((label) => cleanLabel(label).toLowerCase() === wanted || (wanted === 'version' && /^version\b/i.test(label)));
  if (Boolean(notCase) === has) {
    throw explain({
      message: notCase ? `Expected the toolbar not to have the "${menu}" menu, but it does.` : `Expected the toolbar to have the "${menu}" menu. Its menus: ${labels.map((l) => `"${l}"`).join(', ')}.`,
      hint: 'The "Page", "Version" and "Language" menus only show on a page served through the CMS.',
    });
  }
});

/**
 * Assert a toolbar menu lists (or does not list) an entry. Use "site" for
 * the first menu; write an entry of a sub-menu as "Parent > Child". This is
 * how a feature proves what a role may do: an editor's site menu has no
 * "Users" entry.
 *
 * Example #1: Then the "site" toolbar menu should list "Pages"
 * Example #2: Then the "site" toolbar menu should not list "Users"
 * Example #3: And the "Page" CMS toolbar menu should list "Page settings"
 * Example #4: Then the "Language" toolbar menu should list "Add Translation > Deutsch"
 * Example #5: But the "Page" django CMS toolbar menu should not list "Publish"
 *
 */
Then(/^the "([^"]*)" (?:(?:django )?CMS )?toolbar menu should( not)* list "([^"]*)"$/, async function (menu, notCase, entry) {
  const entries = await toolbarMenuEntries(this, menu);
  const wanted = String(entry).split(/\s*>\s*/).map(cleanLabel).join(' > ').toLowerCase();
  const has = entries.some((e) => e.toLowerCase() === wanted);
  if (Boolean(notCase) === has) {
    throw explain({
      message: notCase ? `Expected the "${menu}" toolbar menu not to list "${entry}", but it does.` : `Expected the "${menu}" toolbar menu to list "${entry}". Its entries: ${entries.map((e) => `"${e}"`).join(', ') || '(none)'}.`,
      hint: 'django CMS builds the menus from the permissions of the user and the state of the page.',
    });
  }
});

/**
 * Click a toolbar button by its label: "Create", "Edit", "New Draft",
 * "Preview", "Publish", "View published". Buttons that post a form
 * ("Publish", "New Draft") reload the page; the step waits for it.
 *
 * Example #1: When I click the "Create" toolbar button
 * Example #2: When I click the "Preview" toolbar button
 * Example #3: And we click the "New Draft" CMS toolbar button
 * Example #4: When click the "Publish" toolbar button
 * Example #5: And I click the "View published" django CMS toolbar button
 *
 */
When(/^(I |we )*click the "([^"]*)" (?:(?:django )?CMS )?toolbar button$/, async function (pronounCase, label) {
  const button = toolbarButton(this, label).first();
  if (!(await button.count())) {
    const labels = await toolbarButtonLabels(this);
    throw explain({
      message: `The toolbar has no "${label}" button. Its buttons: ${labels.map((l) => `"${l}"`).join(', ') || '(none)'}.`,
      hint: '"Publish" shows while editing a draft; "New Draft" on a published page; "Edit" on a draft that is being previewed.',
    });
  }
  await actOrExplain('click', `the "${label}" toolbar button`, async () => {
    await button.waitFor({ state: 'visible', timeout: budget(this) });
    await button.click();
  }, TOOLBAR_HINT);
  await settle(this);
});

/**
 * Assert the toolbar has (or does not have) a button. The buttons tell the
 * state of the page: a draft in edit mode offers "Publish", a published page
 * offers "New Draft".
 *
 * Example #1: Then the toolbar should have the "Publish" button
 * Example #2: Then the toolbar should not have the "Publish" button
 * Example #3: And the CMS toolbar should have the "New Draft" button
 * Example #4: Then the django CMS toolbar should have the "Create" button
 * Example #5: But the toolbar should not have the "New Draft" button
 *
 */
Then(/^the (?:(?:django )?CMS )?toolbar should( not)* have the "([^"]*)" button$/, async function (notCase, label) {
  await assertPresence(this.page.locator(SELECTORS.toolbarBar), null, { label: 'the CMS toolbar', hint: TOOLBAR_HINT, timeout: budget(this) });
  try {
    await toolbarButton(this, label).first().waitFor({ state: notCase ? 'hidden' : 'visible', timeout: notCase ? 2000 : budget(this) });
  } catch {
    const labels = await toolbarButtonLabels(this);
    throw explain({
      message: notCase ? `Expected the toolbar not to have the "${label}" button, but it does.` : `Expected the toolbar to have the "${label}" button. Its buttons: ${labels.map((l) => `"${l}"`).join(', ') || '(none)'}.`,
      hint: 'The buttons follow the state of the page and the permissions of the user.',
    });
  }
});

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * Assert a message with the given text was (or was not) shown: the
 * toolbar's own message (`.cms-messages`, which fades after a few seconds
 * but keeps its text) or a Django admin message (`ul.messagelist`).
 *
 * Example #1: Then I should see the CMS message "Version published"
 * Example #2: Then I should not see the CMS message "Version published"
 * Example #3: And we should see the django CMS message "The page content"
 * Example #4: Then should see the CMS message "was changed successfully"
 * Example #5: But we should not see the CMS message "Error"
 *
 */
Then(/^(I |we )*should( not)* see the (?:django )?CMS message "([^"]*)"$/, async function (pronounCase, notCase, text) {
  const message = this.page.locator(`${SELECTORS.cmsMessage}, ${SELECTORS.adminMessage}`).filter({ hasText: text });
  try {
    await message.first().waitFor({ state: notCase ? 'detached' : 'attached', timeout: notCase ? 2000 : budget(this) });
  } catch {
    const shown = (await this.page.locator(`${SELECTORS.cmsMessage}, ${SELECTORS.adminMessage}`).allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
    throw explain({
      message: notCase ? `Expected no message containing "${text}", but the page shows one.` : `Expected a message containing "${text}". Messages on the page: ${shown.map((m) => `"${m}"`).join(', ') || '(none)'}.`,
      hint: 'django CMS shows its messages in the toolbar (`.cms-messages`); the Django admin lists its own in `ul.messagelist`.',
    });
  }
});

// ---------------------------------------------------------------------------
// The modal and the sideframe
// ---------------------------------------------------------------------------

/**
 * Assert the CMS modal is (or is not) open.
 *
 * Example #1: Then the CMS modal should be open
 * Example #2: Then the CMS modal should not be open
 * Example #3: And the django CMS modal should be open
 * Example #4: But the CMS modal should not be open
 * Example #5: Then the django CMS modal should not be open
 *
 */
Then(/^the (?:django )?CMS modal should( not)* be open$/, async function (notCase) {
  await waitForModal(this, !notCase);
});

/**
 * Assert the title of the open CMS modal: the text in its header, such as
 * "Create", "Page settings" or "Text Add text".
 *
 * Example #1: Then the CMS modal title should be "Create"
 * Example #2: Then the CMS modal title should contain "Page settings"
 * Example #3: And the django CMS modal title should contain "Text"
 * Example #4: Then the CMS modal title should not contain "Delete"
 * Example #5: But the CMS modal title should not be "Create"
 *
 */
Then(/^the (?:django )?CMS modal title should( not)* (be|contain) "([^"]*)"$/, async function (notCase, mode, expected) {
  await waitForModal(this, true);
  const title = this.page.locator(SELECTORS.modalTitle).first();
  const matcher = mode === 'be' ? labelRegex(expected) : expected;
  try {
    await this.page.locator(SELECTORS.modalTitle).filter({ hasText: matcher }).first().waitFor({ state: notCase ? 'detached' : 'attached', timeout: notCase ? 2000 : budget(this) });
  } catch {
    const actual = cleanLabel(await title.textContent().catch(() => ''));
    throw explain({
      message: `Expected the CMS modal title ${notCase ? 'not ' : ''}to ${mode} "${expected}", but it is "${actual}".`,
      hint: 'The title is the text in the header of the modal (`.cms-modal-title`).',
    });
  }
});

/**
 * Assert the CMS sideframe is (or is not) open with its iframe showing a
 * URL that contains the given part.
 *
 * Example #1: Then the CMS sideframe should be showing "/admin/cms/pagecontent/"
 * Example #2: Then the CMS sideframe should be showing "/admin/auth/user/"
 * Example #3: And the django CMS sideframe should be showing "/admin/"
 * Example #4: Then the sideframe should not be showing "/admin/auth/user/"
 * Example #5: And the CMS sideframe should not be showing "/admin/cms/pagecontent/"
 *
 */
Then(/^the (?:(?:django )?CMS )?sideframe should( not)* be showing "([^"]*)"$/, async function (notCase, urlPart) {
  const frames = this.page.locator(SELECTORS.sideframeFrame);
  const matching = frames.and(this.page.locator(`[src*="${urlPart.replace(/["\\]/g, '\\$&')}"]`));
  try {
    // A closed sideframe keeps its iframe in the page, hidden.
    await matching.first().waitFor({ state: notCase ? 'hidden' : 'visible', timeout: notCase ? 2000 : budget(this) });
  } catch {
    const src = await frames.first().getAttribute('src').catch(() => null);
    throw explain({
      message: notCase
        ? `Expected the CMS sideframe not to be showing a URL containing "${urlPart}", but it is ("${src}").`
        : `Expected the CMS sideframe to be showing a URL containing "${urlPart}", but it ${src ? `is showing "${src}"` : 'is not open'}.`,
      hint: OVERLAYS.sideframe.hint,
    });
  }
});

/**
 * Assert a text is (or is not) shown inside the CMS modal or the CMS
 * sideframe. The step reads the iframe the overlay loads.
 *
 * Example #1: Then I should see "Provide a title for the new page." in the CMS modal
 * Example #2: Then I should see "Select page content to change" in the CMS sideframe
 * Example #3: And we should not see "Error" in the django CMS modal
 * Example #4: Then should see "editor" in the CMS sideframe
 * Example #5: But I should not see "Users" in the django CMS sideframe
 *
 */
Then(/^(I |we )*should( not)* see "([^"]*)" in the (?:django )?CMS (modal|sideframe)$/, async function (pronounCase, notCase, text, overlayWord) {
  const kind = overlayKind(overlayWord);
  const frame = await overlayFrame(this, kind);
  await assertPresence(frame.getByText(text, { exact: false }), notCase, {
    label: `"${text}" in the ${OVERLAYS[kind].name}`,
    hint: `The ${OVERLAYS[kind].name} loads its content in an iframe; the text must be in that document.`,
    timeout: notCase ? 2000 : budget(this),
  });
});

/**
 * Fill in a form field inside the CMS modal or the CMS sideframe, by its
 * label ("Title", "Slug"), its id, its name or its placeholder. The label
 * matches exactly, so "Title" is not "Menu Title".
 *
 * Example #1: When I fill in "Title" with "News" in the CMS modal
 * Example #2: When I fill in "Slug" with "news" in the CMS modal
 * Example #3: And we fill in "Menu Title" with "Latest" in the django CMS modal
 * Example #4: When I fill in "q" with "editor" in the CMS sideframe
 * Example #5: And fill in "Title" with "Neuigkeiten" in the django CMS modal
 *
 */
When(/^(I |we )*fill in "([^"]*)" with "([^"]*)" in the (?:django )?CMS (modal|sideframe)$/, async function (pronounCase, label, value, overlayWord) {
  const kind = overlayKind(overlayWord);
  const frame = await overlayFrame(this, kind);
  await actOrExplain('fill in', `"${label}" in the ${OVERLAYS[kind].name}`, async () => {
    const field = await frameField(frame, label);
    await field.waitFor({ state: 'visible', timeout: budget(this) });
    await field.fill(value);
  }, 'Use the label of the field as the form shows it (without the colon), or its id or name.');
});

/**
 * Click a button or a link in the CMS modal or the CMS sideframe. In the
 * modal, the buttons of its footer ("Save", "Next", "Create", "Cancel",
 * "Yes, I'm sure") are tried first, then the content of its iframe; in the
 * sideframe, the content of its iframe.
 *
 * Example #1: When I click "Next" in the CMS modal
 * Example #2: When I click "Save" in the CMS modal
 * Example #3: And we click "Cancel" in the django CMS modal
 * Example #4: When I click "editor" in the CMS sideframe
 * Example #5: And click "New sub page" in the CMS modal
 *
 */
When(/^(I |we )*click "([^"]*)" in the (?:django )?CMS (modal|sideframe)$/, async function (pronounCase, label, overlayWord) {
  const kind = overlayKind(overlayWord);
  const frame = await overlayFrame(this, kind);
  await actOrExplain('click', `"${label}" in the ${OVERLAYS[kind].name}`, async () => {
    const footer = kind === 'modal' ? this.page.locator(SELECTORS.modalButtons).filter({ hasText: labelRegex(label) }).first() : null;
    if (footer && await footer.count()) {
      await footer.click();
      return;
    }
    const target = frameClickable(frame, label);
    await target.waitFor({ state: 'visible', timeout: budget(this) });
    await target.click();
  }, 'The label must match a button of the modal footer, or a button or link inside the overlay.');
  await settle(this, 1000);
});

/**
 * Close the CMS modal or the CMS sideframe with its own close control.
 *
 * Example #1: When I close the CMS modal
 * Example #2: When I close the CMS sideframe
 * Example #3: And we close the django CMS modal
 * Example #4: When close the CMS sideframe
 * Example #5: And we close the django CMS sideframe
 *
 */
When(/^(I |we )*close the (?:django )?CMS (modal|sideframe)$/, async function (pronounCase, overlayWord) {
  const kind = overlayKind(overlayWord);
  if (kind === 'modal') {
    if (!(await isModalOpen(this))) throw explain({ message: 'The CMS modal is not open.', hint: OVERLAYS.modal.hint });
    await this.page.locator(SELECTORS.modalClose).first().click();
    await waitForModal(this, false);
    return;
  }
  const close = this.page.locator(SELECTORS.sideframeClose).first();
  await actOrExplain('close', 'the CMS sideframe', async () => {
    await close.waitFor({ state: 'visible', timeout: budget(this) });
    await close.click();
    await this.page.locator(SELECTORS.sideframe).first().waitFor({ state: 'hidden', timeout: budget(this) });
  }, OVERLAYS.sideframe.hint);
});
