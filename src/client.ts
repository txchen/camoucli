import type { LaunchInput } from './camoufox/config.js';
import { ensureDaemonRunning } from './cli/daemon.js';
import { resolveSessionId, type SessionIdScope } from './cli/session.js';
import { sendDaemonRequest } from './ipc/client.js';
import { ensureBasePaths, getCamoucliPaths, type CamoucliPaths } from './state/paths.js';

export interface CamouClientOptions extends LaunchInput {
  session?: string | undefined;
  tabName?: string | undefined;
  paths?: CamoucliPaths | undefined;
  timeoutMs?: number | undefined;
  verbose?: boolean | undefined;
  autoStartDaemon?: boolean | undefined;
}

export interface CamouCommandOptions {
  session?: string | undefined;
  tabName?: string | undefined;
  timeoutMs?: number | undefined;
}

export interface TargetOptions extends CamouCommandOptions {
  target: string;
}

export interface OpenOptions extends CamouCommandOptions {
  url?: string | undefined;
}

export interface SnapshotOptions extends CamouCommandOptions {
  interactive?: boolean | undefined;
}

export interface ClickOptions extends CamouCommandOptions {
  newTab?: boolean | undefined;
  label?: string | undefined;
  timeoutMs?: number | undefined;
}

export interface DownloadOptions extends CamouCommandOptions {
  timeoutMs?: number | undefined;
}

export interface TypeOptions extends CamouCommandOptions {
  clear?: boolean | undefined;
  delayMs?: number | undefined;
}

export interface SelectOptions extends CamouCommandOptions {
  value: string | string[];
}

export interface KeyboardTypeOptions extends CamouCommandOptions {
  delayMs?: number | undefined;
}

export interface MouseButtonOptions extends CamouCommandOptions {
  button?: 'left' | 'right' | 'middle' | undefined;
}

export interface ScrollOptions extends CamouCommandOptions {
  direction?: 'up' | 'down' | 'left' | 'right' | undefined;
  amount?: number | undefined;
  target?: string | undefined;
}

export interface ScreenshotOptions extends CamouCommandOptions {
  target?: string | undefined;
  path?: string | undefined;
  fullPage?: boolean | undefined;
  format?: 'png' | 'jpeg' | undefined;
  quality?: number | undefined;
}

export interface WaitOptions extends CamouCommandOptions {
  ms?: number | undefined;
  target?: string | undefined;
  text?: string | undefined;
  loadState?: 'domcontentloaded' | 'load' | 'networkidle' | undefined;
  url?: string | undefined;
  fn?: string | undefined;
  download?: boolean | undefined;
  path?: string | undefined;
  timeoutMs?: number | undefined;
}

export type RuntimeSetting =
  | { setting: 'viewport'; width: number; height: number }
  | { setting: 'geolocation'; latitude: number; longitude: number; accuracy?: number | undefined }
  | { setting: 'offline'; value: boolean }
  | { setting: 'headers'; headers: Record<string, string> }
  | { setting: 'credentials'; origin: string; username: string; password: string }
  | { setting: 'media'; colorScheme?: 'dark' | 'light' | 'no-preference' | undefined; reducedMotion?: 'reduce' | 'no-preference' | undefined };

export interface ReadOptions extends CamouCommandOptions {
  url?: string | undefined;
  mode?: 'text' | 'raw' | 'outline' | undefined;
  filter?: string | undefined;
  timeoutMs?: number | undefined;
}

export interface FindOptions extends CamouCommandOptions {
  locatorType: 'role' | 'text' | 'label' | 'placeholder' | 'alt' | 'title' | 'testid' | 'first' | 'last' | 'nth';
  value?: string | undefined;
  target?: string | undefined;
  index?: number | undefined;
  name?: string | undefined;
  exact?: boolean | undefined;
  subaction?: 'click' | 'fill' | 'check' | 'hover' | 'text' | undefined;
  text?: string | undefined;
}

