'use strict';

/**
 * django-cms-steps / tests/step-definitions/django-cms-pages.steps.js
 *
 * Steps for working on a page the way an editor does: create it with the
 * wizard, open it for editing, work on the structure board (placeholders and
 * plugins), write in the text editor, and publish it. The version steps need
 * djangocms-versioning, which the django CMS quickstart installs.
 *
 * The wizard, the plugin form and the confirmation dialogs all load in the
 * CMS modal's iframe (`.cms-modal-frame iframe`), while the buttons that
 * submit them ("Next", "Create", "Save", "Yes, I'm sure") are in the modal's
 * footer, outside that iframe. The steps handle both sides.
 */

const { When, Then } = require('@cucumber/cucumber');
const {
  SELECTORS, TOOLBAR_HINT, explain, budget, settle, labelRegex, actOrExplain, assertPresence,
  requireToolbar, toolbarMenuLabels, clickToolbarMenuEntry, toolbarButton, toolbarButtonLabels, cmsMode, overlayFrame, waitForModal,
} = require('./django-cms-helpers');

const EDIT_HINT = 'Open the page for editing first ("I open the page for editing"); a draft that was never published has no public URL, open it from the page tree ("I open the page "<title>" from the page tree").';
const EDITOR = '.ProseMirror[contenteditable="true"], .ck-editor__editable[contenteditable="true"]';
const ORDINALS = { first: 0, second: 1, third: 2, fourth: 3, fifth: 4 };

async function clickModalButton(world, label) {
  const button = world.page.locator(SELECTORS.modalButtons).filter({ hasText: labelRegex(label) }).first();
  await button.waitFor({ state: 'visible', timeout: budget(world) });
  await button.click();
}

/** Wait until django CMS reports the given mode ("draft" while editing, "live" otherwise). */
async function waitForMode(world, mode) {
  await world.page.waitForFunction((wanted) => window.CMS && window.CMS.config && window.CMS.config.mode === wanted, mode, { timeout: budget(world) });
}

async function isStructureOpen(world) {
  return world.page.evaluate(() => document.documentElement.classList.contains('cms-structure-mode-structure'));
}

/** Show or hide the structure board with the toolbar's mode switcher. */
async function toggleStructure(world, open) {
  await requireToolbar(world);
  if ((await isStructureOpen(world)) === open) return;
  const switcher = world.page.locator(SELECTORS.modeSwitcher).first();
  if (!(await switcher.count()) || await switcher.evaluate((a) => a.classList.contains('cms-btn-disabled'))) {
    throw explain({ message: 'The structure board is not available on this page.', hint: EDIT_HINT });
  }
  await switcher.click();
  await world.page.waitForFunction((wanted) => document.documentElement.classList.contains('cms-structure-mode-structure') === wanted, open, { timeout: budget(world) });
  if (open) await world.page.locator(SELECTORS.dragarea).first().waitFor({ state: 'visible', timeout: budget(world) });
}

/** The structure board area of a placeholder, by the placeholder's name; opens the board when needed. */
async function placeholderArea(world, name) {
  await toggleStructure(world, true);
  const area = world.page.locator(SELECTORS.dragarea).filter({ has: world.page.locator(`:scope > .cms-dragbar .cms-dragbar-title[title="${name.replace(/["\\]/g, '\\$&')}"]`) }).first();
  if (!(await area.count())) {
    const names = await world.page.locator(`${SELECTORS.dragarea} > .cms-dragbar .cms-dragbar-title`).evaluateAll((titles) => titles.map((t) => t.getAttribute('title')));
    throw explain({
      message: `The structure board has no "${name}" placeholder. Its placeholders: ${names.map((n) => `"${n}"`).join(', ') || '(none)'}.`,
      hint: 'A placeholder is named by the page template ({% placeholder "Page Content" %}).',
    });
  }
  return area;
}

/** The plugins of a type in a placeholder, in board order ("Text", "Link", "Card"). */
function pluginsIn(world, area, type) {
  return area.locator('.cms-draggable').filter({ has: world.page.locator(':scope > .cms-dragitem .cms-dragitem-text strong', { hasText: labelRegex(type) }) });
}

