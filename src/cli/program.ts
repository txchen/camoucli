import { Command, Option } from 'commander';
import { stdin as defaultStdin } from 'node:process';
import type { Readable } from 'node:stream';

import packageJson from '../../package.json' with { type: 'json' };

import type { LaunchInput } from '../camoufox/config.js';
import { UnsupportedCommandError, ValidationError } from '../util/errors.js';

export interface SharedOptions {
  session?: string | undefined;
  tabname?: string | undefined;
  headless?: boolean | undefined;
  headed?: boolean | undefined;
  browser?: string | undefined;
  config?: string | undefined;
  configJson?: string | undefined;
  prefs?: string | undefined;
  prefsJson?: string | undefined;
  fingerprint?: string | undefined;
  fingerprintJson?: string | undefined;
  preset?: string[] | undefined;
  proxy?: string | undefined;
  proxyBypass?: string | undefined;
  headers?: string | undefined;
  userAgent?: string | undefined;
  ignoreHttpsErrors?: boolean | undefined;
  colorScheme?: 'dark' | 'light' | 'no-preference' | undefined;
  reducedMotion?: 'reduce' | 'no-preference' | undefined;
  initScript?: string[] | undefined;
  state?: string | undefined;
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
  cdp?: string | undefined;
  provider?: string | undefined;
  executablePath?: string | undefined;
  engine?: string | undefined;
  extension?: string | undefined;
  restorePolicy?: string | undefined;
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
  onSessionCurrent?: (options: SharedOptions) => Promise<void>;
  onSessionId?: (options: OutputOptions & { scope?: 'worktree' | 'cwd' | 'git-root' | undefined; prefix?: string | undefined }) => Promise<void>;
  onSessionInfo?: (options: SharedOptions) => Promise<void>;
  onDaemonStop?: (options: OutputOptions) => Promise<void>;
  onDaemonRestart?: (options: OutputOptions) => Promise<void>;
  onDaemonCleanup?: (options: OutputOptions) => Promise<void>;
}

export interface ProgramOptions {
  quietErrors?: boolean | undefined;
  stdin?: Readable | undefined;
}

interface EvalOptions extends SharedOptions {
  base64?: string | undefined;
  stdin?: boolean | undefined;
}

interface TypeOptions extends SharedOptions {
  clear?: boolean | undefined;
  delay?: number | undefined;
}

interface ClickOptions extends SharedOptions {
  newTab?: boolean | undefined;
  label?: string | undefined;
  timeout?: number | undefined;
}

interface TabNewOptions extends SharedOptions {
  label?: string | undefined;
}

interface ScreenshotOptions extends SharedOptions {
  selector?: string | undefined;
  full?: boolean | undefined;
  viewport?: boolean | undefined;
  format?: 'png' | 'jpeg' | undefined;
  quality?: number | undefined;
}

interface DiffSnapshotOptions extends SharedOptions {
  baseline?: string | undefined;
  text?: string | undefined;
  interactive?: boolean | undefined;
  path?: string | undefined;
}

interface DiffScreenshotOptions extends SharedOptions {
  baseline?: string | undefined;
  selector?: string | undefined;
  path?: string | undefined;
  full?: boolean | undefined;
  viewport?: boolean | undefined;
  format?: 'png' | 'jpeg' | undefined;
  quality?: number | undefined;
}

interface DiffUrlOptions extends SharedOptions {
  mode?: 'snapshot' | 'screenshot' | undefined;
  path?: string | undefined;
  full?: boolean | undefined;
  viewport?: boolean | undefined;
  format?: 'png' | 'jpeg' | undefined;
  quality?: number | undefined;
}

interface FindOptions extends SharedOptions {
  action?: 'click' | 'fill' | 'check' | 'hover' | 'text' | undefined;
  value?: string | undefined;
  name?: string | undefined;
  exact?: boolean | undefined;
}

interface DownloadOptions extends SharedOptions {
  timeout?: number | undefined;
}

interface WaitOptions extends SharedOptions {
  text?: string | undefined;
  load?: string | undefined;
  url?: string | undefined;
  fn?: string | undefined;
  download?: boolean | undefined;
  path?: string | undefined;
  timeout?: number | undefined;
}

interface ReadOptions extends SharedOptions {
  raw?: boolean | undefined;
  outline?: boolean | undefined;
  filter?: string | undefined;
  timeout?: number | undefined;
}

interface NetworkRouteOptions extends SharedOptions {
  abort?: boolean | undefined;
  body?: string | undefined;
  resourceType?: string[] | undefined;
  status?: number | undefined;
  contentType?: string | undefined;
}

interface NetworkRequestsOptions extends SharedOptions {
  clear?: boolean | undefined;
  filter?: string | undefined;
  type?: string[] | undefined;
  resourceType?: string[] | undefined;
  method?: string | undefined;
  status?: number | undefined;
}

interface DebugListOptions extends SharedOptions {
  clear?: boolean | undefined;
}

interface HighlightOptions extends SharedOptions {
  duration?: number | undefined;
}

interface TraceStartOptions extends SharedOptions {
  screenshots?: boolean | undefined;
  noScreenshots?: boolean | undefined;
  snapshots?: boolean | undefined;
  noSnapshots?: boolean | undefined;
  sources?: boolean | undefined;
}

function collectValues(value: string, previous: string[] = []): string[] {
  return [...previous, ...value.split(',').map((item) => item.trim()).filter(Boolean)];
}