export interface CookieSetOptions extends CamouCommandOptions {
  name?: string | undefined;
  value?: string | undefined;
  url?: string | undefined;
  domain?: string | undefined;
  path?: string | undefined;
  expires?: number | undefined;
  httpOnly?: boolean | undefined;
  secure?: boolean | undefined;
  sameSite?: 'Strict' | 'Lax' | 'None' | undefined;
  curlPath?: string | undefined;
}

export interface StorageOptions extends CamouCommandOptions {
  key?: string | undefined;
}

export interface NetworkRouteOptions extends CamouCommandOptions {
  abort?: boolean | undefined;
  body?: string | undefined;
  status?: number | undefined;
  contentType?: string | undefined;
  resourceTypes?: string[] | undefined;
}

export interface NetworkRequestsOptions extends CamouCommandOptions {
  clear?: boolean | undefined;
  filter?: string | undefined;
  resourceTypes?: string[] | undefined;
  method?: string | undefined;
  status?: number | undefined;
}

export interface TraceStartOptions extends CamouCommandOptions {
  screenshots?: boolean | undefined;
  snapshots?: boolean | undefined;
  sources?: boolean | undefined;
}

export interface DiffSnapshotOptions extends CamouCommandOptions {
  baselinePath?: string | undefined;
  baselineText?: string | undefined;
  interactive?: boolean | undefined;
  path?: string | undefined;
}

export interface DiffScreenshotOptions extends ScreenshotOptions {
  baselinePath: string;
}

export interface DiffUrlOptions extends CamouCommandOptions {
  mode?: 'snapshot' | 'screenshot' | undefined;
  path?: string | undefined;
  fullPage?: boolean | undefined;
  format?: 'png' | 'jpeg' | undefined;
  quality?: number | undefined;
}

export interface SessionIdOptions {
  scope?: SessionIdScope | undefined;
  prefix?: string | undefined;
}

export interface CamouPageContextResult {
  sessionName?: string | undefined;
  tabName?: string | undefined;
  tabId?: string | undefined;
  url?: string | undefined;
  title?: string | undefined;
}

export interface CamouOpenResult extends CamouPageContextResult {
  created?: boolean | undefined;
  opened?: boolean | undefined;
}

export interface CamouSnapshotElement {
  ref?: string | undefined;
  role?: string | undefined;
  name?: string | undefined;
  text?: string | undefined;
  selector?: string | undefined;
}

export interface CamouSnapshotResult extends CamouPageContextResult {
  interactive?: boolean | undefined;
  elements?: CamouSnapshotElement[] | undefined;
  text?: string | undefined;
  count?: number | undefined;
}

export interface CamouActionResult extends CamouPageContextResult {
  target?: string | undefined;
  ok?: boolean | undefined;
  value?: string | string[] | boolean | number | null | undefined;
  path?: string | undefined;
  count?: number | undefined;
  timeoutMs?: number | undefined;
}

export interface CamouValueResult extends CamouPageContextResult {
  value?: string | number | boolean | null | undefined;
  result?: unknown;
  text?: string | undefined;
  html?: string | undefined;
  count?: number | undefined;
  box?: { x: number; y: number; width: number; height: number } | null | undefined;
  styles?: Record<string, string> | undefined;
}

export interface CamouSessionResult {
  sessionName?: string | undefined;
  sessionNames?: string[] | undefined;
  stopped?: boolean | number | undefined;
  running?: boolean | undefined;
  daemon?: unknown;
  profile?: unknown;
}

export interface CamouTabResult extends CamouPageContextResult {
  tabs?: Array<CamouPageContextResult & { active?: boolean | undefined }> | undefined;
  closed?: boolean | undefined;
}

export interface CamouProfileResult {
  profile?: string | undefined;
  profiles?: unknown[] | undefined;
  path?: string | undefined;
  removed?: boolean | undefined;
  running?: boolean | undefined;
}