async function pickPlugin(world, area, type, position) {
  const plugins = pluginsIn(world, area, type);
  const count = await plugins.count();
  let index = 0;
  if (position === 'last') index = count - 1;
  else if (position && ORDINALS[position] !== undefined) index = ORDINALS[position];
  else if (position) index = parseInt(position, 10) - 1;
  if (count === 0 || index < 0 || index >= count) {
    const types = await area.locator('.cms-draggable > .cms-dragitem .cms-dragitem-text strong').allTextContents();
    throw explain({
      message: `The placeholder has no ${position ? `${position} ` : ''}"${type}" plugin. Its plugins: ${types.map((t) => `"${t.trim()}"`).join(', ') || '(none)'}.`,
      hint: 'A plugin is named as the structure board shows it ("Text", "Link", "Card").',
    });
  }
  return plugins.nth(index);
}

/** The text editor of the open plugin form (djangocms-text), inside the modal's iframe. */
async function modalEditor(world) {
  const frame = await overlayFrame(world, 'modal');
  const editor = frame.locator(EDITOR).first();
  try {
    await editor.waitFor({ state: 'visible', timeout: budget(world) });
  } catch {
    throw explain({ message: 'The CMS modal shows no text editor.', hint: 'The text editor is the body field of a "Text" plugin (djangocms-text); add or edit a text plugin first.' });
  }
  return editor;
}

async function fillEditor(world, text) {
  const editor = await modalEditor(world);
  await editor.click();
  await world.page.keyboard.press('ControlOrMeta+A');
  await world.page.keyboard.press('Delete');
  await world.page.keyboard.insertText(text);
}

async function addPlugin(world, type, placeholder) {
  const area = await placeholderArea(world, placeholder);
  await area.locator(':scope > .cms-dragbar .cms-submenu-add').first().click();
  await waitForModal(world, true);
  const choice = world.page.locator(`${SELECTORS.modal} .cms-plugin-picker .cms-submenu-item:not(.cms-submenu-item-title) a`).filter({ hasText: labelRegex(type) }).first();
  if (!(await choice.count())) {
    const types = await world.page.locator(`${SELECTORS.modal} .cms-plugin-picker .cms-submenu-item:not(.cms-submenu-item-title) a`).allTextContents();
    throw explain({
      message: `The plugin picker has no "${type}" plugin. It offers: ${types.map((t) => `"${t.trim()}"`).join(', ') || '(none)'}.`,
      hint: 'The picker lists the plugins the placeholder accepts and the user may add.',
    });
  }
  await choice.click();
  // The plugin form replaces the picker inside the modal's iframe.
  await world.page.locator(`${SELECTORS.modal}.cms-modal-iframe.cms-modal-open`).first().waitFor({ state: 'visible', timeout: budget(world) });
  await overlayFrame(world, 'modal');
}

async function savePlugin(world) {
  await clickModalButton(world, 'Save');
  await waitForModal(world, false);
  await settle(world, 1000);
}

// ---------------------------------------------------------------------------
// The create wizard
// ---------------------------------------------------------------------------

/**
 * Open the create wizard with the toolbar's "Create" button. Its first
 * step, in the CMS modal, offers what the user may create ("New page", "New
 * sub page", "New alias").
 *
 * Example #1: When I open the create wizard
 * Example #2: When we open the create wizard
 * Example #3: And I open the page wizard
 * Example #4: When open the create wizard
 * Example #5: And we open the page wizard
 *
 */
When(/^(I |we )*open the (?:create|page) wizard$/, async function (pronounCase) {
  await requireToolbar(this);
  await actOrExplain('open', 'the create wizard', async () => {
    await this.page.locator(`${SELECTORS.toolbarButtons}[href*="cms_wizard"]`).first().click();
    await waitForModal(this, true);
    await (await overlayFrame(this, 'modal')).locator('label.choice, #id_1-title').first().waitFor({ state: 'visible', timeout: budget(this) });
  }, 'The "Create" button shows in the toolbar for a user who may add content.');
});

/**
 * Assert the open create wizard offers (or does not offer) a choice.
 *
 * Example #1: Then the create wizard should offer "New page"
 * Example #2: Then the create wizard should offer "New sub page"
 * Example #3: And the page wizard should offer "New alias"
 * Example #4: Then the create wizard should not offer "New sub page"
 * Example #5: But the page wizard should not offer "New alias"
 *
 */