function collectRepeatedValue(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

function parseNumber(value: string): number {
  return Number(value);
}

function normalizeSameSiteOption(value: string): 'Strict' | 'Lax' | 'None' {
  const normalized = value.toLowerCase();
  if (normalized === 'strict') {
    return 'Strict';
  }
  if (normalized === 'lax') {
    return 'Lax';
  }
  if (normalized === 'none') {
    return 'None';
  }
  throw new Error('same-site must be Strict, Lax, or None');
}

function addSharedBrowserOptions(command: Command): Command {
  return command
    .option('--session <name>', 'session name')
    .option('--tabname <name>', 'tab name')
    .option('--headless', 'launch headless')
    .option('--headed', 'launch headed (alias for --headless false)')
    .option('--browser <version>', 'specific installed browser version')
    .option('--config <path>', 'Camoufox config file path')
    .option('--config-json <json>', 'inline Camoufox config JSON')
    .option('--prefs <path>', 'Firefox prefs file path')
    .option('--prefs-json <json>', 'inline Firefox prefs JSON')
    .option('--fingerprint <path>', 'fingerprint helper JSON file path')
    .option('--fingerprint-json <json>', 'inline fingerprint helper JSON')
    .option('--preset <name>', 'apply a built-in preset (repeat or use comma-separated values)', collectValues)
    .option('--proxy <url>', 'proxy URL')
    .option('--proxy-bypass <hosts>', 'proxy bypass host list')
    .option('--headers <json>', 'extra HTTP headers JSON object')
    .option('--user-agent <ua>', 'user agent override')
    .option('--ignore-https-errors', 'ignore HTTPS certificate errors')
    .option('--color-scheme <value>', 'preferred color scheme: dark, light, or no-preference')
    .option('--reduced-motion <value>', 'preferred reduced motion: reduce or no-preference')
    .option('--init-script <path>', 'register an init script before navigation', collectRepeatedValue)
    .option('--state <path-or-name>', 'load Playwright storage-state JSON at launch')
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
    .addOption(new Option('--cdp <target>', 'unsupported CDP attach target').hideHelp())
    .addOption(new Option('--provider <name>', 'unsupported provider browser mode').hideHelp())
    .addOption(new Option('--executable-path <path>', 'unsupported arbitrary browser executable').hideHelp())
    .addOption(new Option('--engine <name>', 'unsupported browser engine switch').hideHelp())
    .addOption(new Option('--extension <path>', 'unsupported extension loading').hideHelp())
    .addOption(new Option('--restore-policy <policy>', 'unsupported Agent Browser restore policy').hideHelp())
    .option('--width <width>', 'window width', parseInteger)
    .option('--height <height>', 'window height', parseInteger)
    .option('--json', 'JSON output')
    .option('--verbose', 'verbose output')
    .hook('preAction', (_thisCommand, actionCommand) => {
      assertNoUnsupportedMigrationOptions(mergedCommandOptions<SharedOptions>(actionCommand));
    });
}

function addSharedOutputOptions(command: Command): Command {
  return command.option('--json', 'JSON output').option('--verbose', 'verbose output');
}

function inheritedSharedOptions(options: OutputOptions & { session?: string | undefined; parent?: Command | undefined; opts?: () => OutputOptions & { session?: string | undefined } }): SharedOptions {
  const ownOptions = typeof options.opts === 'function' ? options.opts() : options;
  const parentOptions = options.parent?.opts<OutputOptions & { session?: string | undefined }>() ?? {};
  return {
    session: ownOptions.session ?? parentOptions.session,
    json: ownOptions.json ?? parentOptions.json,
    verbose: ownOptions.verbose ?? parentOptions.verbose,
  };
}

export function parseInteger(value: string): number {
  return Number.parseInt(value, 10);
}

function screenshotTargetAndPath(
  targetOrPath: string | undefined,
  filePath: string | undefined,
  selector: string | undefined,
): { target?: string | undefined; path?: string | undefined } {
  if (selector) {
    return { target: selector, ...(filePath ?? targetOrPath ? { path: filePath ?? targetOrPath } : {}) };
  }

  if (!targetOrPath) {
    return {};
  }

  if (filePath) {
    return { target: targetOrPath, path: filePath };
  }

  const selectorLike = /^(?:@|#|\.|\[|text=)/u.test(targetOrPath);
  const pathLike = /(?:^\.{0,2}\/|\/|\\|\.(?:png|jpe?g)$)/iu.test(targetOrPath);
  return selectorLike && !pathLike ? { target: targetOrPath } : { path: targetOrPath };
}

function normalizeFindAction(options: FindOptions): 'click' | 'fill' | 'check' | 'hover' | 'text' {
  return options.action ?? 'click';
}

function parseJsonObject(value: string, label: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new ValidationError(`${label} must be valid JSON.`, undefined, error);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ValidationError(`${label} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

function parseStringMap(value: string, label: string): Record<string, string> {
  const parsed = parseJsonObject(value, label);
  if (!Object.values(parsed).every((item) => typeof item === 'string')) {
    throw new ValidationError(`${label} must be a JSON object with string values.`);
  }
  return parsed as Record<string, string>;
}

function parseBooleanInput(value: string): boolean {
  if (['true', '1', 'yes', 'on'].includes(value.toLowerCase())) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(value.toLowerCase())) {
    return false;
  }
  throw new ValidationError('Expected a boolean value: true or false.');
}

function normalizeNetworkRoute(options: NetworkRouteOptions): { abort?: boolean | undefined; body?: string | undefined } {
  if (options.abort && options.body !== undefined) {
    throw new ValidationError('network route accepts either --abort or --body, not both.');
  }
  if (!options.abort && options.body === undefined) {
    throw new ValidationError('network route requires --abort or --body.');
  }
  return {
    ...(options.abort ? { abort: true } : {}),
    ...(options.body !== undefined ? { body: options.body } : {}),
  };
}

function readMode(options: ReadOptions): 'text' | 'raw' | 'outline' {
  if (options.raw && options.outline) {
    throw new ValidationError('Choose only one read mode: --raw or --outline.');
  }
  return options.raw ? 'raw' : options.outline ? 'outline' : 'text';
}

function requireDiffBaseline(options: DiffSnapshotOptions | DiffScreenshotOptions, command: string): void {
  if ('text' in options && options.baseline && options.text !== undefined) {
    throw new ValidationError(`${command} accepts either --baseline or --text, not both.`);
  }
  if (!options.baseline && (!('text' in options) || options.text === undefined)) {
    throw new ValidationError(`${command} requires --baseline <path>${'text' in options ? ' or --text <value>' : ''}.`);
  }
}

function throwUnsupportedCommand(command: string, message: string, alternative: string): never {
  throw new UnsupportedCommandError(message, { command, alternative });
}

function assertNoUnsupportedMigrationOptions(options: SharedOptions): void {
  const unsupported = [
    options.cdp ? { flag: '--cdp', value: options.cdp } : undefined,
    options.provider ? { flag: '--provider', value: options.provider } : undefined,
    options.executablePath ? { flag: '--executable-path', value: options.executablePath } : undefined,
    options.engine ? { flag: '--engine', value: options.engine } : undefined,
    options.extension ? { flag: '--extension', value: options.extension } : undefined,
    options.restorePolicy ? { flag: '--restore-policy', value: options.restorePolicy } : undefined,
  ].filter((item): item is { flag: string; value: string } => Boolean(item));
  if (unsupported.length === 0) {
    return;
  }

  const flags = unsupported.map((item) => item.flag).join(', ');
  throw new UnsupportedCommandError(
    `Unsupported compatibility flag${unsupported.length === 1 ? '' : 's'} ${flags}. CDP/provider/browser-engine surfaces are outside Camoucli local Camoufox daemon scope.`,
    {
      flags: unsupported,
      alternative: 'Use camou open with managed local Camoufox sessions and supported launch options such as --browser, --proxy, --headers, --user-agent, --init-script, or --state.',
    },
  );
}

export function toLaunchInput(options: SharedOptions): LaunchInput {
  return {
    headless: options.headed === true ? false : options.headless,
    browser: options.browser,
    configPath: options.config,
    configJson: options.configJson,
    prefsPath: options.prefs,
    prefsJson: options.prefsJson,
    fingerprintPath: options.fingerprint,
    fingerprintJson: options.fingerprintJson,
    preset: options.preset,
    proxy: options.proxy,
    proxyBypass: options.proxyBypass,
    headers: options.headers,
    userAgent: options.userAgent,
    ignoreHTTPSErrors: options.ignoreHttpsErrors,
    colorScheme: options.colorScheme,
    reducedMotion: options.reducedMotion,
    initScripts: options.initScript,
    state: options.state,
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

const SUPPORTED_NAVIGATION_SCHEME_PATTERN = /^(?:https?|about|data|file|chrome|chrome-extension):/i;
const EXPLICIT_SCHEME_PATTERN = /^([a-z][a-z0-9+.-]*):(?!\d)/i;

export function normalizeNavigationUrl(input: string): string {
  const url = input.trim();
  if (!url) {
    throw new ValidationError('URL is required.');
  }

  if (SUPPORTED_NAVIGATION_SCHEME_PATTERN.test(url)) {
    return url;
  }

  const explicitScheme = EXPLICIT_SCHEME_PATTERN.exec(url)?.[1];
  if (explicitScheme) {
    throw new ValidationError(
      `Unsupported URL scheme "${explicitScheme}". Supported explicit schemes: http, https, about, data, file, chrome, chrome-extension.`,
    );
  }

  return `https://${url}`;
}

function invalidBase64Error(): ValidationError {
  return new ValidationError('Invalid base64 eval script.');
}

export function decodeEvalBase64(input: string): string {
  const normalized = input.replace(/\s+/g, '');
  if (!normalized || normalized.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw invalidBase64Error();
  }

  const decoded = Buffer.from(normalized, 'base64');
  const canonical = decoded.toString('base64').replace(/=+$/u, '');
  if (normalized.replace(/=+$/u, '') !== canonical) {
    throw invalidBase64Error();
  }

  const script = decoded.toString('utf8');
  if (!script) {
    throw new ValidationError('Eval base64 input decoded to an empty script.');
  }

  return script;
}

async function readStream(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }

  return Buffer.concat(chunks).toString('utf8');
}

function parsedOptions<T>(options: T): T {
  const maybeCommand = options as T & { opts?: () => unknown };
  return typeof maybeCommand.opts === 'function' ? maybeCommand.opts() as T : options;
}

function mergedCommandOptions<T>(command: Command): T {
  return {
    ...(command.parent?.opts() ?? {}),
    ...command.opts(),
  } as T;
}

async function resolveEvalExpression(expression: string | undefined, options: EvalOptions, stdin: Readable): Promise<string> {
  const modeCount = [expression !== undefined, options.base64 !== undefined, options.stdin === true].filter(Boolean).length;
  if (modeCount === 0) {
    throw new ValidationError('eval requires an expression, --base64, or --stdin.');
  }
  if (modeCount > 1) {
    throw new ValidationError('Choose exactly one eval input mode: expression, --base64, or --stdin.');
  }

  if (options.base64 !== undefined) {
    return decodeEvalBase64(options.base64);
  }

  if (options.stdin === true) {
    const script = await readStream(stdin);
    if (!script) {
      throw new ValidationError('Eval stdin input is empty.');
    }
    return script;
  }

  return expression ?? '';
}

export function createProgram(handlers: CliHandlers, options?: ProgramOptions): Command {
  const program = new Command();
  const stdin = options?.stdin ?? defaultStdin;
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
      .command('eval [expression]')
      .description('Evaluate JavaScript in the current tab')
      .option('-b, --base64 <script>', 'base64-encoded JavaScript to evaluate')
      .option('--stdin', 'read JavaScript to evaluate from stdin')
      .action(async (expression: string | undefined, options: EvalOptions) => {
        const resolvedExpression = await resolveEvalExpression(expression, options, stdin);
        const shared: SharedOptions = { ...options, json: options.json, verbose: options.verbose };
        await handlers.onDaemonAction('eval', { action: 'eval', expression: resolvedExpression, session: options.session, tabName: options.tabname }, shared);
      }),
  );

  const cookiesCommand = program.command('cookies').description('Manage browser cookies for a session');
  cookiesCommand
    .action(async () => {
      await handlers.onDaemonAction('cookies.get', { action: 'cookies.get' }, {});
    });

  cookiesCommand
    .command('get [url...]')
    .description('List cookies from the current session')
    .option('--session <name>', 'session name')
    .option('--json', 'JSON output')
    .option('--verbose', 'verbose output')
    .action(async (urls: string[] | undefined, options: OutputOptions & { session?: string | undefined }) => {
      const shared = inheritedSharedOptions(options);
      await handlers.onDaemonAction('cookies.get', {
        action: 'cookies.get',
        ...(urls && urls.length > 0 ? { urls } : {}),
        ...(shared.session ? { session: shared.session } : {}),
      }, shared);
    });

  addSharedBrowserOptions(
    cookiesCommand
      .command('set [name] [value]')
      .description('Set one cookie, or import cURL-shaped cookie input')
      .option('--url <url>', 'cookie URL scope')
      .option('--domain <domain>', 'cookie domain scope')
      .option('--path <path>', 'cookie path scope')
      .option('--expires <seconds>', 'cookie expiration epoch seconds', parseNumber)
      .option('--http-only', 'set HttpOnly')
      .option('--secure', 'set Secure')
      .option('--same-site <value>', 'SameSite value: Strict, Lax, or None', normalizeSameSiteOption)
      .option('--curl <file>', 'import JSON array, cURL command, or Cookie header from file')
      .action(async (name: string | undefined, value: string | undefined, options: SharedOptions & {
        url?: string | undefined;
        domain?: string | undefined;
        path?: string | undefined;
        expires?: number | undefined;
        httpOnly?: boolean | undefined;
        secure?: boolean | undefined;
        sameSite?: 'Strict' | 'Lax' | 'None' | undefined;
        curl?: string | undefined;
      }) => {
        await handlers.onDaemonAction('cookies.set', {
          action: 'cookies.set',
          name,
          value,
          url: options.url,
          domain: options.domain,
          path: options.path,
          expires: options.expires,
          httpOnly: options.httpOnly,
          secure: options.secure,
          sameSite: options.sameSite,
          curlPath: options.curl,
          session: options.session,
          tabName: options.tabname,
          ...toLaunchInput(options),
        }, options);
      }),
  );

  cookiesCommand
    .command('clear')
    .description('Clear cookies from the current session')
    .option('--session <name>', 'session name')
    .option('--json', 'JSON output')
    .option('--verbose', 'verbose output')
    .action(async (options: OutputOptions & { session?: string | undefined }) => {
      const shared = inheritedSharedOptions(options);
      await handlers.onDaemonAction('cookies.clear', { action: 'cookies.clear', ...(shared.session ? { session: shared.session } : {}) }, shared);
    });

  cookiesCommand
    .command('export [path]')
    .description('Export cookies from the current session')
    .option('--session <name>', 'session name')
    .option('--json', 'JSON output')
    .option('--verbose', 'verbose output')
    .action(async (filePath: string | undefined, options: OutputOptions & { session?: string | undefined }) => {
      const shared = inheritedSharedOptions(options);
      await handlers.onDaemonAction('cookies.export', { action: 'cookies.export', ...(filePath ? { path: filePath } : {}), ...(shared.session ? { session: shared.session } : {}) }, shared);
    });

  cookiesCommand
    .command('import <path>')
    .description('Import cookies into the current session')
    .option('--session <name>', 'session name')
    .option('--json', 'JSON output')
    .option('--verbose', 'verbose output')
    .action(async (filePath: string, options: OutputOptions & { session?: string | undefined }) => {
      const shared = inheritedSharedOptions(options);
      await handlers.onDaemonAction('cookies.import', { action: 'cookies.import', path: filePath, ...(shared.session ? { session: shared.session } : {}) }, shared);
    });

  const storageCommand = program.command('storage').description('Manage origin localStorage and sessionStorage');
  const addStorageCommand = (name: 'local' | 'session', action: 'storage.local' | 'storage.session'): void => {
    const command = storageCommand.command(name).description(`Manage current-origin ${name} storage`);
    addSharedBrowserOptions(
      command
        .command('get [key]')
        .description('Read storage values')
        .action(async (key: string | undefined, options: SharedOptions) => {
          await handlers.onDaemonAction(action, { action, operation: 'get', key, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
        }),
    );
    addSharedBrowserOptions(
      command
        .command('set <key> <value>')
        .description('Set a string storage value')
        .action(async (key: string, value: string, options: SharedOptions) => {
          await handlers.onDaemonAction(action, { action, operation: 'set', key, value, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
        }),
    );
    addSharedBrowserOptions(
      command
        .command('clear [key]')
        .description('Clear storage values')
        .action(async (key: string | undefined, options: SharedOptions) => {
          await handlers.onDaemonAction(action, { action, operation: 'clear', key, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
        }),
    );
  };
  addStorageCommand('local', 'storage.local');
  addStorageCommand('session', 'storage.session');

  const stateCommand = program.command('state').description('Manage portable Playwright storage-state snapshots');
  addSharedOutputOptions(
    stateCommand
      .command('save <path-or-name>')
      .description('Save current session storage state')
      .option('--session <name>', 'session name')
      .action(async (pathOrName: string, options: OutputOptions & { session?: string | undefined }) => {
        const shared: SharedOptions = { session: options.session, json: options.json, verbose: options.verbose };
        await handlers.onDaemonAction('state.save', { action: 'state.save', path: pathOrName, ...(options.session ? { session: options.session } : {}) }, shared);
      }),
  );
  addSharedOutputOptions(
    stateCommand
      .command('load <path-or-name>')
      .description('Merge a storage-state snapshot into the running session')
      .option('--session <name>', 'session name')
      .action(async (pathOrName: string, options: OutputOptions & { session?: string | undefined }) => {
        const shared: SharedOptions = { session: options.session, json: options.json, verbose: options.verbose };
        await handlers.onDaemonAction('state.load', { action: 'state.load', path: pathOrName, ...(options.session ? { session: options.session } : {}) }, shared);
      }),
  );
  addSharedOutputOptions(
    stateCommand
      .command('list')
      .description('List managed storage-state snapshots')
      .action(async (options: OutputOptions) => {
        await handlers.onDaemonAction('state.list', { action: 'state.list' }, { json: options.json, verbose: options.verbose });
      }),
  );
  addSharedOutputOptions(
    stateCommand
      .command('show <path-or-name>')
      .description('Show one storage-state snapshot')
      .action(async (pathOrName: string, options: OutputOptions) => {
        await handlers.onDaemonAction('state.show', { action: 'state.show', path: pathOrName }, { json: options.json, verbose: options.verbose });
      }),
  );
  addSharedOutputOptions(
    stateCommand
      .command('clear [path-or-name]')
      .description('Remove one managed snapshot, or all with --all')
      .option('--all', 'remove all managed snapshots')
      .action(async (pathOrName: string | undefined, options: OutputOptions & { all?: boolean | undefined }) => {
        await handlers.onDaemonAction('state.clear', { action: 'state.clear', ...(pathOrName ? { path: pathOrName } : {}), all: options.all ?? false }, { json: options.json, verbose: options.verbose });
      }),
  );
  addSharedOutputOptions(
    stateCommand
      .command('clean')
      .description('Remove invalid managed storage-state snapshots')
      .action(async (options: OutputOptions) => {
        await handlers.onDaemonAction('state.clean', { action: 'state.clean' }, { json: options.json, verbose: options.verbose });
      }),
  );
  addSharedOutputOptions(
    stateCommand
      .command('rename <from> <to>')
      .description('Rename a managed storage-state snapshot')
      .action(async (from: string, to: string, options: OutputOptions) => {
        await handlers.onDaemonAction('state.rename', { action: 'state.rename', from, to }, { json: options.json, verbose: options.verbose });
      }),
  );

  const networkCommand = program.command('network').description('Inspect and control session network activity');
  addSharedBrowserOptions(
    networkCommand
      .command('route <url>')
      .description('Route matching requests with abort or fulfill behavior')
      .option('--abort', 'abort matching requests')
      .option('--body <body>', 'fulfill matching requests with this response body')
      .option('--resource-type <type>', 'resource type filter (repeat or comma-separated)', collectValues)
      .option('--status <code>', 'fulfill response status', parseInteger)
      .option('--content-type <value>', 'fulfill response content type')
      .action(async (url: string, options: NetworkRouteOptions) => {
        const behavior = normalizeNetworkRoute(options);
        await handlers.onDaemonAction(
          'network.route',
          {
            action: 'network.route',
            url,
            ...behavior,
            ...(options.resourceType ? { resourceTypes: options.resourceType } : {}),
            ...(options.status !== undefined ? { status: options.status } : {}),
            ...(options.contentType ? { contentType: options.contentType } : {}),
            session: options.session,
            tabName: options.tabname,
            ...toLaunchInput(options),
          },
          options,
        );
      }),
  );
  addSharedBrowserOptions(
    networkCommand
      .command('unroute [url]')
      .description('Remove network routes for the current session')
      .action(async (url: string | undefined, options: SharedOptions) => {
        await handlers.onDaemonAction('network.unroute', { action: 'network.unroute', session: options.session, ...(url ? { url } : {}) }, options);
      }),
  );
  addSharedBrowserOptions(
    networkCommand
      .command('requests')
      .description('List buffered network requests')
      .option('--clear', 'clear the request buffer after listing')
      .option('--filter <text>', 'filter by URL, method, resource type, or status')
      .option('--type <type>', 'resource type filter (repeat or comma-separated)', collectValues)
      .option('--resource-type <type>', 'resource type filter (repeat or comma-separated)', collectValues)
      .option('--method <method>', 'HTTP method filter')
      .option('--status <code>', 'HTTP status filter', parseInteger)
      .action(async (options: NetworkRequestsOptions) => {
        const resourceTypes = [...(options.type ?? []), ...(options.resourceType ?? [])];
        await handlers.onDaemonAction(
          'network.requests',
          {
            action: 'network.requests',
            session: options.session,
            clear: options.clear ?? false,
            ...(options.filter ? { filter: options.filter } : {}),
            ...(resourceTypes.length > 0 ? { resourceTypes } : {}),
            ...(options.method ? { method: options.method } : {}),
            ...(options.status !== undefined ? { status: options.status } : {}),
          },
          options,
        );
      }),
  );
  addSharedBrowserOptions(
    networkCommand
      .command('request <requestId>')
      .description('Show details for one buffered network request')
      .action(async (requestId: string, options: SharedOptions) => {
        await handlers.onDaemonAction('network.request', { action: 'network.request', session: options.session, requestId }, options);
      }),
  );
  const networkHarCommand = networkCommand.command('har').description('Capture a portable in-memory HAR artifact');
  addSharedBrowserOptions(
    networkHarCommand
      .command('start')
      .description('Start HAR capture for the current session')
      .action(async (options: SharedOptions) => {
        await handlers.onDaemonAction('network.har.start', { action: 'network.har.start', session: options.session }, options);
      }),
  );
  addSharedBrowserOptions(
    networkHarCommand
      .command('stop [path]')
      .description('Stop HAR capture and write a HAR 1.2 JSON file')
      .action(async (filePath: string | undefined, options: SharedOptions) => {
        await handlers.onDaemonAction('network.har.stop', { action: 'network.har.stop', session: options.session, ...(filePath ? { path: filePath } : {}) }, options);
      }),
  );

  const addCloseCommand = (name: string, description: string): void => {
    addSharedOutputOptions(
      program
        .command(name)
        .description(description)
        .option('--session <name>', 'session name')
        .option('--all', 'stop all running sessions')
        .action(async (options: OutputOptions & { session?: string | undefined; all?: boolean | undefined }) => {
          const shared: SharedOptions = { session: options.session, json: options.json, verbose: options.verbose };
          if (options.all) {
            await handlers.onDaemonAction('session.stopAll', { action: 'session.stopAll' }, shared);
            return;
          }
          await handlers.onDaemonAction('session.stop', { action: 'session.stop', ...(options.session ? { session: options.session } : {}) }, shared);
        }),
    );
  };

  addCloseCommand('close', 'Stop the current session, or all running sessions with --all');
  addCloseCommand('quit', 'Alias for close: stop the current session');
  addCloseCommand('exit', 'Alias for close: stop the current session');

  const addNavigationCommand = (name: string, description: string): void => {
    addSharedBrowserOptions(
      program
      .command(name === 'open' ? `${name} [url]` : `${name} <url>`)
      .description(description)
        .action(async (url: string | undefined, options: SharedOptions) => {
          await handlers.onDaemonAction(
            'open',
            { action: 'open', url: url ? normalizeNavigationUrl(url) : undefined, session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
            options,
          );
        }),
    );
  };

  addNavigationCommand('open', 'Open a URL in the current tab');
  addNavigationCommand('goto', 'Navigate the current tab to a URL');
  addNavigationCommand('navigate', 'Navigate the current tab to a URL');

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
      .option('--new-tab', 'wait for and switch to a newly opened tab')
      .option('--label <name>', 'tab name to assign when --new-tab opens a page')
      .option('--timeout <ms>', 'new-tab wait timeout in milliseconds', parseInteger)
      .action(async (target: string, options: ClickOptions) => {
        await handlers.onDaemonAction(
          'click',
          {
            action: 'click',
            target,
            session: options.session,
            tabName: options.tabname,
            newTab: options.newTab ?? false,
            label: options.label,
            timeoutMs: options.timeout,
            ...toLaunchInput(options),
          },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    program
      .command('download <target> <path>')
      .description('Click a selector or @ref and save the triggered download')
      .option('--timeout <ms>', 'download wait timeout in milliseconds', parseInteger)
      .action(async (target: string, filePath: string, options: DownloadOptions) => {
        await handlers.onDaemonAction(
          'download',
          { action: 'download', target, path: filePath, timeoutMs: options.timeout, session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    program
      .command('dblclick <target>')
      .description('Double-click a selector or @ref')
      .action(async (target: string, options: SharedOptions) => {
        await handlers.onDaemonAction('dblclick', { action: 'dblclick', target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
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
      .command('focus <target>')
      .description('Focus a selector or @ref')
      .action(async (target: string, options: SharedOptions) => {
        await handlers.onDaemonAction('focus', { action: 'focus', target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
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
      .option('--clear', 'clear the field before typing')
      .option('--delay <ms>', 'delay between key presses in milliseconds', parseInteger)
      .action(async (target: string, text: string, options: TypeOptions) => {
        await handlers.onDaemonAction(
          'type',
          {
            action: 'type',
            target,
            text,
            clear: options.clear ?? false,
            delayMs: options.delay,
            session: options.session,
            tabName: options.tabname,
            ...toLaunchInput(options),
          },
          options,
        );
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
      .command('select <target> <value...>')
      .description('Select one or more options by value')
      .action(async (target: string, values: string[], options: SharedOptions) => {
        const value: string | string[] = values.length === 1 ? values[0]! : values;
        await handlers.onDaemonAction('select', { action: 'select', target, value, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  const addPressCommand = (name: string, description: string): void => {
    addSharedBrowserOptions(
      program
        .command(`${name} <key>`)
        .description(description)
        .action(async (key: string, options: SharedOptions) => {
          await handlers.onDaemonAction('press', { action: 'press', key, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
        }),
    );
  };

  addPressCommand('press', 'Press a keyboard key in the current tab');
  addPressCommand('key', 'Alias for press: press a keyboard key in the current tab');

  addSharedBrowserOptions(
    program
      .command('keydown <key>')
      .description('Press and hold a keyboard key in the current tab')
      .action(async (key: string, options: SharedOptions) => {
        await handlers.onDaemonAction('keyboard.down', { action: 'keyboard.down', key, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('keyup <key>')
      .description('Release a keyboard key in the current tab')
      .action(async (key: string, options: SharedOptions) => {
        await handlers.onDaemonAction('keyboard.up', { action: 'keyboard.up', key, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  const keyboardCommand = program.command('keyboard').description('Send keyboard input to the current tab');
  addSharedBrowserOptions(
    keyboardCommand
      .command('type <text>')
      .description('Type text with the page keyboard')
      .option('--delay <ms>', 'delay between key presses in milliseconds', parseInteger)
      .action(async (text: string, options: SharedOptions & { delay?: number | undefined }) => {
        await handlers.onDaemonAction(
          'keyboard.type',
          { action: 'keyboard.type', text, delayMs: options.delay, session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    keyboardCommand
      .command('inserttext <text>')
      .alias('insert-text')
      .description('Insert text with the page keyboard')
      .action(async (text: string, options: SharedOptions) => {
        await handlers.onDaemonAction(
          'keyboard.insertText',
          { action: 'keyboard.insertText', text, session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
          options,
        );
      }),
  );

  const mouseCommand = program.command('mouse').description('Send mouse input to the current tab');
  addSharedBrowserOptions(
    mouseCommand
      .command('move <x> <y>')
      .description('Move the mouse to page coordinates')
      .action(async (x: string, y: string, options: SharedOptions) => {
        await handlers.onDaemonAction(
          'mouse.move',
          { action: 'mouse.move', x: parseInteger(x), y: parseInteger(y), session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    mouseCommand
      .command('down [button]')
      .description('Press a mouse button')
      .action(async (button: string | undefined, options: SharedOptions) => {
        await handlers.onDaemonAction(
          'mouse.down',
          { action: 'mouse.down', ...(button ? { button } : {}), session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    mouseCommand
      .command('up [button]')
      .description('Release a mouse button')
      .action(async (button: string | undefined, options: SharedOptions) => {
        await handlers.onDaemonAction(
          'mouse.up',
          { action: 'mouse.up', ...(button ? { button } : {}), session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    mouseCommand
      .command('wheel [deltaY] [deltaX]')
      .description('Scroll the mouse wheel')
      .action(async (deltaY: string | undefined, deltaX: string | undefined, options: SharedOptions) => {
        await handlers.onDaemonAction(
          'mouse.wheel',
          {
            action: 'mouse.wheel',
            deltaX: deltaX ? parseInteger(deltaX) : 0,
            deltaY: deltaY ? parseInteger(deltaY) : 300,
            session: options.session,
            tabName: options.tabname,
            ...toLaunchInput(options),
          },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    program
      .command('scroll [direction] [amount]')
      .description('Scroll the page or a selector by direction and amount')
      .option('--selector <target>', 'selector or @ref to scroll')
      .action(async (direction: string | undefined, amount: string | undefined, options: SharedOptions & { selector?: string | undefined }) => {
        await handlers.onDaemonAction(
          'scroll',
          {
            action: 'scroll',
            ...(direction ? { direction } : {}),
            amount: amount ? parseInteger(amount) : undefined,
            ...(options.selector ? { target: options.selector } : {}),
            session: options.session,
            tabName: options.tabname,
            ...toLaunchInput(options),
          },
          options,
        );
      }),
  );

  const addScrollIntoViewCommand = (name: string, description: string): void => {
    addSharedBrowserOptions(
      program
        .command(`${name} <target>`)
        .description(description)
        .action(async (target: string, options: SharedOptions) => {
          await handlers.onDaemonAction(
            'scroll.intoView',
            { action: 'scroll.intoView', target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
            options,
          );
        }),
    );
  };

  addScrollIntoViewCommand('scrollintoview', 'Scroll a selector or @ref into view');
  addScrollIntoViewCommand('scrollinto', 'Alias for scrollintoview: scroll a selector or @ref into view');

  addSharedBrowserOptions(
    program
      .command('upload <target> <files...>')
      .description('Upload one or more files through a file input')
      .action(async (target: string, files: string[], options: SharedOptions) => {
        await handlers.onDaemonAction('upload', { action: 'upload', target, files, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('drag <source> <target>')
      .description('Drag a selector or @ref to another selector or @ref')
      .action(async (source: string, target: string, options: SharedOptions) => {
        await handlers.onDaemonAction('drag', { action: 'drag', source, target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('screenshot [targetOrPath] [path]')
      .description('Save a page or selector screenshot')
      .option('--selector <target>', 'selector or @ref to capture')
      .option('--full', 'capture the full page')
      .option('--viewport', 'capture only the current viewport')
      .option('--format <format>', 'image format: png or jpeg')
      .option('--quality <quality>', 'JPEG quality from 0 to 100', parseInteger)
      .action(async (targetOrPath: string | undefined, filePath: string | undefined, options: ScreenshotOptions) => {
        const resolved = screenshotTargetAndPath(targetOrPath, filePath, options.selector);
        await handlers.onDaemonAction(
          'screenshot',
          {
            action: 'screenshot',
            ...resolved,
            ...(options.full ? { fullPage: true } : {}),
            ...(options.viewport ? { fullPage: false } : {}),
            ...(options.format ? { format: options.format } : {}),
            ...(options.quality !== undefined ? { quality: options.quality } : {}),
            session: options.session,
            tabName: options.tabname,
            ...toLaunchInput(options),
          },
          options,
        );
      }),
  );

  const diffCommand = program.command('diff').description('Compare snapshots, screenshots, or two URLs');
  addSharedBrowserOptions(
    diffCommand
      .command('snapshot')
      .description('Compare the current page snapshot with a baseline')
      .option('--baseline <path>', 'baseline snapshot text file')
      .option('--text <text>', 'inline baseline snapshot text')
      .option('-i, --interactive', 'interactive elements only')
      .option('--path <path>', 'write diff report path')
      .action(async (options: DiffSnapshotOptions) => {
        requireDiffBaseline(options, 'diff snapshot');
        await handlers.onDaemonAction(
          'diff.snapshot',
          {
            action: 'diff.snapshot',
            baselinePath: options.baseline,
            baselineText: options.text,
            interactive: options.interactive ?? false,
            path: options.path,
            session: options.session,
            tabName: options.tabname,
            ...toLaunchInput(options),
          },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    diffCommand
      .command('screenshot')
      .description('Compare the current screenshot with a baseline image using byte comparison')
      .requiredOption('--baseline <path>', 'baseline PNG or JPEG image')
      .option('--selector <target>', 'selector or @ref to capture')
      .option('--path <path>', 'actual screenshot output path')
      .option('--full', 'capture the full page')
      .option('--viewport', 'capture only the current viewport')
      .option('--format <format>', 'image format: png or jpeg')
      .option('--quality <quality>', 'JPEG quality from 0 to 100', parseInteger)
      .action(async (options: DiffScreenshotOptions) => {
        requireDiffBaseline(options, 'diff screenshot');
        await handlers.onDaemonAction(
          'diff.screenshot',
          {
            action: 'diff.screenshot',
            baselinePath: options.baseline,
            target: options.selector,
            path: options.path,
            ...(options.full ? { fullPage: true } : {}),
            ...(options.viewport ? { fullPage: false } : {}),
            ...(options.format ? { format: options.format } : {}),
            ...(options.quality !== undefined ? { quality: options.quality } : {}),
            session: options.session,
            tabName: options.tabname,
            ...toLaunchInput(options),
          },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    diffCommand
      .command('url <leftUrl> <rightUrl>')
      .description('Serially compare two URLs by snapshot or screenshot')
      .option('--mode <mode>', 'comparison mode: snapshot or screenshot')
      .option('--path <path>', 'write diff report path')
      .option('--full', 'capture full page screenshots')
      .option('--viewport', 'capture only the current viewport for screenshots')
      .option('--format <format>', 'screenshot format: png or jpeg')
      .option('--quality <quality>', 'JPEG quality from 0 to 100', parseInteger)
      .action(async (leftUrl: string, rightUrl: string, options: DiffUrlOptions) => {
        const mode = options.mode ?? 'snapshot';
        if (!['snapshot', 'screenshot'].includes(mode)) {
          throw new ValidationError('diff url --mode must be snapshot or screenshot.');
        }
        await handlers.onDaemonAction(
          'diff.url',
          {
            action: 'diff.url',
            leftUrl: normalizeNavigationUrl(leftUrl),
            rightUrl: normalizeNavigationUrl(rightUrl),
            mode,
            path: options.path,
            ...(options.full ? { fullPage: true } : {}),
            ...(options.viewport ? { fullPage: false } : {}),
            ...(options.format ? { format: options.format } : {}),
            ...(options.quality !== undefined ? { quality: options.quality } : {}),
            session: options.session,
            tabName: options.tabname,
            ...toLaunchInput(options),
          },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    program
      .command('console')
      .description('List buffered page console messages')
      .option('--clear', 'clear the console buffer after listing')
      .action(async (options: DebugListOptions) => {
        await handlers.onDaemonAction('console', { action: 'console', session: options.session, clear: options.clear ?? false }, options);
      }),
  );

  const addVitalsCommand = (name: string): void => {
    addSharedBrowserOptions(
      program
        .command(name)
        .description('Collect portable browser performance vitals')
        .action(async (options: SharedOptions) => {
          await handlers.onDaemonAction('vitals', { action: 'vitals', session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
        }),
    );
  };
  addVitalsCommand('vitals');
  addVitalsCommand('web-vitals');

  addSharedBrowserOptions(
    program
      .command('pushstate <url>')
      .description('Perform same-document History API pushState navigation')
      .action(async (url: string, options: SharedOptions) => {
        await handlers.onDaemonAction('pushstate', { action: 'pushstate', url, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('addinitscript <js>')
      .description('Register an init script for future documents in the current session')
      .action(async (source: string, options: SharedOptions) => {
        await handlers.onDaemonAction('addinitscript', { action: 'addinitscript', source, session: options.session, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedOutputOptions(
    program
      .command('removeinitscript <id>')
      .description('Report Playwright init script removal limitations')
      .option('--session <name>', 'session name')
      .action(async (scriptId: string, options: OutputOptions & { session?: string | undefined }) => {
        const shared = inheritedSharedOptions(options);
        await handlers.onDaemonAction('removeinitscript', { action: 'removeinitscript', session: shared.session, scriptId }, shared);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('errors')
      .description('List buffered uncaught page errors')
      .option('--clear', 'clear the page-error buffer after listing')
      .action(async (options: DebugListOptions) => {
        await handlers.onDaemonAction('errors', { action: 'errors', session: options.session, clear: options.clear ?? false }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('highlight <target>')
      .description('Temporarily highlight a selector or @ref')
      .option('--duration <ms>', 'highlight duration in milliseconds', parseInteger)
      .action(async (target: string, options: HighlightOptions) => {
        await handlers.onDaemonAction(
          'highlight',
          { action: 'highlight', target, durationMs: options.duration, session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
          options,
        );
      }),
  );

  addSharedOutputOptions(
    program
      .command('connect')
      .description('Unsupported: CDP/provider connection modes are outside local Camoufox scope')
      .allowUnknownOption(true)
      .allowExcessArguments(true)
      .action(() => {
        throwUnsupportedCommand('connect', 'CDP/provider connection modes are outside Camoucli local Camoufox daemon scope.', 'Use camou open with a managed local session.');
      }),
  );
  addSharedOutputOptions(
    program
      .command('inspect')
      .description('Unsupported: DevTools/CDP inspect is outside local Camoufox scope')
      .allowUnknownOption(true)
      .allowExcessArguments(true)
      .action(() => {
        throwUnsupportedCommand('inspect', 'The inspect command depends on a Chrome DevTools/CDP target. Camoucli local Camoufox mode does not expose that surface.', 'Use trace, console, errors, screenshot, or get commands.');
      }),
  );
  addSharedOutputOptions(
    program
      .command('profiler')
      .description('Unsupported: CDP profiler capture is outside local Camoufox scope')
      .allowUnknownOption(true)
      .allowExcessArguments(true)
      .action(() => {
        throwUnsupportedCommand('profiler', 'CDP profiler capture is not available through Camoufox Firefox Playwright.', 'Use trace start and trace stop for portable Playwright traces.');
      }),
  );
  addSharedOutputOptions(
    program
      .command('pdf')
      .description('Unsupported until real Camoufox PDF smoke testing proves support')
      .allowUnknownOption(true)
      .allowExcessArguments(true)
      .action(() => {
        throwUnsupportedCommand('pdf', 'PDF export has not been enabled because this slice did not smoke-test real Camoufox PDF support.', 'Use screenshot or Playwright directly after verifying PDF support in your environment.');
      }),
  );

  const clipboardCommand = program.command('clipboard').description('Use browser-page clipboard APIs and copy/paste shortcuts');
  addSharedBrowserOptions(
    clipboardCommand
      .command('read')
      .description('Read text through the browser-page clipboard API')
      .action(async (options: SharedOptions) => {
        await handlers.onDaemonAction('clipboard.read', { action: 'clipboard.read', session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );
  addSharedBrowserOptions(
    clipboardCommand
      .command('write <text>')
      .description('Write text through the browser-page clipboard API')
      .action(async (text: string, options: SharedOptions) => {
        await handlers.onDaemonAction('clipboard.write', { action: 'clipboard.write', text, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );
  addSharedBrowserOptions(
    clipboardCommand
      .command('copy')
      .description('Synthesize the platform copy shortcut in the current tab')
      .action(async (options: SharedOptions) => {
        await handlers.onDaemonAction('clipboard.copy', { action: 'clipboard.copy', session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );
  addSharedBrowserOptions(
    clipboardCommand
      .command('paste')
      .description('Synthesize the platform paste shortcut in the current tab')
      .action(async (options: SharedOptions) => {
        await handlers.onDaemonAction('clipboard.paste', { action: 'clipboard.paste', session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  const traceCommand = program.command('trace').description('Capture Playwright trace zip artifacts');
  addSharedBrowserOptions(
    traceCommand
      .command('start')
      .description('Start Playwright tracing for the current session')
      .option('--screenshots', 'include screenshots in the trace')
      .option('--no-screenshots', 'do not include screenshots in the trace')
      .option('--snapshots', 'include DOM snapshots in the trace')
      .option('--no-snapshots', 'do not include DOM snapshots in the trace')
      .option('--sources', 'include source files in the trace')
      .action(async (options: TraceStartOptions) => {
        await handlers.onDaemonAction(
          'trace.start',
          {
            action: 'trace.start',
            session: options.session,
            ...(options.screenshots !== undefined ? { screenshots: options.screenshots } : {}),
            ...(options.snapshots !== undefined ? { snapshots: options.snapshots } : {}),
            ...(options.sources !== undefined ? { sources: options.sources } : {}),
          },
          options,
        );
      }),
  );
  addSharedBrowserOptions(
    traceCommand
      .command('stop [path]')
      .description('Stop Playwright tracing and write a trace zip artifact')
      .action(async (filePath: string | undefined, options: SharedOptions) => {
        await handlers.onDaemonAction('trace.stop', { action: 'trace.stop', session: options.session, ...(filePath ? { path: filePath } : {}) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('wait [target]')
      .description('Wait for time, a selector, text, URL, function predicate, load state, or download')
      .option('--text <text>', 'wait for visible text')
      .option('--load <state>', 'wait for page load state')
      .option('--url <pattern>', 'wait for URL pattern')
      .option('--fn <expression>', 'wait for a JavaScript predicate expression')
      .option('--download', 'wait for the next download in the current tab')
      .option('--path <path>', 'save --download to this path')
      .option('--timeout <ms>', 'wait timeout in milliseconds', parseInteger)
      .action(async (target: string | undefined, options: WaitOptions) => {
        const ms = target && /^\d+$/u.test(target) && !options.text && !options.load && !options.url && !options.fn && !options.download && !options.path ? parseInteger(target) : undefined;
        const downloadPath = options.download ? options.path ?? target : options.path;
        await handlers.onDaemonAction(
          'wait',
          {
            action: 'wait',
            ...(ms !== undefined ? { ms } : target && !options.download ? { target } : {}),
            ...(options.text ? { text: options.text } : {}),
            ...(options.load ? { loadState: options.load } : {}),
            ...(options.url ? { url: options.url } : {}),
            ...(options.fn ? { fn: options.fn } : {}),
            download: options.download ?? false,
            ...(downloadPath ? { path: downloadPath } : {}),
            timeoutMs: options.timeout,
            session: options.session,
            tabName: options.tabname,
            ...toLaunchInput(options),
          },
          options,
        );
      }),
  );

  const setCommand = program.command('set').description('Change runtime settings for the current session or tab');
  addSharedBrowserOptions(
    setCommand
      .command('viewport <width> <height>')
      .description('Set the current tab viewport size')
      .action(async (width: string, height: string, options: SharedOptions) => {
        await handlers.onDaemonAction(
          'runtime.set',
          {
            action: 'runtime.set',
            runtime: { setting: 'viewport', width: parseInteger(width), height: parseInteger(height) },
            session: options.session,
            tabName: options.tabname,
            ...toLaunchInput(options),
          },
          options,
        );
      }),
  );
  addSharedBrowserOptions(
    setCommand
      .command('geolocation <latitude> <longitude>')
      .alias('geo')
      .description('Set session geolocation')
      .option('--accuracy <meters>', 'geolocation accuracy in meters', Number.parseFloat)
      .action(async (latitude: string, longitude: string, options: SharedOptions & { accuracy?: number | undefined }) => {
        await handlers.onDaemonAction(
          'runtime.set',
          {
            action: 'runtime.set',
            runtime: { setting: 'geolocation', latitude: Number.parseFloat(latitude), longitude: Number.parseFloat(longitude), accuracy: options.accuracy },
            session: options.session,
            tabName: options.tabname,
            ...toLaunchInput(options),
          },
          options,
        );
      }),
  );
  addSharedBrowserOptions(
    setCommand
      .command('offline <value>')
      .description('Set session offline mode')
      .action(async (value: string, options: SharedOptions) => {
        await handlers.onDaemonAction(
          'runtime.set',
          { action: 'runtime.set', runtime: { setting: 'offline', value: parseBooleanInput(value) }, session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
          options,
        );
      }),
  );
  addSharedBrowserOptions(
    setCommand
      .command('headers <json>')
      .description('Set session extra HTTP headers')
      .action(async (json: string, options: SharedOptions) => {
        await handlers.onDaemonAction(
          'runtime.set',
          { action: 'runtime.set', runtime: { setting: 'headers', headers: parseStringMap(json, 'headers') }, session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
          options,
        );
      }),
  );
  addSharedBrowserOptions(
    setCommand
      .command('credentials <origin> <username> <password>')
      .description('Set session HTTP credentials for an origin')
      .action(async (origin: string, username: string, password: string, options: SharedOptions) => {
        await handlers.onDaemonAction(
          'runtime.set',
          { action: 'runtime.set', runtime: { setting: 'credentials', origin, username, password }, session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
          options,
        );
      }),
  );
  addSharedBrowserOptions(
    setCommand
      .command('media')
      .description('Set current tab media preferences')
      .action(async (options: SharedOptions & { colorScheme?: 'dark' | 'light' | 'no-preference' | undefined; reducedMotion?: 'reduce' | 'no-preference' | undefined }) => {
        if (!options.colorScheme && !options.reducedMotion) {
          throw new ValidationError('set media requires --color-scheme or --reduced-motion.');
        }
        const launchInput = toLaunchInput({ ...options, colorScheme: undefined, reducedMotion: undefined });
        await handlers.onDaemonAction(
          'runtime.set',
          {
            action: 'runtime.set',
            runtime: { setting: 'media', colorScheme: options.colorScheme, reducedMotion: options.reducedMotion },
            session: options.session,
            tabName: options.tabname,
            ...launchInput,
          },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    program
      .command('frame <target>')
      .description('Set active frame context, or pass main to clear it')
      .action(async (target: string, options: SharedOptions) => {
        await handlers.onDaemonAction('frame', { action: 'frame', target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  const dialogCommand = program.command('dialog').description('Inspect or resolve pending tab dialogs');
  addSharedBrowserOptions(
    dialogCommand
      .command('status')
      .description('Show pending dialog metadata')
      .action(async (options: SharedOptions) => {
        await handlers.onDaemonAction('dialog.status', { action: 'dialog.status', session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );
  addSharedBrowserOptions(
    dialogCommand
      .command('accept [text]')
      .description('Accept the pending dialog')
      .action(async (text: string | undefined, options: SharedOptions) => {
        await handlers.onDaemonAction('dialog.accept', { action: 'dialog.accept', text, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );
  addSharedBrowserOptions(
    dialogCommand
      .command('dismiss [text]')
      .description('Dismiss the pending dialog')
      .action(async (text: string | undefined, options: SharedOptions) => {
        await handlers.onDaemonAction('dialog.dismiss', { action: 'dialog.dismiss', text, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    program
      .command('read [url]')
      .description('Read local DOM content from the current tab, optionally navigating first')
      .option('--raw', 'return raw page HTML')
      .option('--outline', 'return a DOM outline')
      .option('--filter <text>', 'filter text or outline rows')
      .option('--timeout <ms>', 'navigation timeout in milliseconds', parseInteger)
      .action(async (url: string | undefined, options: ReadOptions) => {
        await handlers.onDaemonAction(
          'read',
          {
            action: 'read',
            ...(url ? { url: normalizeNavigationUrl(url) } : {}),
            mode: readMode(options),
            ...(options.filter ? { filter: options.filter } : {}),
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

  addSharedBrowserOptions(
    getCommand
      .command('html <target>')
      .description('Get inner HTML from a selector or @ref')
      .action(async (target: string, options: SharedOptions) => {
        await handlers.onDaemonAction('get.html', { action: 'get.html', target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    getCommand
      .command('attr <target> <attribute>')
      .description('Get an attribute from a selector or @ref')
      .action(async (target: string, attribute: string, options: SharedOptions) => {
        await handlers.onDaemonAction(
          'get.attr',
          { action: 'get.attr', target, attribute, session: options.session, tabName: options.tabname, ...toLaunchInput(options) },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    getCommand
      .command('count <target>')
      .description('Count elements matching a selector or @ref')
      .action(async (target: string, options: SharedOptions) => {
        await handlers.onDaemonAction('get.count', { action: 'get.count', target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    getCommand
      .command('box <target>')
      .description('Get an element bounding box')
      .action(async (target: string, options: SharedOptions) => {
        await handlers.onDaemonAction('get.box', { action: 'get.box', target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  addSharedBrowserOptions(
    getCommand
      .command('styles <target>')
      .description('Get computed styles from an element')
      .action(async (target: string, options: SharedOptions) => {
        await handlers.onDaemonAction('get.styles', { action: 'get.styles', target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
      }),
  );

  const isCommand = program.command('is').description('Check element predicates');
  const addIsCommand = (name: 'visible' | 'enabled' | 'checked'): void => {
    addSharedBrowserOptions(
      isCommand
        .command(`${name} <target>`)
        .description(`Check whether a selector or @ref is ${name}`)
        .action(async (target: string, options: SharedOptions) => {
          const action = `is.${name}`;
          await handlers.onDaemonAction(action, { action, target, session: options.session, tabName: options.tabname, ...toLaunchInput(options) }, options);
        }),
    );
  };
  addIsCommand('visible');
  addIsCommand('enabled');
  addIsCommand('checked');

  const findCommand = program.command('find').description('Find elements semantically and run a narrow action');
  const addFindValueCommand = (name: 'text' | 'label' | 'placeholder' | 'alt' | 'title' | 'testid', description: string): void => {
    addSharedBrowserOptions(
      findCommand
        .command(`${name} <value>`)
        .description(description)
        .option('--action <action>', 'subaction: click, fill, check, hover, or text')
        .option('--value <text>', 'text to use with --action fill')
        .option('--exact', 'match exactly where supported')
        .action(async (value: string, options: FindOptions) => {
          await handlers.onDaemonAction(
            'find',
            {
              action: 'find',
              locatorType: name,
              value,
              exact: options.exact,
              subaction: normalizeFindAction(options),
              text: options.value,
              session: options.session,
              tabName: options.tabname,
              ...toLaunchInput(options),
            },
            options,
          );
        }),
    );
  };

  addSharedBrowserOptions(
    findCommand
      .command('role <role>')
      .description('Find by ARIA role')
      .option('--name <name>', 'accessible name')
      .option('--exact', 'match the accessible name exactly')
      .option('--action <action>', 'subaction: click, fill, check, hover, or text')
      .option('--value <text>', 'text to use with --action fill')
      .action(async (role: string, options: FindOptions) => {
        await handlers.onDaemonAction(
          'find',
          {
            action: 'find',
            locatorType: 'role',
            value: role,
            name: options.name,
            exact: options.exact,
            subaction: normalizeFindAction(options),
            text: options.value,
            session: options.session,
            tabName: options.tabname,
            ...toLaunchInput(options),
          },
          options,
        );
      }),
  );

  addFindValueCommand('text', 'Find by visible text');
  addFindValueCommand('label', 'Find a form control by label');
  addFindValueCommand('placeholder', 'Find an input by placeholder');
  addFindValueCommand('alt', 'Find by alt text');
  addFindValueCommand('title', 'Find by title');
  addFindValueCommand('testid', 'Find by test id');

  const addFindTargetCommand = (name: 'first' | 'last'): void => {
    addSharedBrowserOptions(
      findCommand
        .command(`${name} <target>`)
        .description(`Find the ${name} element matching a selector or @ref`)
        .option('--action <action>', 'subaction: click, fill, check, hover, or text')
        .option('--value <text>', 'text to use with --action fill')
        .action(async (target: string, options: FindOptions) => {
          await handlers.onDaemonAction(
            'find',
            {
              action: 'find',
              locatorType: name,
              target,
              subaction: normalizeFindAction(options),
              text: options.value,
              session: options.session,
              tabName: options.tabname,
              ...toLaunchInput(options),
            },
            options,
          );
        }),
    );
  };
  addFindTargetCommand('first');
  addFindTargetCommand('last');

  addSharedBrowserOptions(
    findCommand
      .command('nth <target> <index>')
      .description('Find the nth element matching a selector or @ref')
      .option('--action <action>', 'subaction: click, fill, check, hover, or text')
      .option('--value <text>', 'text to use with --action fill')
      .action(async (target: string, index: string, options: FindOptions) => {
        await handlers.onDaemonAction(
          'find',
          {
            action: 'find',
            locatorType: 'nth',
            target,
            index: parseInteger(index),
            subaction: normalizeFindAction(options),
            text: options.value,
            session: options.session,
            tabName: options.tabname,
            ...toLaunchInput(options),
          },
          options,
        );
      }),
  );

  const sessionCommand = addSharedOutputOptions(
    program
      .command('session')
      .description('Manage daemon-owned browser sessions')
      .option('--session <name>', 'session name')
      .action(async (options: SharedOptions) => {
        if (!handlers.onSessionCurrent) {
          throw new Error('Session current handler not configured');
        }
        await handlers.onSessionCurrent(parsedOptions(options));
      }),
  );

  addSharedOutputOptions(
    sessionCommand
      .command('id')
      .description('Print a stable session name for this worktree, cwd, or git root')
      .option('--scope <scope>', 'scope: worktree, cwd, or git-root')
      .option('--prefix <text>', 'session name prefix')
      .action(async (_options: OutputOptions & { scope?: 'worktree' | 'cwd' | 'git-root' | undefined; prefix?: string | undefined }, command: Command) => {
        if (!handlers.onSessionId) {
          throw new Error('Session id handler not configured');
        }
        await handlers.onSessionId(mergedCommandOptions<OutputOptions & { scope?: 'worktree' | 'cwd' | 'git-root' | undefined; prefix?: string | undefined }>(command));
      }),
  );

  addSharedOutputOptions(
    sessionCommand
      .command('info')
      .description('Inspect current session runtime and profile paths')
      .option('--session <name>', 'session name')
      .action(async (_options: SharedOptions, command: Command) => {
        if (!handlers.onSessionInfo) {
          throw new Error('Session info handler not configured');
        }
        await handlers.onSessionInfo(mergedCommandOptions<SharedOptions>(command));
      }),
  );

  addSharedOutputOptions(
    sessionCommand
      .command('list')
      .description('List running sessions')
      .action(async (_options: OutputOptions, command: Command) => {
        const resolved = mergedCommandOptions<OutputOptions>(command);
        const shared: SharedOptions = { json: resolved.json, verbose: resolved.verbose };
        await handlers.onDaemonAction('session.list', { action: 'session.list' }, shared);
      }),
  );

  addSharedOutputOptions(
    sessionCommand
      .command('stop [name]')
      .description('Stop a running session')
      .action(async (name: string | undefined, _options: OutputOptions, command: Command) => {
        const resolved = mergedCommandOptions<OutputOptions>(command);
        const shared: SharedOptions = { ...(name ? { session: name } : {}), json: resolved.json, verbose: resolved.verbose };
        await handlers.onDaemonAction('session.stop', { action: 'session.stop', ...(name ? { session: name } : {}) }, shared);
      }),
  );

  const profileCommand = program.command('profile').description('Manage stored browser profiles');
  addSharedOutputOptions(
    profileCommand
      .command('list')
      .description('List stored profiles on disk')
      .action(async (options: OutputOptions) => {
        const shared: SharedOptions = { json: options.json, verbose: options.verbose };
        await handlers.onDaemonAction('profile.list', { action: 'profile.list' }, shared);
      }),
  );

  addSharedOutputOptions(
    profileCommand
      .command('inspect <name>')
      .description('Inspect one stored profile')
      .action(async (name: string, options: OutputOptions) => {
        const shared: SharedOptions = { json: options.json, verbose: options.verbose };
        await handlers.onDaemonAction('profile.inspect', { action: 'profile.inspect', profile: name }, shared);
      }),
  );

  addSharedOutputOptions(
    profileCommand
      .command('remove <name>')
      .description('Remove a stored profile')
      .action(async (name: string, options: OutputOptions) => {
        const shared: SharedOptions = { json: options.json, verbose: options.verbose };
        await handlers.onDaemonAction('profile.remove', { action: 'profile.remove', profile: name }, shared);
      }),
  );

  const daemonCommand = program.command('daemon').description('Manage the local camou daemon');
  addSharedOutputOptions(
    daemonCommand
      .command('stop')
      .description('Stop the local daemon process')
      .action(async (options: OutputOptions) => {
        if (!handlers.onDaemonStop) {
          throw new Error('Daemon stop handler not configured');
        }
        const shared: OutputOptions = { json: options.json, verbose: options.verbose };
        await handlers.onDaemonStop(shared);
      }),
  );

  addSharedOutputOptions(
    daemonCommand
      .command('restart')
      .description('Restart the local daemon process')
      .action(async (options: OutputOptions) => {
        if (!handlers.onDaemonRestart) {
          throw new Error('Daemon restart handler not configured');
        }
        const shared: OutputOptions = { json: options.json, verbose: options.verbose };
        await handlers.onDaemonRestart(shared);
      }),
  );

  addSharedOutputOptions(
    daemonCommand
      .command('cleanup')
      .description('Stop sessions, stop the daemon, and kill stray Camoufox processes')
      .action(async (options: OutputOptions) => {
        if (!handlers.onDaemonCleanup) {
          throw new Error('Daemon cleanup handler not configured');
        }
        const shared: OutputOptions = { json: options.json, verbose: options.verbose };
        await handlers.onDaemonCleanup(shared);
      }),
  );

  const tabCommand = addSharedBrowserOptions(
    program
      .command('tab [target]')
      .description('Manage named tabs within a session')
      .action(async (target: string | undefined, options: SharedOptions) => {
        if (target) {
          await handlers.onDaemonAction('tab.activate', { action: 'tab.activate', session: options.session, target }, options);
          return;
        }
        await handlers.onDaemonAction('tab.list', { action: 'tab.list', session: options.session }, options);
      }),
  );
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
      .option('--label <name>', 'tab name to create')
      .action(async (url: string | undefined, options: TabNewOptions) => {
        await handlers.onDaemonAction(
          'tab.new',
          { action: 'tab.new', session: options.session, tabName: options.label ?? options.tabname, label: options.label, url: url ? normalizeNavigationUrl(url) : undefined, ...toLaunchInput(options) },
          options,
        );
      }),
  );

  addSharedBrowserOptions(
    tabCommand
      .command('close [target]')
      .description('Close a tab by name, generated id, or zero-based index')
      .action(async (target: string | undefined, options: SharedOptions) => {
        await handlers.onDaemonAction('tab.close', { action: 'tab.close', session: options.session, target }, options);
      }),
  );

  const windowCommand = program.command('window').description('Manage tracked top-level pages');
  addSharedBrowserOptions(
    windowCommand
      .command('new [url]')
      .description('Create a new tracked page; not guaranteed to be a separate OS window')
      .option('--label <name>', 'tab name to assign to the tracked page')
      .action(async (url: string | undefined, options: TabNewOptions) => {
        await handlers.onDaemonAction(
          'window.new',
          { action: 'window.new', session: options.session, tabName: options.tabname, label: options.label, url: url ? normalizeNavigationUrl(url) : undefined, ...toLaunchInput(options) },
          options,
        );
      }),
  );

  return program;
}
