// A feature file, a scenario (file:line), a folder or a rerun file named on
// the command line of cucumber-js runs alone: `npx cucumber-js
// tests/features/login.feature`. cucumber-js 12 adds the paths of the command
// line to the `paths` of this file instead of using them alone, so `paths` is
// left empty when the command line names any, as in webship-js itself.
const OPTIONS_WITH_A_VALUE = new Set([
  '-c', '--config', '-f', '--format', '--format-options', '--i18n-keywords',
  '-i', '--import', '-l', '--loader', '--language', '--name', '--order',
  '-p', '--profile', '--parallel', '--plugin', '--plugin-options',
  '-r', '--require', '--require-module', '--retry', '--retry-tag-filter',
  '--shard', '-t', '--tags', '--world-parameters',
]);

function commandLinePaths() {
  // Only when cucumber-js itself runs, not when another script reads this file.
  if (!/cucumber(-js|\.js)?$/.test(String(process.argv[1] || ''))) return [];
  const args = process.argv.slice(2);
  const paths = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i].startsWith('-')) {
      if (OPTIONS_WITH_A_VALUE.has(args[i])) i += 1;
    } else {
      paths.push(args[i]);
    }
  }
  return paths;
}


module.exports = {
  default: {
    // The step timeout is webship-js's (45 s, set when it loads): WEBSHIP_STEP_TIMEOUT=<milliseconds> changes it; a `timeout` key here is ignored.
    requireModule: ['ts-node/register'],
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js', // Webship-js core step definitions (auto HTML report on exit; disable: WEBSHIP_REPORT_DISABLE=1).
      'tests/step-definitions/*.steps.js',                       // django-cms-steps custom step definitions (no custom.js).
    ],
    // FEATURES=tests/features/a.feature,tests/features/b.feature runs a subset too.
    paths: process.env.FEATURES ? process.env.FEATURES.split(',') : (commandLinePaths().length ? [] : ['tests/features/**/*.feature']),
    // CUCUMBER_TAGS=@critical runs a lane; the default keeps work-in-progress, auth-state setup and the
    // empty-site lane (the welcome screen, which needs a site with no pages) out.
    tags: process.env.CUCUMBER_TAGS || 'not @wip and not @auth-setup and not @empty-site',
    format: [
      '@cucumber/pretty-formatter',
      'json:tests/reports/cucumber_report.json',
    ],
    formatOptions: {
      colorsEnabled: true,
      theme: {
        'feature keyword': ['bold', 'blue'],
        'feature name': ['blue', 'underline'],
        'feature description': ['blueBright'],
        'scenario keyword': ['bold', 'magenta'],
        'scenario name': ['magenta', 'underline'],
        'step keyword': ['bold', 'green'],
        'step text': ['greenBright', 'italic'],
      },
    },
    worldParameters: {
      // The django CMS site this repository builds with DDEV (site/, started
      // with `npm run site:start`). Point LAUNCH_URL at another django CMS
      // site to test that one instead.
      launchUrl: process.env.LAUNCH_URL || 'https://django-cms-steps.ddev.site',
      // Video of the browser: 'off', 'on', 'on-failure' or 'tag' (scenarios tagged @video; @no-video opts out).
      video: { mode: process.env.WEBSHIP_VIDEO || 'off', dir: './videos', size: { width: 1280, height: 720 }, filenamePattern: '{datetime}.{feature_file}.{scenario}.{status}.{ext}' },
      // JavaScript errors the page raises: 'warn' reports them, 'fail' fails the scenario, 'off' ignores them; @js-fail, @js-warn and @js-off per scenario.
      javascript: { mode: process.env.WEBSHIP_JS_ERROR_MODE || 'warn', levels: ['error'], ignore: '', beforeScenario: false, afterScenario: true },
      minWaitTime: {
        page: 3000,
        before_scenario: 0,
        after_scenario: 0,
        before_step: 0,
        after_step: 0,
      },
      // The users registry: a handle a feature can read, mapped to a real
      // account of the site. Accounts are configuration: the site creates them
      // once (site/scripts/accounts.py), no feature does. Override per
      // environment with DJANGOCMS_<HANDLE>_USER / DJANGOCMS_<HANDLE>_PASS.
      users: {
        admin: {
          username: process.env.DJANGOCMS_ADMIN_USER || 'admin',
          password: process.env.DJANGOCMS_ADMIN_PASS || 'admin',
        },
        editor: {
          username: process.env.DJANGOCMS_EDITOR_USER || 'editor',
          password: process.env.DJANGOCMS_EDITOR_PASS || 'editor',
        },
      },
      // What the django CMS steps need to know about the site. `adminLanguage`
      // opens the admin under that language prefix (/en/admin/), so the admin
      // and the page tree answer in the language the features are written in;
      // leave it out for a site without language prefixes. `menu`,
      // `breadcrumb` and `languageChooser` take CSS selectors when the site
      // templates differ from the django CMS defaults.
      djangoCms: {
        adminLanguage: process.env.DJANGOCMS_ADMIN_LANGUAGE || 'en',
      },
      selectors: {
        css: {},
        xpath: {},
        filesPath: './tests/selectors/',
        files: [],
        offset: 60,
        breakpoints: {
          xs:   { width: 375,  height: 667  },
          sm:   { width: 576,  height: 800  },
          md:   { width: 768,  height: 1024 },
          lg:   { width: 992,  height: 768  },
          xl:   { width: 1200, height: 900, default: true },
          xxl:  { width: 1400, height: 900  },
          xxxl: { width: 1920, height: 1080 },
        },
      },
      screenshot: {
        dir: './screenshots',
        purge: false,
        onFailed: true,
        onEveryStep: false,
        alwaysFullscreen: false,
        failedPrefix: 'failed_',
        filenamePattern: '{datetime}.{feature_file}.feature_{step_line}.{ext}',
        filenamePatternFailed: '{failed_prefix}{datetime}.{feature_file}.feature_{step_line}.{ext}',
        infoTypes: '',
      },
    },
  },
};
