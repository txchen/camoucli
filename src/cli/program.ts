import { Command } from 'commander';

import packageJson from '../../package.json' with { type: 'json' };

import type { LaunchInput } from '../camoufox/config.js';

export interface SharedOptions {
  session: string;
  tabname: string;
  headless?: boolean | undefined;
  config?: string | undefined;
  configJson?: string | undefined;
  prefs?: string | undefined;
  prefsJson?: string | undefined;
  proxy?: string | undefined;
  locale?: string | undefined;
  timezone?: string | undefined;
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
  onPath: (options: OutputOptions) => Promise<void>;
  onVersion: (options: OutputOptions) => Promise<void>;
  onDoctor: (options: OutputOptions) => Promise<void>;
  onDaemonAction: (action: string, payload: Record<string, unknown>, options: SharedOptions) => Promise<void>;
}

function addSharedBrowserOptions(command: Command): Command {
  return command
    .option('--session <name>', 'session name', 'default')
    .option('--tabname <name>', 'tab name', 'main')
    .option('--headless', 'launch headless')
    .option('--config <path>', 'Camoufox config file path')
    .option('--config-json <json>', 'inline Camoufox config JSON')
    .option('--prefs <path>', 'Firefox prefs file path')
    .option('--prefs-json <json>', 'inline Firefox prefs JSON')
    .option('--proxy <url>', 'proxy URL')
    .option('--locale <locale>', 'locale override')
    .option('--timezone <timezone>', 'timezone override')
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
    configPath: options.config,
    configJson: options.configJson,
    prefsPath: options.prefs,
    prefsJson: options.prefsJson,
    proxy: options.proxy,
    locale: options.locale,
    timezone: options.timezone,
    width: options.width,
    height: options.height,
  };
}

export function createProgram(handlers: CliHandlers): Command {
  const program = new Command();
  program
    .name('camoucli')
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
      .command('fill <target> <text>')
      .description('Fill a selector or @ref')
      .action(async (target: string, text: string, options: SharedOptions) => {
        await handlers.onDaemonAction('fill', { action: 'fill', target, text, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
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
      .command('wait <target>')
      .description('Wait for a selector or @ref')
      .option('--timeout <ms>', 'wait timeout in milliseconds', parseInteger)
      .action(async (target: string, options: SharedOptions & { timeout?: number | undefined }) => {
        await handlers.onDaemonAction(
          'wait',
          { action: 'wait', target, timeoutMs: options.timeout, session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
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

  const sessionCommand = program.command('session').description('Manage daemon-owned browser sessions');
  addSharedOutputOptions(
    sessionCommand
      .command('list')
      .description('List running sessions')
      .action(async (options: OutputOptions) => {
        const shared: SharedOptions = { session: 'default', tabname: 'main', json: options.json, verbose: options.verbose };
        await handlers.onDaemonAction('session.list', { action: 'session.list' }, shared);
      }),
  );

  addSharedOutputOptions(
    sessionCommand
      .command('stop [name]')
      .description('Stop a running session')
      .action(async (name: string | undefined, options: OutputOptions) => {
        const shared: SharedOptions = { session: name ?? 'default', tabname: 'main', json: options.json, verbose: options.verbose };
        await handlers.onDaemonAction('session.stop', { action: 'session.stop', session: name ?? 'default' }, shared);
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