Then(/^the (?:create|page) wizard should( not)* offer "([^"]*)"$/, async function (notCase, choice) {
  const frame = await overlayFrame(this, 'modal');
  const choices = (await frame.locator('label.choice strong').allTextContents()).map((c) => c.trim());
  const has = choices.some((c) => labelRegex(choice).test(c));
  if (Boolean(notCase) === has) {
    throw explain({
      message: notCase ? `Expected the create wizard not to offer "${choice}", but it does.` : `Expected the create wizard to offer "${choice}". It offers: ${choices.map((c) => `"${c}"`).join(', ') || '(nothing)'}.`,
      hint: 'Open the wizard first ("I open the create wizard"); "New sub page" needs a current page.',
    });
  }
});

/**
 * Create a page with the create wizard: "Create" in the toolbar, "New page"
 * (next to the current page) or "New sub page" (below it), the title, and
 * optionally a first text. The wizard ends on the new page, in edit mode, as
 * a draft.
 *
 * Example #1: When I create a page titled "News" with the wizard
 * Example #2: When I create a sub page titled "Board" with the wizard
 * Example #3: And we create a page titled "Events" with the text "Coming soon." with the wizard
 * Example #4: When create a page with the title "Press" with the wizard
 * Example #5: And I create a sub page titled "History" with the content "Founded in 1999." with the wizard
 *
 */
