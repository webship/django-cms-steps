'use strict';

/**
 * django-cms-steps
 *
 * Custom webship-js step definitions for testing django CMS sites.
 *
 * This module has no exported functions of its own — requiring
 * `tests/step-definitions/django-cms.steps.js` (directly, or via the glob
 * below) is what registers the Given/When/Then steps with @cucumber/cucumber.
 *
 * Consumers wire this package into their cucumber.js `require` array,
 * see README.md / docs/plugin-integration.md for details.
 */

const path = require('path');

const STEP_DEFINITIONS_GLOB = path.join(
  'node_modules',
  '@webship-js/django-cms-steps',
  'tests',
  'step-definitions',
  '*.steps.js'
);

module.exports = {
  stepDefinitionsGlob: STEP_DEFINITIONS_GLOB,
  stepDefinitionsPath: path.join(__dirname, 'tests', 'step-definitions', 'django-cms.steps.js'),
};