export interface CamouCookieResult {
  sessionName?: string | undefined;
  cookies?: unknown[] | undefined;
  count?: number | undefined;
  names?: string[] | undefined;
  imported?: number | undefined;
  cleared?: number | undefined;
  path?: string | undefined;
}

export interface CamouStorageResult extends CamouPageContextResult {
  storage?: 'localStorage' | 'sessionStorage' | string | undefined;
  operation?: 'get' | 'set' | 'clear' | undefined;
  origin?: string | undefined;
  key?: string | undefined;
  values?: Record<string, string> | undefined;
  valueLength?: number | undefined;
}

export interface CamouStateResult {
  sessionName?: string | undefined;
  path?: string | undefined;
  name?: string | undefined;
  states?: Array<{ name: string; path: string; size?: number | undefined }> | undefined;
  cookies?: number | undefined;
  origins?: number | undefined;
  localStorageItems?: number | undefined;
  removed?: boolean | number | undefined;
  all?: boolean | undefined;
  from?: string | undefined;
  to?: string | undefined;
  state?: unknown;
}

export interface CamouNetworkResult {
  sessionName?: string | undefined;
  routeId?: string | undefined;
  url?: string | undefined;
  behavior?: string | undefined;
  removed?: number | undefined;
  requests?: unknown[] | undefined;
  request?: unknown;
  response?: unknown;
  failure?: unknown;
  entries?: unknown[] | undefined;
  path?: string | undefined;
  count?: number | undefined;
}

export interface CamouArtifactResult extends CamouPageContextResult {
  path?: string | undefined;
  id?: string | undefined;
  scriptId?: string | undefined;
  unsupported?: boolean | undefined;
  reason?: string | undefined;
  changed?: boolean | undefined;
  diff?: unknown;
}

export interface CamouDebugResult extends CamouPageContextResult {
  events?: unknown[] | undefined;
  errors?: unknown[] | undefined;
  count?: number | undefined;
  cleared?: number | undefined;
  text?: string | undefined;
  copied?: boolean | undefined;
  pasted?: boolean | undefined;
  metrics?: unknown;
}

type RequestPayload = object;

const BROWSER_LAUNCH_KEYS = [
  'headless',
  'configPath',
  'configJson',
  'prefsPath',
  'prefsJson',
  'fingerprintPath',
  'fingerprintJson',
  'fingerprint',
  'preset',
  'proxy',
  'proxyBypass',
  'headers',
  'extraHTTPHeaders',
  'userAgent',
  'ignoreHTTPSErrors',
  'colorScheme',
  'reducedMotion',
  'initScript',
  'initScripts',
  'state',
  'storageState',
  'locale',
  'locales',
  'region',
  'timezone',
  'screenProfile',
  'screen',
  'windowProfile',
  'window',
  'fonts',
  'fontSpacingSeed',
  'blockImages',
  'blockWebRtc',
  'blockWebGl',
  'disableCoop',
  'width',
  'height',
  'browser',
] as const satisfies ReadonlyArray<keyof LaunchInput>;

function omitUndefined(input: RequestPayload): RequestPayload {
  return Object.fromEntries(Object.entries(input as Record<string, unknown>).filter(([, value]) => value !== undefined));
}

function omitClientControls(input: RequestPayload): RequestPayload {
  const { timeoutMs: _timeoutMs, ...payload } = input as Record<string, unknown>;
  return payload;
}

export class CamouClient {
  readonly paths: CamoucliPaths;
  readonly sessionName: string;
  readonly tabName?: string | undefined;
  readonly timeoutMs: number;
  readonly verbose: boolean;
  readonly autoStartDaemon: boolean;

  private readonly launchDefaults: Partial<LaunchInput>;

  constructor(options: CamouClientOptions = {}) {
    this.paths = options.paths ?? getCamoucliPaths();
    this.sessionName = options.session ?? 'default';
    this.tabName = options.tabName;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.verbose = options.verbose ?? false;
    this.autoStartDaemon = options.autoStartDaemon ?? true;
    this.launchDefaults = {};

    for (const key of BROWSER_LAUNCH_KEYS) {
      if (options[key] !== undefined) {
        this.launchDefaults[key] = options[key] as never;
      }
    }
  }

