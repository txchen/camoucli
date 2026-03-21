import { Command } from 'commander';

import packageJson from '../../package.json' with { type: 'json' };

import type { LaunchInput } from '../camoufox/config.js';

export interface SharedOptions {
  session?: string | undefined;
  tabname?: string | undefined;
  headless?: boolean | undefined;
  browser?: string | undefined;
  config?: string | undefined;
  configJson?: string | undefined;
  prefs?: string | undefined;
  prefsJson?: string | undefined;
  fingerprint?: string | undefined;
  fingerprintJson?: string | undefined;
  preset?: string[] | undefined;
  proxy?: string | undefined;
  locale?: string | undefined;
  locales?: string[] | undefined;
  region?: string | undefined;
  timezone?: string | undefined;
  screenProfile?: string | undefined;
  windowProfile?: string | undefined;
  blockImages?: boolean | undefined;
  blockWebrtc?: boolean | undefined;
  blockWebgl?: boolean | undefined;
  disableCoop?: boolean | undefined;
  width?: number | undefined;
  height?: number | undefined;
  json?: boolean | undefined;
  verbose?: boolean | undefined;
}

export interface OutputOptions {
  json?: boolean | undefined;
  verbose?: boolean | undefined;
  force?: boolean | undefined;
}

export interface CliHandlers {
  onInstall: (version: string | undefined, options: OutputOptions) => Promise<void>;
  onRemove: (version: string | undefined, options: OutputOptions) => Promise<void>;
  onUse: (version: string, options: OutputOptions) => Promise<void>;
  onVersions: (options: OutputOptions) => Promise<void>;
  onRemoteVersions?: (options: OutputOptions) => Promise<void>;
  onPresets: (options: OutputOptions) => Promise<void>;
  onFingerprintProfiles: (options: OutputOptions) => Promise<void>;
  onPath: (options: OutputOptions) => Promise<void>;
  onVersion: (options: OutputOptions) => Promise<void>;
  onDoctor: (options: OutputOptions) => Promise<void>;
  onDaemonAction: (action: string, payload: Record<string, unknown>, options: SharedOptions) => Promise<void>;
}

export interface ProgramOptions {
  quietErrors?: boolean | undefined;
}

function collectValues(value: string, previous: string[] = []): string[] {
  return [...previous, ...value.split(',').map((item) => item.trim()).filter(Boolean)];
}

function addSharedBrowserOptions(command: Command): Command {
  return command
    .option('--session <name>', 'session name')
    .option('--tabname <name>', 'tab name')
    .option('--headless', 'launch headless')
    .option('--browser <version>', 'specific installed browser version')
    .option('--config <path>', 'Camoufox config file path')
    .option('--config-json <json>', 'inline Camoufox config JSON')
    .option('--prefs <path>', 'Firefox prefs file path')
    .option('--prefs-json <json>', 'inline Firefox prefs JSON')
    .option('--fingerprint <path>', 'fingerprint helper JSON file path')
    .option('--fingerprint-json <json>', 'inline fingerprint helper JSON')
    .option('--preset <name>', 'apply a built-in preset (repeat or use comma-separated values)', collectValues)
    .option('--proxy <url>', 'proxy URL')
    .option('--locale <locale>', 'locale override')
    .option('--locales <locale>', 'accepted locales (repeat or use comma-separated values)', collectValues)
    .option('--region <code>', 'region profile for locale/timezone/geolocation helpers')
    .option('--timezone <timezone>', 'timezone override')
    .option('--screen-profile <name>', 'named screen fingerprint profile')
    .option('--window-profile <name>', 'named window fingerprint profile')
    .option('--block-images', 'block image requests')
    .option('--block-webrtc', 'disable WebRTC')
    .option('--block-webgl', 'disable WebGL')
    .option('--disable-coop', 'disable Cross-Origin-Opener-Policy isolation')
    .option('--width <width>', 'window width', parseInteger)
    .option('--height <height>', 'window height', parseInteger)
    .option('--json', 'JSON output')
    .option('--verbose', 'verbose output');
}

function addSharedOutputOptions(command: Command): Command {
  return command.option('--json', 'JSON output').option('--verbose', 'verbose output');
}

export function parseInteger(value: string): number {
  return Number.parseInt(value, 10);
}

export function toLaunchInput(options: SharedOptions): LaunchInput {
  return {
    headless: options.headless,
    browser: options.browser,
    configPath: options.config,
    configJson: options.configJson,
    prefsPath: options.prefs,
    prefsJson: options.prefsJson,
    fingerprintPath: options.fingerprint,
    fingerprintJson: options.fingerprintJson,
    preset: options.preset,
    proxy: options.proxy,
    locale: options.locale,
    locales: options.locales,
    region: options.region,
    timezone: options.timezone,
    screenProfile: options.screenProfile,
    windowProfile: options.windowProfile,
    blockImages: options.blockImages,
    blockWebRtc: options.blockWebrtc,
    blockWebGl: options.blockWebgl,
    disableCoop: options.disableCoop,
    width: options.width,
    height: options.height,
  };
}