When(/^(I |we )*create a (sub ?page|page) (?:titled|with the title) "([^"]*)"(?: with the (?:text|content) "([^"]*)")? with the wizard$/, async function (pronounCase, kind, title, text) {
  const page = this.page;
  const choice = /sub/i.test(kind) ? 'New sub page' : 'New page';
  await requireToolbar(this);
  await actOrExplain('create', `the page "${title}" with the wizard`, async () => {
    await page.locator(`${SELECTORS.toolbarButtons}[href*="cms_wizard"]`).first().click();
    await waitForModal(this, true);
    const frame = await overlayFrame(this, 'modal');
    const option = frame.locator('label.choice').filter({ has: page.locator('strong', { hasText: labelRegex(choice) }) }).first();
    await frame.locator('label.choice').first().waitFor({ state: 'visible', timeout: budget(this) });
    if (!(await option.count())) {
      const choices = (await frame.locator('label.choice strong').allTextContents()).map((c) => `"${c.trim()}"`);
      throw explain({ message: `The create wizard does not offer "${choice}". It offers: ${choices.join(', ')}.`, hint: '"New sub page" needs a current page: open a CMS page first.' });
    }
    await option.click();
    await clickModalButton(this, 'Next');
    const titleField = frame.locator('#id_1-title');
    await titleField.waitFor({ state: 'visible', timeout: budget(this) });
    await titleField.fill(title);
    if (text) {
      const editor = frame.locator(EDITOR).first();
      await editor.waitFor({ state: 'visible', timeout: budget(this) });
      await editor.click();
      await page.keyboard.insertText(text);
    }
    await Promise.all([
      page.waitForURL(/\/(edit|structure)\/\d+\//, { timeout: 30000 }),
      clickModalButton(this, 'Create'),
    ]);
  }, 'The wizard needs the toolbar\'s "Create" button, which shows for a user who may add pages.');
  await settle(this);
  await waitForMode(this, 'draft');
});

// ---------------------------------------------------------------------------
// Edit mode, preview and the structure board
// ---------------------------------------------------------------------------

/**
 * Open the current page for editing. On a published page this is the
 * toolbar's "New Draft" button (djangocms-versioning creates a draft from the
 * published version); on a draft that is being previewed it is "Edit". The
 * step does nothing when the page is already in edit mode.
 *
 * Example #1: When I open the page for editing
 * Example #2: When we open the page for editing
 * Example #3: And I edit the page
 * Example #4: When I switch to edit mode
 * Example #5: And we switch to edit mode
 *
 */
When(/^(I |we )*(?:open the page for editing|edit the page|switch to edit mode)$/, async function (pronounCase) {
  await requireToolbar(this);
  if ((await cmsMode(this)) === 'draft') return;
  const button = this.page.locator(SELECTORS.toolbarButtons).filter({ hasText: /^\s*(Edit|New Draft)\s*$/i }).first();
  if (!(await button.count())) {
    const labels = await toolbarButtonLabels(this);
    throw explain({ message: `The toolbar offers no "Edit" or "New Draft" button. Its buttons: ${labels.map((l) => `"${l}"`).join(', ') || '(none)'}.`, hint: EDIT_HINT });
  }
  await actOrExplain('open', 'the page for editing', async () => {
    await button.click();
    await this.page.waitForURL(/\/(edit|structure)\/\d+\//, { timeout: 30000 });
    await waitForMode(this, 'draft');
  }, TOOLBAR_HINT);
  await settle(this);
});

/**
 * Assert the page is (or is not) in edit mode: django CMS reports the
 * "draft" mode and serves the page from its edit endpoint.
 *
 * Example #1: Then I should be in edit mode
 * Example #2: Then I should not be in edit mode
 * Example #3: And we should be in edit mode
 * Example #4: Then should be in edit mode
 * Example #5: But we should not be in edit mode
 *
 */
Then(/^(I |we )*should( not)* be in edit mode$/, async function (pronounCase, notCase) {
  try {
    await this.page.waitForFunction((negate) => {
      const mode = window.CMS && window.CMS.config ? window.CMS.config.mode : null;
      return negate ? mode !== 'draft' : mode === 'draft';
    }, Boolean(notCase), { timeout: notCase ? 2000 : budget(this) });
  } catch {
    throw explain({ message: notCase ? 'Expected the page not to be in edit mode, but it is.' : `Expected the page to be in edit mode, but django CMS reports "${await cmsMode(this)}".`, hint: EDIT_HINT });
  }
});

/**
 * Preview the page being edited with the toolbar's "Preview" button: the
 * page as a visitor would see it, without the editing controls.
 *
 * Example #1: When I preview the page
 * Example #2: When we preview the page
 * Example #3: And I preview the page
 * Example #4: When preview the page
 * Example #5: And we preview the page
 *
 */
When(/^(I |we )*preview the page$/, async function (pronounCase) {
  const button = toolbarButton(this, 'Preview').first();
  await actOrExplain('click', 'the "Preview" toolbar button', async () => {
    await button.waitFor({ state: 'visible', timeout: budget(this) });
    await button.click();
    await this.page.waitForURL(/\/preview\/\d+\//, { timeout: 30000 });
  }, 'The "Preview" button shows on a CMS page for a user who may edit it.');
  await settle(this);
});

/**
 * Open or close the structure board, the outline of the page's placeholders
 * and plugins, with the toolbar's mode switcher. The board is only available
 * in edit mode.
 *
 * Example #1: When I open the structure board
 * Example #2: When I close the structure board
 * Example #3: And we open the structure board
 * Example #4: When open the structure board
 * Example #5: And we close the structure board
 *
 */
When(/^(I |we )*(open|close) the structure board$/, async function (pronounCase, action) {
  await toggleStructure(this, action === 'open');
});

/**
 * Assert the structure board is (or is not) showing.
 *
 * Example #1: Then I should see the structure board
 * Example #2: Then I should not see the structure board
 * Example #3: And we should see the structure board
 * Example #4: Then should see the structure board
 * Example #5: But we should not see the structure board
 *
 */
Then(/^(I |we )*should( not)* see the structure board$/, async function (pronounCase, notCase) {
  try {
    await this.page.waitForFunction((wanted) => document.documentElement.classList.contains('cms-structure-mode-structure') === wanted, !notCase, { timeout: notCase ? 2000 : budget(this) });
  } catch {
    throw explain({ message: notCase ? 'Expected the structure board to be closed, but it is showing.' : 'Expected the structure board to be showing, but it is not.', hint: 'Open it with "I open the structure board"; it needs edit mode.' });
  }
});

/**
 * Assert the structure board has (or does not have) a placeholder, by the
 * name the page template gives it. The step opens the board when needed.
 *
 * Example #1: Then I should see the "Page Content" placeholder
 * Example #2: Then I should not see the "Sidebar" placeholder
 * Example #3: And we should see the "Page Content" placeholder
 * Example #4: Then should see the "Footer" placeholder
 * Example #5: But we should not see the "Header" placeholder
 *
 */
Then(/^(I |we )*should( not)* see the "([^"]*)" placeholder$/, async function (pronounCase, notCase, name) {
  await toggleStructure(this, true);
  const title = this.page.locator(`${SELECTORS.dragarea} > .cms-dragbar .cms-dragbar-title[title="${name.replace(/["\\]/g, '\\$&')}"]`);
  await assertPresence(title, notCase, {
    label: `the "${name}" placeholder on the structure board`,
    hint: 'A placeholder is named by the page template ({% placeholder "Page Content" %}).',
    timeout: notCase ? 2000 : budget(this),
  });
});

// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

/**
 * Start adding a plugin to a placeholder: open the plugin picker of the
 * placeholder and choose the plugin type. The plugin's form opens in the CMS
 * modal; fill it and finish with "I save the plugin".
 *
 * Example #1: When I add a "Text" plugin to the "Page Content" placeholder
 * Example #2: When I add a "Link" plugin to the "Page Content" placeholder
 * Example #3: And we add an "Alert" plugin to the "Page Content" placeholder
 * Example #4: When add a "Card" plugin to the "Page Content" placeholder
 * Example #5: And I add an "Accordion" plugin to the "Sidebar" placeholder
 *
 */
When(/^(I |we )*add an? "([^"]*)" plugin to the "([^"]*)" placeholder$/, async function (pronounCase, type, placeholder) {
  await actOrExplain('add', `a "${type}" plugin to the "${placeholder}" placeholder`, () => addPlugin(this, type, placeholder), EDIT_HINT);
});

/**
 * Add a text plugin with the given text to a placeholder, in one step: pick
 * "Text" in the plugin picker, write in the editor and save.
 *
 * Example #1: When I add a text plugin with "Hello, world." to the "Page Content" placeholder
 * Example #2: When we add a text plugin with "Opening hours" to the "Page Content" placeholder
 * Example #3: And I add a text plugin with "Second paragraph." to the "Page Content" placeholder
 * Example #4: When add a text plugin with "Contact us." to the "Sidebar" placeholder
 * Example #5: And we add a text plugin with "Imprint" to the "Footer" placeholder
 *
 */
When(/^(I |we )*add a text plugin with "([^"]*)" to the "([^"]*)" placeholder$/, async function (pronounCase, text, placeholder) {
  await actOrExplain('add', `a text plugin to the "${placeholder}" placeholder`, async () => {
    await addPlugin(this, 'Text', placeholder);
    await fillEditor(this, text);
    await savePlugin(this);
  }, EDIT_HINT);
});

/**
 * Replace the content of the text editor in the open plugin form
 * (djangocms-text, inside the CMS modal) with the given text.
 *
 * Example #1: When I fill in the text editor with "Hello, world."
 * Example #2: When we fill in the text editor with "Opening hours"
 * Example #3: And I fill in the rich text editor with "A new paragraph."
 * Example #4: When fill in the text editor with "Updated text."
 * Example #5: And we fill in the rich text editor with "Imprint"
 *
 */
When(/^(I |we )*fill in the (?:rich )?text editor with "([^"]*)"$/, async function (pronounCase, text) {
  await fillEditor(this, text);
});

/**
 * Assert the text editor in the open plugin form contains (or does not
 * contain) a text.
 *
 * Example #1: Then the text editor should contain "Hello, world."
 * Example #2: Then the text editor should not contain "Lorem ipsum"
 * Example #3: And the rich text editor should contain "Opening hours"
 * Example #4: Then the text editor should contain "About this site."
 * Example #5: But the rich text editor should not contain "Draft"
 *
 */
Then(/^the (?:rich )?text editor should( not)* contain "([^"]*)"$/, async function (notCase, text) {
  const editor = await modalEditor(this);
  const actual = (await editor.innerText()).replace(/\s+/g, ' ').trim();
  if (Boolean(notCase) === actual.includes(text)) {
    throw explain({ message: `Expected the text editor ${notCase ? 'not ' : ''}to contain "${text}", but it holds "${actual}".`, hint: 'The step reads the body of the text plugin form open in the CMS modal.' });
  }
});

