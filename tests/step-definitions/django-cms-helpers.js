'use strict';

/**
 * django-cms-steps / tests/step-definitions/django-cms-helpers.js
 *
 * Shared selectors and helpers for the django CMS step definitions. This
 * file defines no step; the `*.steps.js` files next to it do.
 *
 * Every selector below was read from a real django CMS 5.1 site built with
 * the django CMS quickstart (djangocms-versioning 2.8, djangocms-text 1.0,
 * djangocms-frontend 2.5, djangocms-alias 3.2, on Django 5.2 and 6.1).
 */

const { gotoUrl, smartSettle, friendly } = require('webship-js/tests/step-definitions/webship');

const SELECTORS = {
  // The toolbar: #cms-top wraps the bar, the messages, the sideframe, the
  // modal and the structure board.
  toolbar: '#cms-top',
  toolbarBar: '#cms-top .cms-toolbar',
  toolbarNav: '#cms-top .cms-toolbar-item-navigation',
  toolbarButtons: '#cms-top .cms-toolbar-right a.cms-btn',
  modeSwitcher: '#cms-top .cms-toolbar-item-cms-mode-switcher a',
  // Messages: the toolbar's own, and Django admin's list.
  cmsMessage: '#cms-top .cms-messages-inner',
  adminMessage: 'ul.messagelist li',
  // The modal and the sideframe load their content in an iframe.
  modal: '#cms-top .cms-modal',
  modalOpen: '#cms-top .cms-modal.cms-modal-open',
  modalTitle: '#cms-top .cms-modal-title',
  modalButtons: '#cms-top .cms-modal-buttons a.cms-btn',
  modalClose: '#cms-top .cms-modal-close',
  modalFrame: '#cms-top .cms-modal-frame iframe',
  sideframe: '#cms-top .cms-sideframe',
  sideframeClose: '#cms-top .cms-sideframe-close',
  sideframeFrame: '#cms-top .cms-sideframe-frame iframe',
  // The structure board.
  structure: '#cms-top .cms-structure',
  dragarea: '#cms-top .cms-structure .cms-dragarea',
  // Django's own admin.
  loginForm: '#login-form',
  loginUsername: '#id_username',
  loginPassword: '#id_password',
  loginError: '#login-form .errornote, .errornote',
  resultList: '#result_list',
  // The page tree at /admin/cms/pagecontent/.
  pageTree: '.cms-pagetree-jstree, .cms-pagetree',
  pageTreeNode: '.cms-pagetree-jstree li.jstree-node',
  // The "no pages yet" welcome screen of a fresh install.
  welcomePart: '.cms-welcome-heading, .cms-welcome-section, #cms-welcome-config',
};

/**
 * Front-end selectors depend on the site's templates. The defaults cover the
 * quickstart's Bootstrap 5 base template and django CMS's own menu,
 * breadcrumb and language chooser templates; a project overrides any of them
 * in cucumber.js: worldParameters.djangoCms = { menu: '...', ... }.
 */
const FRONT_END_DEFAULTS = {
  menu: 'ul.navbar-nav:not(.language-chooser), ul.nav, ul.menu, nav[aria-label="Main" i] ul',
  menuActive: '.active, .selected, [aria-current="page"]',
  breadcrumb: '.breadcrumb, nav[aria-label="Breadcrumb" i] ol, nav[aria-label="Breadcrumb" i] ul',
  languageChooser: 'li.lang',
  // The admin lives at /admin/. A site that prefixes its URLs with the
  // language (i18n_patterns) redirects there by the visitor's language;
  // `adminLanguage: 'en'` makes the steps open /en/admin/ directly, so the
  // admin and the page tree always answer in the language the features use.
  adminPath: 'admin',
  adminLanguage: '',
};

const TOOLBAR_HINT = 'The CMS toolbar (`#cms-top`) only renders for a logged-in staff user on a page served through the CMS; log in first, then open a CMS page.';

function frontEnd(world, key) {
  const configured = (world.parameters && world.parameters.djangoCms) || {};
  return configured[key] || FRONT_END_DEFAULTS[key];
}