  static create(options: CamouClientOptions = {}): CamouClient {
    return new CamouClient(options);
  }

  async ping(options: CamouCommandOptions = {}): Promise<{ ok?: boolean | undefined; pid?: number | undefined; version?: string | undefined }> {
    return this.command('ping', {}, options, false);
  }

  async open(urlOrOptions?: string | OpenOptions, options: CamouCommandOptions = {}): Promise<CamouOpenResult> {
    const input = typeof urlOrOptions === 'string' ? { ...options, url: urlOrOptions } : (urlOrOptions ?? options);
    return this.browserCommand('open', input);
  }

  async back(options: CamouCommandOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('back', options);
  }

  async forward(options: CamouCommandOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('forward', options);
  }

  async reload(options: CamouCommandOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('reload', options);
  }

  async snapshot(options: SnapshotOptions = {}): Promise<CamouSnapshotResult> {
    return this.browserCommand('snapshot', options);
  }

  async click(target: string, options: ClickOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('click', { ...options, target });
  }

  async download(target: string, path: string, options: DownloadOptions = {}): Promise<CamouArtifactResult> {
    return this.browserCommand('download', { ...options, target, path });
  }

  async doubleClick(target: string, options: CamouCommandOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('dblclick', { ...options, target });
  }

  async hover(target: string, options: CamouCommandOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('hover', { ...options, target });
  }

  async focus(target: string, options: CamouCommandOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('focus', { ...options, target });
  }

  async fill(target: string, text: string, options: CamouCommandOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('fill', { ...options, target, text });
  }

  async type(target: string, text: string, options: TypeOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('type', { ...options, target, text });
  }

  async check(target: string, options: CamouCommandOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('check', { ...options, target });
  }

  async uncheck(target: string, options: CamouCommandOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('uncheck', { ...options, target });
  }

  async select(target: string, value: string | string[], options: CamouCommandOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('select', { ...options, target, value });
  }

  async press(key: string, options: CamouCommandOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('press', { ...options, key });
  }

  readonly keyboard = {
    down: async (key: string, options: CamouCommandOptions = {}): Promise<CamouActionResult> => this.browserCommand('keyboard.down', { ...options, key }),
    up: async (key: string, options: CamouCommandOptions = {}): Promise<CamouActionResult> => this.browserCommand('keyboard.up', { ...options, key }),
    type: async (text: string, options: KeyboardTypeOptions = {}): Promise<CamouActionResult> => this.browserCommand('keyboard.type', { ...options, text }),
    insertText: async (text: string, options: CamouCommandOptions = {}): Promise<CamouActionResult> => this.browserCommand('keyboard.insertText', { ...options, text }),
  };

  readonly mouse = {
    move: async (x: number, y: number, options: CamouCommandOptions = {}): Promise<CamouActionResult> => this.browserCommand('mouse.move', { ...options, x, y }),
    down: async (options: MouseButtonOptions = {}): Promise<CamouActionResult> => this.browserCommand('mouse.down', options),
    up: async (options: MouseButtonOptions = {}): Promise<CamouActionResult> => this.browserCommand('mouse.up', options),
    wheel: async (deltaY: number, deltaX = 0, options: CamouCommandOptions = {}): Promise<CamouActionResult> => this.browserCommand('mouse.wheel', { ...options, deltaX, deltaY }),
  };

  async scroll(options: ScrollOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('scroll', options);
  }

  async scrollIntoView(target: string, options: CamouCommandOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('scroll.intoView', { ...options, target });
  }

  async upload(target: string, files: string[], options: CamouCommandOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('upload', { ...options, target, files });
  }

  async drag(source: string, target: string, options: CamouCommandOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('drag', { ...options, source, target });
  }