/**
 * Save the plugin form open in the CMS modal and wait for the modal to
 * close. When the form is not valid the modal stays open, and the step
 * fails with the errors the form reports.
 *
 * Example #1: When I save the plugin
 * Example #2: When we save the plugin
 * Example #3: And I save the plugin
 * Example #4: When save the plugin
 * Example #5: And we save the plugin
 *
 */
When(/^(I |we )*save the plugin$/, async function (pronounCase) {
  await actOrExplain('save', 'the plugin', () => savePlugin(this), 'Add or edit a plugin first; its form opens in the CMS modal.');
});

/**
 * Open the form of a plugin for editing, from the structure board. Name
 * the plugin by its type; "first", "second", "third", "last" or a number
 * picks one of several ("the second "Text" plugin", "the 4th "Text" plugin").
 *
 * Example #1: When I edit the "Text" plugin in the "Page Content" placeholder
 * Example #2: When I edit the second "Text" plugin in the "Page Content" placeholder
 * Example #3: And we edit the last "Text" plugin in the "Page Content" placeholder
 * Example #4: When edit the first "Link" plugin in the "Page Content" placeholder
 * Example #5: And I edit the 3rd "Text" plugin in the "Sidebar" placeholder
 *
 */
When(/^(I |we )*edit the (?:(first|second|third|fourth|fifth|last|\d+)(?:st|nd|rd|th)? )?"([^"]*)" plugin in the "([^"]*)" placeholder$/, async function (pronounCase, position, type, placeholder) {
  await actOrExplain('edit', `the "${type}" plugin in the "${placeholder}" placeholder`, async () => {
    const plugin = await pickPlugin(this, await placeholderArea(this, placeholder), type, position);
    await plugin.locator(':scope > .cms-dragitem .cms-submenu-edit').first().click();
    await waitForModal(this, true);
    await overlayFrame(this, 'modal');
  }, EDIT_HINT);
});

/**
 * Delete a plugin from the structure board: its actions menu, "Delete",
 * and "Yes, I'm sure" in the confirmation the CMS modal shows.
 *
 * Example #1: When I delete the "Text" plugin in the "Page Content" placeholder
 * Example #2: When I delete the last "Text" plugin in the "Page Content" placeholder
 * Example #3: And we delete the second "Text" plugin in the "Page Content" placeholder
 * Example #4: When delete the first "Link" plugin in the "Page Content" placeholder
 * Example #5: And I delete the 2nd "Text" plugin in the "Sidebar" placeholder
 *
 */
When(/^(I |we )*delete the (?:(first|second|third|fourth|fifth|last|\d+)(?:st|nd|rd|th)? )?"([^"]*)" plugin in the "([^"]*)" placeholder$/, async function (pronounCase, position, type, placeholder) {
  await actOrExplain('delete', `the "${type}" plugin in the "${placeholder}" placeholder`, async () => {
    const plugin = await pickPlugin(this, await placeholderArea(this, placeholder), type, position);
    await plugin.locator(':scope > .cms-dragitem .cms-submenu-settings').first().click();
    const entry = plugin.locator(':scope > .cms-dragitem .cms-submenu-dropdown a[data-rel="delete"]').first();
    await entry.waitFor({ state: 'visible', timeout: budget(this) });
    await entry.click();
    await waitForModal(this, true);
    await (await overlayFrame(this, 'modal')).locator('body.delete-confirmation, form').first().waitFor({ state: 'attached', timeout: budget(this) });
    const confirm = this.page.locator(`${SELECTORS.modalButtons}.deletelink, ${SELECTORS.modalButtons}.cms-btn-caution`).first();
    await confirm.waitFor({ state: 'visible', timeout: budget(this) });
    await confirm.click();
    await waitForModal(this, false);
  }, EDIT_HINT);
  await settle(this, 1000);
});

/**
 * Assert a placeholder has (or does not have) a plugin of a type, on the
 * structure board. The step opens the board when needed.
 *
 * Example #1: Then the "Page Content" placeholder should have a "Text" plugin
 * Example #2: Then the "Page Content" placeholder should not have a "Link" plugin
 * Example #3: And the "Page Content" placeholder should contain an "Alert" plugin
 * Example #4: Then the "Sidebar" placeholder should not contain a "Text" plugin
 * Example #5: But the "Page Content" placeholder should not have a "Card" plugin
 *
 */
Then(/^the "([^"]*)" placeholder should( not)* (?:have|contain) an? "([^"]*)" plugin$/, async function (placeholder, notCase, type) {
  const area = await placeholderArea(this, placeholder);
  await assertPresence(pluginsIn(this, area, type), notCase, {
    label: `a "${type}" plugin in the "${placeholder}" placeholder`,
    hint: 'A plugin is named as the structure board shows it ("Text", "Link", "Card").',
    timeout: notCase ? 2000 : budget(this),
    state: 'attached',
  });
});

/**
 * Assert how many plugins a placeholder holds, nested plugins included.
 *
 * Example #1: Then the "Page Content" placeholder should have 1 plugin
 * Example #2: Then the "Page Content" placeholder should have 2 plugins
 * Example #3: And the "Page Content" placeholder should have 0 plugins
 * Example #4: Then the "Sidebar" placeholder should contain 3 plugins
 * Example #5: And the "Footer" placeholder should contain 1 plugin
 *
 */
Then(/^the "([^"]*)" placeholder should (?:have|contain) (\d+) plugins?$/, async function (placeholder, expected) {
  const area = await placeholderArea(this, placeholder);
  const wanted = parseInt(expected, 10);
  const plugins = area.locator('.cms-draggable');
  try {
    await this.page.waitForFunction(({ selector, name, count }) => {
      const areas = [...document.querySelectorAll(selector)].filter((a) => a.querySelector(':scope > .cms-dragbar .cms-dragbar-title').getAttribute('title') === name);
      return areas.length > 0 && areas[0].querySelectorAll('.cms-draggable').length === count;
    }, { selector: SELECTORS.dragarea, name: placeholder, count: wanted }, { timeout: budget(this) });
  } catch {
    throw explain({ message: `Expected the "${placeholder}" placeholder to have ${wanted} plugin(s), but it has ${await plugins.count()}.`, hint: 'The count includes nested plugins (a column inside a row).' });
  }
});