export function createProgram(handlers: CliHandlers, options?: ProgramOptions): Command {
  const program = new Command();
  program.exitOverride();
  program.configureOutput({
    writeErr: (str) => {
      if (!options?.quietErrors) {
        process.stderr.write(str);
      }
    },
    outputError: (str, write) => {
      if (!options?.quietErrors) {
        write(str);
      }
    },
  });
  program
    .name('camou')
    .description('CLI and local daemon for Camoufox via Playwright')
    .version(packageJson.version);

  addSharedOutputOptions(
    program
      .command('install [version]')
      .description('Install the latest or a specific Camoufox release')
      .option('--force', 'reinstall even if already present')
      .action(async (version: string | undefined, options: OutputOptions) => {
        await handlers.onInstall(version, options);
      }),
  );

  addSharedOutputOptions(
    program
      .command('remove [version]')
      .description('Remove an installed Camoufox release')
      .action(async (version: string | undefined, options: OutputOptions) => {
        await handlers.onRemove(version, options);
      }),
  );

  addSharedOutputOptions(
    program
      .command('use <version>')
      .description('Select the active Camoufox version')
      .action(async (version: string, options: OutputOptions) => {
        await handlers.onUse(version, options);
      }),
  );

  addSharedOutputOptions(
    program
      .command('versions')
      .description('List installed Camoufox versions')
      .action(async (options: OutputOptions) => {
        await handlers.onVersions(options);
      }),
  );

  addSharedOutputOptions(
    program
      .command('remote-versions')
      .description('List compatible remote Camoufox releases')
      .action(async (options: OutputOptions) => {
        await handlers.onRemoteVersions?.(options);
      }),
  );

  addSharedOutputOptions(
    program
      .command('presets')
      .description('List built-in launch presets')
      .action(async (options: OutputOptions) => {
        await handlers.onPresets(options);
      }),
  );

  addSharedOutputOptions(
    program
      .command('fingerprint-profiles')
      .description('List built-in fingerprint screen, window, and region profiles')
      .action(async (options: OutputOptions) => {
        await handlers.onFingerprintProfiles(options);
      }),
  );

  addSharedOutputOptions(
    program
      .command('path')
      .description('Print the resolved Camoufox executable path')
      .action(async (options: OutputOptions) => {
        await handlers.onPath(options);
      }),
  );

  addSharedOutputOptions(
    program
      .command('version')
      .description('Print the current installed Camoufox version')
      .action(async (options: OutputOptions) => {
        await handlers.onVersion(options);
      }),
  );

  addSharedOutputOptions(
    program
      .command('doctor')
      .description('Show environment diagnostics')
      .action(async (options: OutputOptions) => {
        await handlers.onDoctor(options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('open <url>')
      .description('Open a URL in the current tab')
      .action(async (url: string, options: SharedOptions) => {
        await handlers.onDaemonAction('open', { action: 'open', url, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('back')
      .description('Navigate back in the current tab')
      .action(async (options: SharedOptions) => {
        await handlers.onDaemonAction('back', { action: 'back', session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('forward')
      .description('Navigate forward in the current tab')
      .action(async (options: SharedOptions) => {
        await handlers.onDaemonAction('forward', { action: 'forward', session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('reload')
      .description('Reload the current tab')
      .action(async (options: SharedOptions) => {
        await handlers.onDaemonAction('reload', { action: 'reload', session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('snapshot')
      .description('Capture a stable textual page snapshot')
      .option('-i, --interactive', 'interactive elements only')
      .action(async (options: SharedOptions & { interactive?: boolean | undefined }) => {
        await handlers.onDaemonAction(
          'snapshot',
          { action: 'snapshot', session: options.session, tabName: options.tabname, interactive: options.interactive ?? false, ...toLaunchInput(options) },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    program
      .command('click <target>')
      .description('Click a selector or @ref')
      .action(async (target: string, options: SharedOptions) => {
        await handlers.onDaemonAction('click', { action: 'click', target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('hover <target>')
      .description('Hover a selector or @ref')
      .action(async (target: string, options: SharedOptions) => {
        await handlers.onDaemonAction('hover', { action: 'hover', target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('fill <target> <text>')
      .description('Fill a selector or @ref')
      .action(async (target: string, text: string, options: SharedOptions) => {
        await handlers.onDaemonAction('fill', { action: 'fill', target, text, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('type <target> <text>')
      .description('Type into a selector or @ref without clearing')
      .action(async (target: string, text: string, options: SharedOptions) => {
        await handlers.onDaemonAction('type', { action: 'type', target, text, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('check <target>')
      .description('Check a checkbox or switch')
      .action(async (target: string, options: SharedOptions) => {
        await handlers.onDaemonAction('check', { action: 'check', target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('uncheck <target>')
      .description('Uncheck a checkbox or switch')
      .action(async (target: string, options: SharedOptions) => {
        await handlers.onDaemonAction('uncheck', { action: 'uncheck', target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('select <target> <value>')
      .description('Select an option by value')
      .action(async (target: string, value: string, options: SharedOptions) => {
        await handlers.onDaemonAction('select', { action: 'select', target, value, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('press <key>')
      .description('Press a keyboard key in the current tab')
      .action(async (key: string, options: SharedOptions) => {
        await handlers.onDaemonAction('press', { action: 'press', key, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('scroll <direction> [amount]')
      .description('Scroll the page by direction and amount')
      .action(async (direction: string, amount: string | undefined, options: SharedOptions) => {
        await handlers.onDaemonAction(
          'scroll',
          { action: 'scroll', direction, amount: amount ? parseInteger(amount) : undefined, session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    program
      .command('scrollintoview <target>')
      .description('Scroll a selector or @ref into view')
      .action(async (target: string, options: SharedOptions) => {
        await handlers.onDaemonAction(
          'scroll.intoView',
          { action: 'scroll.intoView', target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    program
      .command('screenshot [path]')
      .description('Save a screenshot')
      .action(async (filePath: string | undefined, options: SharedOptions) => {
        await handlers.onDaemonAction(
          'screenshot',
          { action: 'screenshot', path: filePath, session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    program
      .command('wait [target]')
      .description('Wait for a selector, text, or load state')
      .option('--text <text>', 'wait for visible text')
      .option('--load <state>', 'wait for page load state')
      .option('--timeout <ms>', 'wait timeout in milliseconds', parseInteger)
      .action(async (target: string | undefined, options: SharedOptions & { text?: string | undefined; load?: string | undefined; timeout?: number | undefined }) => {
        await handlers.onDaemonAction(
          'wait',
          {
            action: 'wait',
            ...(target ? { target } : {}),
            ...(options.text ? { text: options.text } : {}),
            ...(options.load ? { loadState: options.load } : {}),
            timeoutMs: options.timeout,
            session: options.session,
            tabName: options.tabname,
            ...toLaunchInput(options),
          },
          options,
        );
      }),
  );

  const getCommand = program.command('get').description('Read values from the current page');

  addSharedBrowserOptions(
    getCommand
      .command('url')
      .description('Get the current page URL')
      .action(async (options: SharedOptions) => {
        await handlers.onDaemonAction('get.url', { action: 'get.url', session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    getCommand
      .command('title')
      .description('Get the current page title')
      .action(async (options: SharedOptions) => {
        await handlers.onDaemonAction('get.title', { action: 'get.title', session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    getCommand
      .command('text <target>')
      .description('Get text from a selector or @ref')
      .action(async (target: string, options: SharedOptions) => {
        await handlers.onDaemonAction('get.text', { action: 'get.text', target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    getCommand
      .command('value <target>')
      .description('Get the current value from an input or select')
      .action(async (target: string, options: SharedOptions) => {
        await handlers.onDaemonAction('get.value', { action: 'get.value', target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  const sessionCommand = program.command('session').description('Manage daemon-owned browser sessions');
  addSharedOutputOptions(
    sessionCommand
      .command('list')
      .description('List running sessions')
      .action(async (options: OutputOptions) => {
        const shared: SharedOptions = { json: options.json, verbose: options.verbose };
        await handlers.onDaemonAction('session.list', { action: 'session.list' }, shared);
      }),
  );

  addSharedOutputOptions(
    sessionCommand
      .command('stop [name]')
      .description('Stop a running session')
      .action(async (name: string | undefined, options: OutputOptions) => {
        const shared: SharedOptions = { ...(name ? { session: name } : {}), json: options.json, verbose: options.verbose };
        await handlers.onDaemonAction('session.stop', { action: 'session.stop', ...(name ? { session: name } : {}) }, shared);
      }),
  );

  const tabCommand = program.command('tab').description('Manage named tabs within a session');
  addSharedBrowserOptions(
    tabCommand
      .command('list')
      .description('List tabs in the current session')
      .action(async (options: SharedOptions) => {
        await handlers.onDaemonAction('tab.list', { action: 'tab.list', session: options.session }, options);
      }),
  );

  addSharedBrowserOptions(
    tabCommand
      .command('new [url]')
      .description('Create a new named tab')
      .action(async (url: string | undefined, options: SharedOptions) => {
        await handlers.onDaemonAction('tab.new', { action: 'tab.new', session: options.session, tabName: options.tabname, url, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    tabCommand
      .command('close [target]')
      .description('Close a tab by name or zero-based index')
      .action(async (target: string | undefined, options: SharedOptions) => {
        await handlers.onDaemonAction('tab.close', { action: 'tab.close', session: options.session, target: target ?? options.tabname }, options);
      }),
  );

  return program;
}