  async screenshot(options: ScreenshotOptions = {}): Promise<CamouArtifactResult> {
    return this.browserCommand('screenshot', options);
  }

  async wait(options: WaitOptions): Promise<CamouActionResult> {
    return this.browserCommand('wait', options);
  }

  async waitForDownload(path?: string, options: CamouCommandOptions = {}): Promise<CamouArtifactResult> {
    return this.browserCommand('wait', { ...options, download: true, path });
  }

  async evaluate(expression: string, options: CamouCommandOptions = {}): Promise<CamouValueResult> {
    return this.browserCommand('eval', { ...options, expression });
  }

  async read(options: ReadOptions = {}): Promise<CamouValueResult> {
    return this.browserCommand('read', options);
  }

  async find(options: FindOptions): Promise<CamouActionResult> {
    return this.browserCommand('find', options);
  }

  readonly get = {
    url: async (options: CamouCommandOptions = {}): Promise<CamouValueResult> => this.browserCommand('get.url', options),
    title: async (options: CamouCommandOptions = {}): Promise<CamouValueResult> => this.browserCommand('get.title', options),
    text: async (target: string, options: CamouCommandOptions = {}): Promise<CamouValueResult> => this.browserCommand('get.text', { ...options, target }),
    value: async (target: string, options: CamouCommandOptions = {}): Promise<CamouValueResult> => this.browserCommand('get.value', { ...options, target }),
    html: async (target: string, options: CamouCommandOptions = {}): Promise<CamouValueResult> => this.browserCommand('get.html', { ...options, target }),
    attr: async (target: string, attribute: string, options: CamouCommandOptions = {}): Promise<CamouValueResult> => this.browserCommand('get.attr', { ...options, target, attribute }),
    count: async (target: string, options: CamouCommandOptions = {}): Promise<CamouValueResult> => this.browserCommand('get.count', { ...options, target }),
    box: async (target: string, options: CamouCommandOptions = {}): Promise<CamouValueResult> => this.browserCommand('get.box', { ...options, target }),
    styles: async (target: string, options: CamouCommandOptions = {}): Promise<CamouValueResult> => this.browserCommand('get.styles', { ...options, target }),
  };

  readonly is = {
    visible: async (target: string, options: CamouCommandOptions = {}): Promise<CamouValueResult> => this.browserCommand('is.visible', { ...options, target }),
    enabled: async (target: string, options: CamouCommandOptions = {}): Promise<CamouValueResult> => this.browserCommand('is.enabled', { ...options, target }),
    checked: async (target: string, options: CamouCommandOptions = {}): Promise<CamouValueResult> => this.browserCommand('is.checked', { ...options, target }),
  };

  readonly set = {
    runtime: async (runtime: RuntimeSetting, options: CamouCommandOptions = {}): Promise<CamouActionResult> => this.browserCommand('runtime.set', { ...options, runtime }),
    viewport: async (width: number, height: number, options: CamouCommandOptions = {}): Promise<CamouActionResult> => this.browserCommand('runtime.set', { ...options, runtime: { setting: 'viewport', width, height } }),
    geolocation: async (latitude: number, longitude: number, accuracy?: number, options: CamouCommandOptions = {}): Promise<CamouActionResult> => this.browserCommand('runtime.set', { ...options, runtime: { setting: 'geolocation', latitude, longitude, accuracy } }),
    offline: async (value: boolean, options: CamouCommandOptions = {}): Promise<CamouActionResult> => this.browserCommand('runtime.set', { ...options, runtime: { setting: 'offline', value } }),
    headers: async (headers: Record<string, string>, options: CamouCommandOptions = {}): Promise<CamouActionResult> => this.browserCommand('runtime.set', { ...options, runtime: { setting: 'headers', headers } }),
    credentials: async (origin: string, username: string, password: string, options: CamouCommandOptions = {}): Promise<CamouActionResult> => this.browserCommand('runtime.set', { ...options, runtime: { setting: 'credentials', origin, username, password } }),
    media: async (media: Omit<Extract<RuntimeSetting, { setting: 'media' }>, 'setting'>, options: CamouCommandOptions = {}): Promise<CamouActionResult> => this.browserCommand('runtime.set', { ...options, runtime: { setting: 'media', ...media } }),
  };