// ---------------------------------------------------------------------------
// Versions (djangocms-versioning)
// ---------------------------------------------------------------------------

/** The version the toolbar reports: { number, state } from "Version #3 (Draft)". */
async function toolbarVersion(world) {
  const label = (await toolbarMenuLabels(world)).find((l) => /^version\b/i.test(l));
  const match = label && label.match(/#(\d+)\s*\(([^)]+)\)/);
  return match ? { number: parseInt(match[1], 10), state: match[2].trim() } : null;
}

/**
 * Publish the draft being edited with the toolbar's "Publish" button, and
 * wait for the published page.
 *
 * Example #1: When I publish the page
 * Example #2: When we publish the page
 * Example #3: And I publish the page
 * Example #4: When publish the page
 * Example #5: And we publish the page
 *
 */
When(/^(I |we )*publish the page$/, async function (pronounCase) {
  await requireToolbar(this);
  const button = toolbarButton(this, 'Publish').first();
  if (!(await button.count())) {
    const labels = await toolbarButtonLabels(this);
    throw explain({ message: `The toolbar offers no "Publish" button. Its buttons: ${labels.map((l) => `"${l}"`).join(', ') || '(none)'}.`, hint: `"Publish" shows while editing a draft, for a user who may publish. ${EDIT_HINT}` });
  }
  await actOrExplain('publish', 'the page', async () => {
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      button.click(),
    ]);
    await waitForMode(this, 'live');
  }, TOOLBAR_HINT);
  await settle(this);
});

/**
 * Unpublish the page being viewed, through "Manage Versions" in the
 * toolbar's "Version" menu: the versions list opens in the CMS sideframe,
 * where the step chooses "Unpublish" for the published version and confirms.
 *
 * Example #1: When I unpublish the page
 * Example #2: When we unpublish the page
 * Example #3: And I unpublish the page
 * Example #4: When unpublish the page
 * Example #5: And we unpublish the page
 *
 */
