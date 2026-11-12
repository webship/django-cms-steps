'use strict';

/**
 * django-cms-steps
 *
 * webship-js step definitions for testing django CMS sites.
 *
 * This module exports no step function: Cucumber registers the steps when it
 * loads the `*.steps.js` files, which a project does by adding the glob below
 * to the `require` array of its cucumber.js (see README.md).
 */

const path = require('path');

const STEP_DEFINITIONS_DIR = path.join(__dirname, 'tests', 'step-definitions');

module.exports = {
  // For the `require` array of cucumber.js, relative to the project root.
  stepDefinitionsGlob: path.join('node_modules', '@webship-js', 'django-cms-steps', 'tests', 'step-definitions', '*.steps.js'),
  // The folder that holds the step files, and the same glob as an absolute path.
  stepDefinitionsDir: STEP_DEFINITIONS_DIR,
  stepDefinitionsPath: path.join(STEP_DEFINITIONS_DIR, '*.steps.js'),
};