  readonly frame = {
    use: async (target: string, options: CamouCommandOptions = {}): Promise<CamouActionResult> => this.browserCommand('frame', { ...options, target }),
    main: async (options: CamouCommandOptions = {}): Promise<CamouActionResult> => this.browserCommand('frame', { ...options, target: 'main' }),
  };

  readonly dialog = {
    status: async (options: CamouCommandOptions = {}): Promise<CamouDebugResult> => this.browserCommand('dialog.status', options),
    accept: async (text?: string, options: CamouCommandOptions = {}): Promise<CamouActionResult> => this.browserCommand('dialog.accept', { ...options, text }),
    dismiss: async (options: CamouCommandOptions = {}): Promise<CamouActionResult> => this.browserCommand('dialog.dismiss', options),
  };

  readonly cookies = {
    get: async (urls?: string[], options: CamouCommandOptions = {}): Promise<CamouCookieResult> => this.command('cookies.get', { urls }, options),
    set: async (cookie: CookieSetOptions): Promise<CamouCookieResult> => this.browserCommand('cookies.set', cookie),
    setFromCurl: async (curlPath: string, options: CamouCommandOptions = {}): Promise<CamouCookieResult> => this.browserCommand('cookies.set', { ...options, curlPath }),
    clear: async (options: CamouCommandOptions = {}): Promise<CamouCookieResult> => this.command('cookies.clear', {}, options),
    export: async (path?: string, options: CamouCommandOptions = {}): Promise<CamouCookieResult> => this.command('cookies.export', { path }, options),
    import: async (path: string, options: CamouCommandOptions = {}): Promise<CamouCookieResult> => this.command('cookies.import', { path }, options),
  };

  readonly storage = {
    local: {
      get: async (key?: string, options: CamouCommandOptions = {}): Promise<CamouStorageResult> => this.browserCommand('storage.local', { ...options, operation: 'get', key }),
      set: async (key: string, value: string, options: CamouCommandOptions = {}): Promise<CamouStorageResult> => this.browserCommand('storage.local', { ...options, operation: 'set', key, value }),
      clear: async (key?: string, options: CamouCommandOptions = {}): Promise<CamouStorageResult> => this.browserCommand('storage.local', { ...options, operation: 'clear', key }),
    },
    session: {
      get: async (key?: string, options: CamouCommandOptions = {}): Promise<CamouStorageResult> => this.browserCommand('storage.session', { ...options, operation: 'get', key }),
      set: async (key: string, value: string, options: CamouCommandOptions = {}): Promise<CamouStorageResult> => this.browserCommand('storage.session', { ...options, operation: 'set', key, value }),
      clear: async (key?: string, options: CamouCommandOptions = {}): Promise<CamouStorageResult> => this.browserCommand('storage.session', { ...options, operation: 'clear', key }),
    },
  };

  readonly state = {
    save: async (path: string, options: CamouCommandOptions = {}): Promise<CamouStateResult> => this.command('state.save', { path }, options),
    load: async (path: string, options: CamouCommandOptions = {}): Promise<CamouStateResult> => this.command('state.load', { path }, options),
    list: async (options: CamouCommandOptions = {}): Promise<CamouStateResult> => this.command('state.list', {}, options, false),
    show: async (path: string, options: CamouCommandOptions = {}): Promise<CamouStateResult> => this.command('state.show', { path }, options, false),
    clear: async (pathOrOptions?: string | ({ all?: boolean | undefined } & CamouCommandOptions), options: CamouCommandOptions = {}): Promise<CamouStateResult> => {
      const payload = typeof pathOrOptions === 'string' ? { ...options, path: pathOrOptions } : (pathOrOptions ?? options);
      return this.command('state.clear', payload, payload);
    },
    clean: async (options: CamouCommandOptions = {}): Promise<CamouStateResult> => this.command('state.clean', {}, options, false),
    rename: async (from: string, to: string, options: CamouCommandOptions = {}): Promise<CamouStateResult> => this.command('state.rename', { from, to }, options, false),
  };