function siteRoot(world) {
  return String(world.launchUrl).replace(/\/$/, '');
}

/** An admin URL under `launchUrl`, with the language prefix when `adminLanguage` is set. */
function adminUrl(world, path) {
  const language = frontEnd(world, 'adminLanguage');
  return `${siteRoot(world)}/${language ? `${language}/` : ''}${frontEnd(world, 'adminPath')}/${String(path || '').replace(/^\//, '')}`;
}

/** The per-assertion wait budget: `minWaitTime.page` from cucumber.js, at least 10 s. */
function budget(world) {
  return Math.max((world.minWaitTime && world.minWaitTime.page) || 0, 10000);
}

async function settle(world, fallback) {
  await smartSettle(world.page, (world.minWaitTime && world.minWaitTime.page) || fallback || 3000);
}

const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Collapse whitespace and drop the "..." django CMS adds to entries that open a dialog. */
const cleanLabel = (text) => String(text || '').replace(/\s+/g, ' ').trim().replace(/\s*(\.\.\.|…)$/, '');

/**
 * A regex that matches a label exactly, ignoring case, outer whitespace and a
 * trailing "..." or ":". A straight apostrophe also matches the typographic
 * one Django writes ("Yes, I’m sure").
 */
function labelRegex(label) {
  const body = escapeRegex(cleanLabel(label)).replace(/['’]/g, "['’]");
  return new RegExp(`^\\s*${body}\\s*(?:\\.\\.\\.|…|:)?\\s*$`, 'i');
}

/** Run a locator action and rethrow as a friendly error (action, target, cause, hint). */
async function actOrExplain(label, target, fn, hint) {
  try {
    return await fn();
  } catch (err) {
    if (err && err.friendly) throw err;
    throw friendly({ action: label, target, cause: err, hint });
  }
}

/** A friendly error that `actOrExplain` passes through unchanged. */
function explain(input) {
  const error = friendly(input);
  error.friendly = true;
  return error;
}

/**
 * Wait until `locator` has (or, with `notCase`, has no) match in the given
 * state; the wait and the assertion are one call.
 */
async function assertPresence(locator, notCase, { label, hint, timeout, state = 'visible' }) {
  try {
    await locator.first().waitFor({ state: notCase ? (state === 'attached' ? 'detached' : 'hidden') : state, timeout });
  } catch {
    throw explain({
      message: notCase ? `Expected not to see ${label}, but it is on the page.` : `Expected ${label}, but it did not appear within ${timeout} ms.`,
      hint,
    });
  }
}

/**
 * Look up a registry handle in cucumber.js worldParameters.users
 * (`{ <handle>: { username, password } }`).
 */
function resolveUser(parameters, handle) {
  const users = (parameters && parameters.users) || {};
  const entry = users[handle];
  if (!entry) {
    throw explain({
      message: `User "${handle}" is not configured. Known users: ${Object.keys(users).join(', ') || '(none)'}.`,
      hint: `Add it to worldParameters.users in cucumber.js: users: { ${handle}: { username: '...', password: process.env.DJANGOCMS_${handle.toUpperCase().replace(/\W+/g, '_')}_PASS } }. Accounts are configuration: create them on the site once (manage.py createsuperuser, a fixture), not from a feature.`,
    });
  }
  const username = entry.username || handle;
  const password = typeof entry === 'string' ? entry : entry.password;
  if (!password) {
    throw explain({
      message: `User "${handle}" has no password configured.`,
      hint: `Set worldParameters.users.${handle}.password in cucumber.js, from an environment variable.`,
    });
  }
  return { username, password };
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

async function requireToolbar(world) {
  await assertPresence(world.page.locator(SELECTORS.toolbarBar), null, {
    label: 'the CMS toolbar',
    hint: TOOLBAR_HINT,
    timeout: budget(world),
  });
}

/** The labels of the toolbar's menus, e.g. ["example.com", "Page", "Version #1 (Draft)", "Language", "Help"]. */
async function toolbarMenuLabels(world) {
  return world.page.locator(`${SELECTORS.toolbarNav} > li:not(.cms-toolbar-more) > a`).evaluateAll((links) => links.map((a) => a.textContent.replace(/\s+/g, ' ').trim()));
}

/**
 * The top-level <li> of a toolbar menu. "site" (or "Site") is the first
 * menu, whose label is the site's name; "Version" matches "Version #3 (Draft)".
 */
async function toolbarMenu(world, name) {
  await requireToolbar(world);
  const wanted = cleanLabel(name).toLowerCase();
  const labels = await toolbarMenuLabels(world);
  let index = labels.findIndex((label) => cleanLabel(label).toLowerCase() === wanted);
  if (index === -1 && wanted === 'site') index = 0;
  if (index === -1 && wanted === 'version') index = labels.findIndex((label) => /^version\b/i.test(label));
  if (index === -1) {
    throw explain({
      message: `The CMS toolbar has no "${name}" menu. Its menus: ${labels.map((l) => `"${l}"`).join(', ') || '(none)'}.`,
      hint: 'The "Page", "Version" and "Language" menus only show on a CMS page; "site" is the first menu, named after the site.',
    });
  }
  return world.page.locator(`${SELECTORS.toolbarNav} > li:not(.cms-toolbar-more)`).nth(index);
}

/** Open a toolbar menu. It opens on click (a "-hover" class set by script), not on CSS hover. */
async function openToolbarMenu(world, name) {
  const menu = await toolbarMenu(world, name);
  const list = menu.locator(':scope > ul');
  if (!(await list.isVisible().catch(() => false))) {
    await menu.locator(':scope > a').click();
    await list.waitFor({ state: 'visible', timeout: budget(world) });
  }
  return menu;
}

/** The entries of a toolbar menu, sub-entries as "Parent > Child". */
async function toolbarMenuEntries(world, name) {
  const menu = await toolbarMenu(world, name);
  return menu.evaluate((li) => {
    const text = (el) => {
      const link = el.querySelector(':scope > a');
      return (link ? link.textContent : el.textContent).replace(/\s+/g, ' ').trim().replace(/\s*(\.\.\.|…)$/, '');
    };
    const entries = [];
    for (const item of li.querySelectorAll(':scope > ul > li:not(.cms-toolbar-item-navigation-break)')) {
      entries.push(text(item));
      for (const child of item.querySelectorAll(':scope > ul > li:not(.cms-toolbar-item-navigation-break)')) {
        entries.push(`${text(item)} > ${text(child)}`);
      }
    }
    return entries;
  });
}

/**
 * Click an entry of a toolbar menu. `path` is the entry's label, or
 * "Parent > Child" for an entry of a sub-menu ("Create Page > New Page").
 */
async function clickToolbarMenuEntry(world, name, path) {
  const menu = await openToolbarMenu(world, name);
  const parts = String(path).split(/\s*>\s*/).filter(Boolean);
  let scope = menu;
  for (let i = 0; i < parts.length; i += 1) {
    const item = scope.locator(':scope > ul > li').filter({ has: world.page.locator(':scope > a', { hasText: labelRegex(parts[i]) }) }).first();
    if (!(await item.count())) {
      const entries = await toolbarMenuEntries(world, name);
      throw explain({
        message: `The "${name}" toolbar menu has no "${path}" entry. Its entries: ${entries.map((e) => `"${e}"`).join(', ') || '(none)'}.`,
        hint: 'Write a sub-menu entry as "Parent > Child"; the trailing "..." of an entry is optional.',
      });
    }
    if (await item.evaluate((li) => li.classList.contains('cms-toolbar-item-navigation-disabled'))) {
      throw explain({ message: `The "${path}" entry of the "${name}" toolbar menu is disabled.`, hint: 'django CMS disables an entry the current page or user cannot use.' });
    }
    const link = item.locator(':scope > a');
    if (i < parts.length - 1) {
      await link.hover();
      await item.locator(':scope > ul').waitFor({ state: 'visible', timeout: budget(world) });
      scope = item;
    } else {
      await link.waitFor({ state: 'visible', timeout: budget(world) });
      await link.click();
    }
  }
}

/** A toolbar button ("Create", "Edit", "New Draft", "Preview", "Publish", "View published") by its label. */
function toolbarButton(world, label) {
  return world.page.locator(SELECTORS.toolbarButtons).filter({ hasText: labelRegex(label) });
}

async function toolbarButtonLabels(world) {
  return (await world.page.locator(SELECTORS.toolbarButtons).evaluateAll((links) => links.map((a) => a.textContent.replace(/\s+/g, ' ').trim()))).filter(Boolean);
}

/** `CMS.config.mode`: "draft" while editing, "live" otherwise; null when the toolbar is not on the page. */
async function cmsMode(world) {
  return world.page.evaluate(() => (window.CMS && window.CMS.config ? window.CMS.config.mode : null)).catch(() => null);
}

// ---------------------------------------------------------------------------
// Modal and sideframe (both load an iframe)
// ---------------------------------------------------------------------------

const OVERLAYS = {
  modal: {
    name: 'CMS modal',
    frame: SELECTORS.modalFrame,
    hint: 'The CMS modal opens from toolbar entries and buttons that end in "..." ("Create", "Page settings...") and from the structure board.',
  },
  sideframe: {
    name: 'CMS sideframe',
    frame: SELECTORS.sideframeFrame,
    hint: 'The CMS sideframe opens from the site menu of the toolbar ("Pages...", "Users...", "Administration...").',
  },
};

/** The frame locator of the open modal or sideframe, once its document has a body. */
async function overlayFrame(world, kind) {
  const overlay = OVERLAYS[kind];
  const iframe = world.page.locator(overlay.frame).first();
  try {
    await iframe.waitFor({ state: 'attached', timeout: budget(world) });
    await world.page.frameLocator(overlay.frame).first().locator('body').waitFor({ state: 'attached', timeout: budget(world) });
  } catch {
    throw explain({ message: `The ${overlay.name} is not open.`, hint: overlay.hint });
  }
  return world.page.frameLocator(overlay.frame).first();
}

async function isModalOpen(world) {
  return (await world.page.locator(SELECTORS.modalOpen).count()) > 0;
}

async function waitForModal(world, open) {
  try {
    await world.page.locator(SELECTORS.modalOpen).first().waitFor({ state: open ? 'visible' : 'detached', timeout: budget(world) });
  } catch {
    let detail = '';
    if (!open) {
      // A modal that stays open after "Save" usually shows a form error.
      const errors = await world.page.frameLocator(SELECTORS.modalFrame).first().locator('.errornote, .errorlist li').allInnerTexts().catch(() => []);
      if (errors.length) detail = ` The form reports: ${errors.map((e) => e.trim()).filter(Boolean).join(' | ')}`;
    }
    throw explain({
      message: open ? 'Expected the CMS modal to open, but it did not.' : `Expected the CMS modal to close, but it is still open.${detail}`,
      hint: OVERLAYS.modal.hint,
    });
  }
}

/**
 * A form field inside a frame, by its label ("Title", "Slug"), matched
 * exactly so "Title" does not pick "Menu Title"; falls back to the id, the
 * name and the placeholder.
 */
async function frameField(frame, label) {
  const byLabel = frame.locator('label').filter({ hasText: labelRegex(label) }).first();
  if (await byLabel.count()) {
    const target = await byLabel.getAttribute('for');
    if (target) return frame.locator(`[id="${target}"]`);
    return byLabel.locator('input, textarea, select').first();
  }
  const escaped = String(label).replace(/["\\]/g, '\\$&');
  return frame.locator(`[id="${escaped}"], [name="${escaped}"], [placeholder="${escaped}"]`).first();
}

/** Something to click inside a frame: a button, a submit input or a link with this label. */
function frameClickable(frame, label) {
  const escaped = String(label).replace(/["\\]/g, '\\$&');
  return frame.locator('a, button, [role="button"]')
    .filter({ hasText: labelRegex(label) })
    // A choice of the create wizard: a label with a title and a description.
    .or(frame.locator('label.choice').filter({ has: frame.locator('strong', { hasText: labelRegex(label) }) }))
    .or(frame.locator(`input[type="submit"][value="${escaped}" i], input[type="button"][value="${escaped}" i]`))
    .first();
}

// ---------------------------------------------------------------------------
// Page tree
// ---------------------------------------------------------------------------

async function requirePageTree(world) {
  await assertPresence(world.page.locator(SELECTORS.pageTree), null, {
    label: 'the page tree (`.cms-pagetree`)',
    hint: 'The page tree is the list at /admin/cms/pagecontent/ and needs a logged-in staff user; open it with "I am on the page tree".',
    timeout: budget(world),
  });
  // The rows come from an AJAX request after the page loads.
  await world.page.locator('.cms-pagetree-jstree[aria-busy="true"]').first().waitFor({ state: 'detached', timeout: budget(world) }).catch(() => {});
}

/** The titles the page tree shows now (collapsed branches excluded), with their jsTree ids. */
async function pageTreeRows(world) {
  return world.page.locator(SELECTORS.pageTreeNode).evaluateAll((nodes) => nodes.map((li) => {
    const parent = li.parentElement.closest('li.jstree-node');
    return {
      id: li.id,
      title: li.querySelector(':scope > a.jstree-anchor').textContent.replace(/\s+/g, ' ').trim(),
      parent: parent ? parent.querySelector(':scope > a.jstree-anchor').textContent.replace(/\s+/g, ' ').trim() : null,
      home: li.dataset.isHome === 'true',
      closed: li.classList.contains('jstree-closed'),
    };
  }));
}

/**
 * Find a page in the tree by its exact title, opening collapsed branches
 * until it shows. Returns the row, or null when no page has that title.
 */
async function findPageTreeRow(world, title) {
  // A step that names a page works from anywhere: it opens the page tree when the page shows none.
  if (!(await world.page.locator(SELECTORS.pageTree).count())) {
    await gotoUrl(world.page, adminUrl(world, 'cms/pagecontent/'));
    await settle(world);
  }
  await requirePageTree(world);
  const wanted = String(title).trim();
  for (let round = 0; round < 25; round += 1) {
    const rows = await pageTreeRows(world);
    const row = rows.find((r) => r.title === wanted);
    if (row) return row;
    const closed = rows.find((r) => r.closed);
    if (!closed) return null;
    await world.page.locator(`li[id="${closed.id}"] > i.jstree-ocl`).click();
    await world.page.locator(`li[id="${closed.id}"].jstree-open, li[id="${closed.id}"].jstree-leaf`).waitFor({ state: 'attached', timeout: budget(world) }).catch(() => {});
  }
  return null;
}

async function requirePageTreeRow(world, title) {
  const row = await findPageTreeRow(world, title);
  if (!row) {
    const titles = (await pageTreeRows(world)).map((r) => `"${r.title}"`);
    throw explain({
      message: `The page tree has no page titled "${title}". It lists: ${titles.join(', ') || '(no pages)'}.`,
      hint: 'Titles match exactly, in the language the page tree shows; create the page first or check the spelling.',
    });
  }
  return row;
}

/** The grid cells of a page tree row (state, settings, actions) share the row's jsTree id. */
function pageTreeCells(world, row) {
  return world.page.locator(`[data-jstreegrid="${row.id}"]`);
}

module.exports = {
  SELECTORS,
  TOOLBAR_HINT,
  OVERLAYS,
  gotoUrl,
  friendly,
  explain,
  frontEnd,
  siteRoot,
  adminUrl,
  budget,
  settle,
  escapeRegex,
  cleanLabel,
  labelRegex,
  actOrExplain,
  assertPresence,
  resolveUser,
  requireToolbar,
  toolbarMenuLabels,
  toolbarMenu,
  openToolbarMenu,
  toolbarMenuEntries,
  clickToolbarMenuEntry,
  toolbarButton,
  toolbarButtonLabels,
  cmsMode,
  overlayFrame,
  isModalOpen,
  waitForModal,
  frameField,
  frameClickable,
  requirePageTree,
  pageTreeRows,
  findPageTreeRow,
  requirePageTreeRow,
  pageTreeCells,
};