When(/^(I |we )*unpublish the page$/, async function (pronounCase) {
  await actOrExplain('unpublish', 'the page', async () => {
    await clickToolbarMenuEntry(this, 'Version', 'Manage Versions');
    const frame = await overlayFrame(this, 'sideframe');
    const action = frame.locator('#result_list a.cms-action-unpublish').first();
    try {
      await action.waitFor({ state: 'visible', timeout: budget(this) });
    } catch {
      throw explain({ message: 'The versions list offers no "Unpublish" action.', hint: 'Only a published version can be unpublished, by a user who may publish.' });
    }
    await action.click();
    const confirm = frame.locator('input.confirm-link, input[type="submit"]').first();
    await confirm.waitFor({ state: 'visible', timeout: budget(this) });
    await confirm.click();
    await this.page.locator(SELECTORS.sideframe).first().waitFor({ state: 'hidden', timeout: budget(this) }).catch(() => {});
  }, 'The "Version" menu shows on a CMS page when djangocms-versioning is installed.');
  await settle(this);
});

/**
 * Assert the state of the version the toolbar shows: "Published", "Draft",
 * "Unpublished" or "Archived" (the "Version" menu reads "Version #3
 * (Draft)").
 *
 * Example #1: Then the page version should be "Draft"
 * Example #2: Then the page version should be "Published"
 * Example #3: And the page version should not be "Published"
 * Example #4: Then the page version should be "Unpublished"
 * Example #5: But the page version should not be "Archived"
 *
 */
Then(/^the page version should( not)* be "([^"]*)"$/, async function (notCase, state) {
  await requireToolbar(this);
  const wanted = state.trim().toLowerCase();
  try {
    await this.page.waitForFunction(({ selector, expected, negate }) => {
      const label = [...document.querySelectorAll(selector)].map((a) => a.textContent.trim()).find((t) => /^version\b/i.test(t));
      const match = label && label.match(/\(([^)]+)\)/);
      const actual = match ? match[1].trim().toLowerCase() : null;
      return actual !== null && (negate ? actual !== expected : actual === expected);
    }, { selector: `${SELECTORS.toolbarNav} > li > a`, expected: wanted, negate: Boolean(notCase) }, { timeout: notCase ? 2000 : budget(this) });
  } catch {
    const version = await toolbarVersion(this);
    throw explain({
      message: version ? `Expected the page version ${notCase ? 'not ' : ''}to be "${state}", but the toolbar shows version #${version.number} as "${version.state}".` : 'The toolbar shows no "Version" menu.',
      hint: 'The "Version" menu shows on a CMS page when djangocms-versioning is installed; a page with no published version has no public URL.',
    });
  }
});

/**
 * Assert the number of the version the toolbar shows. Every new draft of a
 * page gets the next number.
 *
 * Example #1: Then the page should be at version 1
 * Example #2: Then the page should be at version 2
 * Example #3: And the page should be at version 3
 * Example #4: Then the page should not be at version 1
 * Example #5: But the page should not be at version 2
 *
 */
Then(/^the page should( not)* be at version (\d+)$/, async function (notCase, number) {
  await requireToolbar(this);
  const version = await toolbarVersion(this);
  if (!version) throw explain({ message: 'The toolbar shows no "Version" menu.', hint: 'The "Version" menu shows on a CMS page when djangocms-versioning is installed.' });
  if (Boolean(notCase) === (version.number === parseInt(number, 10))) {
    throw explain({ message: `Expected the page ${notCase ? 'not ' : ''}to be at version ${number}, but the toolbar shows version #${version.number} (${version.state}).`, hint: 'Opening a published page for editing creates the next version as a draft.' });
  }
});

/**
 * Assert the page shows (or does not show) the markers django CMS adds
 * around editable plugins and placeholders (`template.cms-plugin`,
 * `.cms-plugin`, `.cms-placeholder`). They exist in edit mode only: a
 * published page must not carry them.
 *
 * Example #1: Then the page should have editable plugins
 * Example #2: Then the page should not have editable plugins
 * Example #3: And the page should have editable plugins
 * Example #4: But the page should not have editable plugins
 * Example #5: Then the page should not have editable plugins
 *
 */
Then(/^the page should( not)* have editable plugins$/, async function (notCase) {
  await assertPresence(this.page.locator('template.cms-plugin, .cms-plugin, .cms-placeholder, script[data-cms-plugin]'), notCase, {
    label: 'the edit markers of plugins and placeholders',
    hint: 'django CMS renders the markers in edit mode only; open the page for editing, in content mode.',
    timeout: notCase ? 2000 : budget(this),
    state: 'attached',
  });
});