  readonly network = {
    route: async (url: string, options: NetworkRouteOptions = {}): Promise<CamouNetworkResult> => this.browserCommand('network.route', { ...options, url }),
    unroute: async (url?: string, options: CamouCommandOptions = {}): Promise<CamouNetworkResult> => this.command('network.unroute', { url }, options),
    requests: async (options: NetworkRequestsOptions = {}): Promise<CamouNetworkResult> => this.command('network.requests', options, options),
    request: async (requestId: string, options: CamouCommandOptions = {}): Promise<CamouNetworkResult> => this.command('network.request', { requestId }, options),
    har: {
      start: async (options: CamouCommandOptions = {}): Promise<CamouNetworkResult> => this.command('network.har.start', {}, options),
      stop: async (path?: string, options: CamouCommandOptions = {}): Promise<CamouNetworkResult> => this.command('network.har.stop', { path }, options),
    },
  };

  readonly console = {
    list: async (options: CamouCommandOptions = {}): Promise<CamouDebugResult> => this.command('console', { clear: false }, options),
    clear: async (options: CamouCommandOptions = {}): Promise<CamouDebugResult> => this.command('console', { clear: true }, options),
  };

  readonly errors = {
    list: async (options: CamouCommandOptions = {}): Promise<CamouDebugResult> => this.command('errors', { clear: false }, options),
    clear: async (options: CamouCommandOptions = {}): Promise<CamouDebugResult> => this.command('errors', { clear: true }, options),
  };

  async highlight(target: string, options: CamouCommandOptions & { durationMs?: number | undefined } = {}): Promise<CamouDebugResult> {
    return this.browserCommand('highlight', { ...options, target });
  }

  readonly clipboard = {
    read: async (options: CamouCommandOptions = {}): Promise<CamouDebugResult> => this.browserCommand('clipboard.read', options),
    write: async (text: string, options: CamouCommandOptions = {}): Promise<CamouDebugResult> => this.browserCommand('clipboard.write', { ...options, text }),
    copy: async (options: CamouCommandOptions = {}): Promise<CamouDebugResult> => this.browserCommand('clipboard.copy', options),
    paste: async (options: CamouCommandOptions = {}): Promise<CamouDebugResult> => this.browserCommand('clipboard.paste', options),
  };

  readonly trace = {
    start: async (options: TraceStartOptions = {}): Promise<CamouArtifactResult> => this.command('trace.start', options, options),
    stop: async (path?: string, options: CamouCommandOptions = {}): Promise<CamouArtifactResult> => this.command('trace.stop', { path }, options),
  };

  readonly diff = {
    snapshot: async (options: DiffSnapshotOptions = {}): Promise<CamouArtifactResult> => this.browserCommand('diff.snapshot', options),
    screenshot: async (options: DiffScreenshotOptions): Promise<CamouArtifactResult> => this.browserCommand('diff.screenshot', options),
    url: async (leftUrl: string, rightUrl: string, options: DiffUrlOptions = {}): Promise<CamouArtifactResult> => this.browserCommand('diff.url', { ...options, leftUrl, rightUrl }),
  };

  async vitals(options: CamouCommandOptions = {}): Promise<CamouDebugResult> {
    return this.browserCommand('vitals', options);
  }

  async pushState(url: string, options: CamouCommandOptions = {}): Promise<CamouActionResult> {
    return this.browserCommand('pushstate', { ...options, url });
  }

  readonly initScripts = {
    add: async (source: string, options: CamouCommandOptions = {}): Promise<CamouArtifactResult> => this.browserCommand('addinitscript', { ...options, source }),
    remove: async (scriptId: string, options: CamouCommandOptions = {}): Promise<CamouArtifactResult> => this.command('removeinitscript', { scriptId }, options),
  };

  readonly sessionApi = {
    current: async (): Promise<CamouSessionResult> => ({ sessionName: this.sessionName }),
    id: async (options: SessionIdOptions = {}): Promise<CamouSessionResult> => ({ sessionName: await resolveSessionId(options) }),
    info: async (options: CamouCommandOptions = {}): Promise<CamouSessionResult> => this.command('session.info', {}, options),
    list: async (options: CamouCommandOptions = {}): Promise<CamouSessionResult> => this.command('session.list', {}, options, false),
    stop: async (session?: string, options: CamouCommandOptions = {}): Promise<CamouSessionResult> => this.command('session.stop', {}, { ...options, session: session ?? options.session }),
    stopAll: async (options: CamouCommandOptions = {}): Promise<CamouSessionResult> => this.command('session.stopAll', {}, options, false),
  };

  readonly session = this.sessionApi;

  async close(options: CamouCommandOptions = {}): Promise<CamouSessionResult> {
    return this.command('session.stop', {}, options);
  }

  async closeAll(options: CamouCommandOptions = {}): Promise<CamouSessionResult> {
    return this.command('session.stopAll', {}, options, false);
  }

  readonly tab = {
    list: async (options: CamouCommandOptions = {}): Promise<CamouTabResult> => this.command('tab.list', {}, options),
    new: async (options: CamouCommandOptions & { url?: string | undefined; label?: string | undefined } = {}): Promise<CamouTabResult> => this.browserCommand('tab.new', options),
    switch: async (target: string, options: CamouCommandOptions = {}): Promise<CamouTabResult> => this.command('tab.activate', { target }, options),
    close: async (target?: string, options: CamouCommandOptions = {}): Promise<CamouTabResult> => this.command('tab.close', { target }, options),
  };

  readonly window = {
    new: async (options: CamouCommandOptions & { url?: string | undefined; label?: string | undefined } = {}): Promise<CamouTabResult> => this.browserCommand('window.new', options),
  };

  readonly profile = {
    list: async (options: CamouCommandOptions = {}): Promise<CamouProfileResult> => this.command('profile.list', {}, options, false),
    inspect: async (profile: string, options: CamouCommandOptions = {}): Promise<CamouProfileResult> => this.command('profile.inspect', { profile }, options, false),
    remove: async (profile: string, options: CamouCommandOptions = {}): Promise<CamouProfileResult> => this.command('profile.remove', { profile }, options, false),
  };

  private browserCommand<T extends object>(action: string, payload: RequestPayload): Promise<T> {
    return this.command<T>(action, { ...this.launchDefaults, ...payload }, payload as CamouCommandOptions, true, true, true);
  }

  private async command<T extends object>(
    action: string,
    payload: RequestPayload,
    options: CamouCommandOptions,
    includeSession = true,
    preservePayloadTimeout = false,
    includeTabName = false,
  ): Promise<T> {
    await ensureBasePaths(this.paths);
    if (this.autoStartDaemon) {
      await ensureDaemonRunning(this.paths, this.verbose);
    }

    const commandPayload = preservePayloadTimeout ? payload : omitClientControls(payload);
    const request = omitUndefined({
      action,
      ...commandPayload,
      ...(includeSession ? { session: options.session ?? this.sessionName } : {}),
      ...(includeTabName && (options.tabName ?? this.tabName) ? { tabName: options.tabName ?? this.tabName } : {}),
    });

    return await sendDaemonRequest(this.paths, request as never, options.timeoutMs ?? this.timeoutMs) as T;
  }
}

export function createCamouClient(options: CamouClientOptions = {}): CamouClient {
  return new CamouClient(options);
}

export async function withCamouClient<T>(
  options: CamouClientOptions,
  callback: (client: CamouClient) => Promise<T> | T,
): Promise<T> {
  const client = createCamouClient(options);
  return await callback(client);
}
