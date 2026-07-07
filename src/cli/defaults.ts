import path from 'node:path';
import { access, readFile } from 'node:fs/promises';

import { z } from 'zod';

import { fingerprintLocalesValueSchema } from '../camoufox/fingerprint.js';
import { ValidationError } from '../util/errors.js';
import type { SharedOptions } from './program.js';

const presetValueSchema = z.union([z.string().min(1), z.array(z.string().min(1))]);
const headerMapSchema = z.record(z.string(), z.string());
const initScriptValueSchema = z.union([z.string().min(1), z.array(z.string().min(1))]);

const configDefaultsSchema = z.object({
  session: z.string().min(1).optional(),
  tab: z.string().min(1).optional(),
  tabname: z.string().min(1).optional(),
  browser: z.string().min(1).optional(),
  headless: z.boolean().optional(),
  proxy: z.string().min(1).optional(),
  proxyBypass: z.string().min(1).optional(),
  headers: z.union([z.string().min(1), headerMapSchema]).optional(),
  userAgent: z.string().min(1).optional(),
  ignoreHTTPSErrors: z.boolean().optional(),
  ignoreHttpsErrors: z.boolean().optional(),
  colorScheme: z.enum(['dark', 'light', 'no-preference']).optional(),
  reducedMotion: z.enum(['reduce', 'no-preference']).optional(),
  initScript: initScriptValueSchema.optional(),
  initScripts: initScriptValueSchema.optional(),
  state: z.string().min(1).optional(),
  preset: presetValueSchema.optional(),
  presets: presetValueSchema.optional(),
  fingerprint: z.string().min(1).optional(),
  fingerprintJson: z.string().min(1).optional(),
  locales: fingerprintLocalesValueSchema.optional(),
  region: z.string().min(1).optional(),
  screenProfile: z.string().min(1).optional(),
  windowProfile: z.string().min(1).optional(),
  blockImages: z.boolean().optional(),
  blockWebRtc: z.boolean().optional(),
  blockWebGl: z.boolean().optional(),
  disableCoop: z.boolean().optional(),
  defaults: z.object({
    session: z.string().min(1).optional(),
    tab: z.string().min(1).optional(),
    tabname: z.string().min(1).optional(),
    browser: z.string().min(1).optional(),
    headless: z.boolean().optional(),
    proxy: z.string().min(1).optional(),
    proxyBypass: z.string().min(1).optional(),
    headers: z.union([z.string().min(1), headerMapSchema]).optional(),
    userAgent: z.string().min(1).optional(),
    ignoreHTTPSErrors: z.boolean().optional(),
    ignoreHttpsErrors: z.boolean().optional(),
    colorScheme: z.enum(['dark', 'light', 'no-preference']).optional(),
    reducedMotion: z.enum(['reduce', 'no-preference']).optional(),
    initScript: initScriptValueSchema.optional(),
    initScripts: initScriptValueSchema.optional(),
    state: z.string().min(1).optional(),
    preset: presetValueSchema.optional(),
    presets: presetValueSchema.optional(),
    fingerprint: z.string().min(1).optional(),
    fingerprintJson: z.string().min(1).optional(),
    locales: fingerprintLocalesValueSchema.optional(),
    region: z.string().min(1).optional(),
    screenProfile: z.string().min(1).optional(),
    windowProfile: z.string().min(1).optional(),
    blockImages: z.boolean().optional(),
    blockWebRtc: z.boolean().optional(),
    blockWebGl: z.boolean().optional(),
    disableCoop: z.boolean().optional(),
  }).optional(),
});

const CONFIG_FILE_NAMES = ['.camou.json', 'camou.json'] as const;

export interface ResolvedCliDefaults {
  session: string;
  tabname: string;
  tabnameSource: 'cli' | 'env' | 'config' | 'builtin';
  browser?: string | undefined;
  headless?: boolean | undefined;
  proxy?: string | undefined;
  proxyBypass?: string | undefined;
  headers?: string | undefined;
  userAgent?: string | undefined;
  ignoreHttpsErrors?: boolean | undefined;
  colorScheme?: 'dark' | 'light' | 'no-preference' | undefined;
  reducedMotion?: 'reduce' | 'no-preference' | undefined;
  initScript?: string[] | undefined;
  state?: string | undefined;
  preset?: string[] | undefined;
  fingerprint?: string | undefined;
  fingerprintJson?: string | undefined;
  locales?: string[] | undefined;
  region?: string | undefined;
  screenProfile?: string | undefined;
  windowProfile?: string | undefined;
  blockImages?: boolean | undefined;
  blockWebRtc?: boolean | undefined;
  blockWebGl?: boolean | undefined;
  disableCoop?: boolean | undefined;
  defaultsFilePath?: string | undefined;
}

export interface ResolveCliDefaultsOptions {
  cwd?: string | undefined;
  env?: NodeJS.ProcessEnv | undefined;
}

function trimValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizePresetValues(value: string | string[] | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const items = (Array.isArray(value) ? value : value.split(','))
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? [...new Set(items)] : undefined;
}

function normalizeLocalesValue(value: string | string[] | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const items = (Array.isArray(value) ? value : value.split(','))
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? [...new Set(items)] : undefined;
}

function normalizeHeaderValue(value: string | Record<string, string> | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function normalizeInitScriptValues(value: string | string[] | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
}

function parseBooleanEnvValue(name: string, value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  throw new ValidationError(`Invalid boolean value for ${name}: ${value}. Use true/false, 1/0, yes/no, or on/off.`);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findNearestConfigFile(cwd: string): Promise<string | undefined> {
  let currentDir = path.resolve(cwd);

  while (true) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const candidate = path.join(currentDir, fileName);
      if (await fileExists(candidate)) {
        return candidate;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return undefined;
    }

    currentDir = parentDir;
  }
}

async function loadConfigDefaults(cwd: string): Promise<{
  session?: string;
  tabname?: string;
  browser?: string;
  headless?: boolean;
  proxy?: string;
  proxyBypass?: string;
  headers?: string;
  userAgent?: string;
  ignoreHttpsErrors?: boolean;
  colorScheme?: 'dark' | 'light' | 'no-preference';
  reducedMotion?: 'reduce' | 'no-preference';
  initScript?: string[];
  state?: string;
  preset?: string[];
  fingerprint?: string;
  fingerprintJson?: string;
  locales?: string[];
  region?: string;
  screenProfile?: string;
  windowProfile?: string;
  blockImages?: boolean;
  blockWebRtc?: boolean;
  blockWebGl?: boolean;
  disableCoop?: boolean;
  defaultsFilePath?: string | undefined;
}> {
  const configPath = await findNearestConfigFile(cwd);
  if (!configPath) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(configPath, 'utf8'));
  } catch (error) {
    throw new ValidationError(`Unable to read Camou project defaults from ${configPath}.`, { configPath }, error);
  }

  const result = configDefaultsSchema.safeParse(parsed);
  if (!result.success) {
    throw new ValidationError(`Invalid Camou project defaults in ${configPath}. Expected JSON like {"session":"...","tabname":"..."}.`);
  }

  const session = trimValue(result.data.session ?? result.data.defaults?.session);
  const tabname = trimValue(result.data.tabname ?? result.data.tab ?? result.data.defaults?.tabname ?? result.data.defaults?.tab);
  const browser = trimValue(result.data.browser ?? result.data.defaults?.browser);
  const headless = result.data.headless ?? result.data.defaults?.headless;
  const proxy = trimValue(result.data.proxy ?? result.data.defaults?.proxy);
  const proxyBypass = trimValue(result.data.proxyBypass ?? result.data.defaults?.proxyBypass);
  const headers = normalizeHeaderValue(result.data.headers ?? result.data.defaults?.headers);
  const userAgent = trimValue(result.data.userAgent ?? result.data.defaults?.userAgent);
  const ignoreHttpsErrors =
    result.data.ignoreHTTPSErrors ??
    result.data.ignoreHttpsErrors ??
    result.data.defaults?.ignoreHTTPSErrors ??
    result.data.defaults?.ignoreHttpsErrors;
  const colorScheme = result.data.colorScheme ?? result.data.defaults?.colorScheme;
  const reducedMotion = result.data.reducedMotion ?? result.data.defaults?.reducedMotion;
  const initScript = normalizeInitScriptValues(
    result.data.initScripts ?? result.data.initScript ?? result.data.defaults?.initScripts ?? result.data.defaults?.initScript,
  );
  const state = trimValue(result.data.state ?? result.data.defaults?.state);
  const preset = normalizePresetValues(
    result.data.preset ?? result.data.presets ?? result.data.defaults?.preset ?? result.data.defaults?.presets,
  );
  const fingerprint = trimValue(result.data.fingerprint ?? result.data.defaults?.fingerprint);
  const fingerprintJson = trimValue(result.data.fingerprintJson ?? result.data.defaults?.fingerprintJson);
  const locales = normalizeLocalesValue(result.data.locales ?? result.data.defaults?.locales);
  const region = trimValue(result.data.region ?? result.data.defaults?.region);
  const screenProfile = trimValue(result.data.screenProfile ?? result.data.defaults?.screenProfile);
  const windowProfile = trimValue(result.data.windowProfile ?? result.data.defaults?.windowProfile);
  const blockImages = result.data.blockImages ?? result.data.defaults?.blockImages;
  const blockWebRtc = result.data.blockWebRtc ?? result.data.defaults?.blockWebRtc;
  const blockWebGl = result.data.blockWebGl ?? result.data.defaults?.blockWebGl;
  const disableCoop = result.data.disableCoop ?? result.data.defaults?.disableCoop;

  return {
    ...(session ? { session } : {}),
    ...(tabname ? { tabname } : {}),
    ...(browser ? { browser } : {}),
    ...(headless !== undefined ? { headless } : {}),
    ...(proxy ? { proxy } : {}),
    ...(proxyBypass ? { proxyBypass } : {}),
    ...(headers ? { headers } : {}),
    ...(userAgent ? { userAgent } : {}),
    ...(ignoreHttpsErrors !== undefined ? { ignoreHttpsErrors } : {}),
    ...(colorScheme ? { colorScheme } : {}),
    ...(reducedMotion ? { reducedMotion } : {}),
    ...(initScript ? { initScript } : {}),
    ...(state ? { state } : {}),
    ...(preset ? { preset } : {}),
    ...(fingerprint ? { fingerprint } : {}),
    ...(fingerprintJson ? { fingerprintJson } : {}),
    ...(locales ? { locales } : {}),
    ...(region ? { region } : {}),
    ...(screenProfile ? { screenProfile } : {}),
    ...(windowProfile ? { windowProfile } : {}),
    ...(blockImages !== undefined ? { blockImages } : {}),
    ...(blockWebRtc !== undefined ? { blockWebRtc } : {}),
    ...(blockWebGl !== undefined ? { blockWebGl } : {}),
    ...(disableCoop !== undefined ? { disableCoop } : {}),
    defaultsFilePath: configPath,
  };
}

function readEnvDefault(env: NodeJS.ProcessEnv, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = trimValue(env[name]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function readEnvBoolean(env: NodeJS.ProcessEnv, ...names: string[]): boolean | undefined {
  for (const name of names) {
    const value = trimValue(env[name]);
    if (value !== undefined) {
      return parseBooleanEnvValue(name, value);
    }
  }

  return undefined;
}

function readEnvPreset(env: NodeJS.ProcessEnv, ...names: string[]): string[] | undefined {
  for (const name of names) {
    const value = trimValue(env[name]);
    if (value !== undefined) {
      return normalizePresetValues(value);
    }
  }

  return undefined;
}

function readEnvLocales(env: NodeJS.ProcessEnv, ...names: string[]): string[] | undefined {
  for (const name of names) {
    const value = trimValue(env[name]);
    if (value !== undefined) {
      return normalizeLocalesValue(value);
    }
  }

  return undefined;
}

function readEnvChoice<T extends string>(env: NodeJS.ProcessEnv, allowed: readonly T[], ...names: string[]): T | undefined {
  for (const name of names) {
    const value = trimValue(env[name]);
    if (value !== undefined) {
      if (allowed.includes(value as T)) {
        return value as T;
      }
      throw new ValidationError(`Invalid value for ${name}: ${value}. Use one of: ${allowed.join(', ')}.`);
    }
  }

  return undefined;
}

export async function resolveSharedOptions(
  options: SharedOptions,
  resolveOptions: ResolveCliDefaultsOptions = {},
): Promise<ResolvedCliDefaults & SharedOptions> {
  const cwd = resolveOptions.cwd ?? process.cwd();
  const env = resolveOptions.env ?? process.env;
  const configDefaults = await loadConfigDefaults(cwd);

  const session =
    trimValue(options.session) ??
    readEnvDefault(env, 'CAMOU_SESSION', 'CAMOUCLI_SESSION') ??
    configDefaults.session ??
    'default';

  const cliTabname = trimValue(options.tabname);
  const envTabname = readEnvDefault(env, 'CAMOU_TAB', 'CAMOU_TABNAME', 'CAMOUCLI_TAB', 'CAMOUCLI_TABNAME');
  const tabname = cliTabname ?? envTabname ?? configDefaults.tabname ?? 'main';
  const tabnameSource = cliTabname ? 'cli' : envTabname ? 'env' : configDefaults.tabname ? 'config' : 'builtin';

  const browser =
    trimValue(options.browser) ??
    readEnvDefault(env, 'CAMOU_BROWSER', 'CAMOUCLI_BROWSER') ??
    configDefaults.browser;

  const headless =
    (options.headed === true ? false : options.headless !== undefined ? options.headless : undefined) ??
    readEnvBoolean(env, 'CAMOU_HEADLESS', 'CAMOUCLI_HEADLESS') ??
    configDefaults.headless;

  const proxy =
    trimValue(options.proxy) ??
    readEnvDefault(env, 'CAMOU_PROXY', 'CAMOUCLI_PROXY') ??
    configDefaults.proxy;

  const proxyBypass =
    trimValue(options.proxyBypass) ??
    readEnvDefault(env, 'CAMOU_PROXY_BYPASS', 'CAMOUCLI_PROXY_BYPASS') ??
    configDefaults.proxyBypass;

  const headers =
    trimValue(options.headers) ??
    readEnvDefault(env, 'CAMOU_HEADERS', 'CAMOUCLI_HEADERS') ??
    configDefaults.headers;

  const userAgent =
    trimValue(options.userAgent) ??
    readEnvDefault(env, 'CAMOU_USER_AGENT', 'CAMOUCLI_USER_AGENT') ??
    configDefaults.userAgent;

  const ignoreHttpsErrors =
    (options.ignoreHttpsErrors !== undefined ? options.ignoreHttpsErrors : undefined) ??
    readEnvBoolean(env, 'CAMOU_IGNORE_HTTPS_ERRORS', 'CAMOUCLI_IGNORE_HTTPS_ERRORS') ??
    configDefaults.ignoreHttpsErrors;

  const colorScheme =
    options.colorScheme ??
    readEnvChoice(env, ['dark', 'light', 'no-preference'], 'CAMOU_COLOR_SCHEME', 'CAMOUCLI_COLOR_SCHEME') ??
    configDefaults.colorScheme;

  const reducedMotion =
    options.reducedMotion ??
    readEnvChoice(env, ['reduce', 'no-preference'], 'CAMOU_REDUCED_MOTION', 'CAMOUCLI_REDUCED_MOTION') ??
    configDefaults.reducedMotion;

  const initScript =
    normalizeInitScriptValues(options.initScript) ??
    readEnvPreset(env, 'CAMOU_INIT_SCRIPT', 'CAMOU_INIT_SCRIPTS', 'CAMOUCLI_INIT_SCRIPT', 'CAMOUCLI_INIT_SCRIPTS') ??
    configDefaults.initScript;

  const state =
    trimValue(options.state) ??
    readEnvDefault(env, 'CAMOU_STATE', 'CAMOUCLI_STATE') ??
    configDefaults.state;

  const preset =
    normalizePresetValues(options.preset) ??
    readEnvPreset(env, 'CAMOU_PRESET', 'CAMOU_PRESETS', 'CAMOUCLI_PRESET', 'CAMOUCLI_PRESETS') ??
    configDefaults.preset;

  const fingerprint =
    trimValue(options.fingerprint) ??
    readEnvDefault(env, 'CAMOU_FINGERPRINT', 'CAMOUCLI_FINGERPRINT') ??
    configDefaults.fingerprint;

  const fingerprintJson =
    trimValue(options.fingerprintJson) ??
    readEnvDefault(env, 'CAMOU_FINGERPRINT_JSON', 'CAMOUCLI_FINGERPRINT_JSON') ??
    configDefaults.fingerprintJson;

  const locales =
    normalizeLocalesValue(options.locales) ??
    readEnvLocales(env, 'CAMOU_LOCALES', 'CAMOUCLI_LOCALES') ??
    configDefaults.locales;

  const region =
    trimValue(options.region) ??
    readEnvDefault(env, 'CAMOU_REGION', 'CAMOUCLI_REGION') ??
    configDefaults.region;

  const screenProfile =
    trimValue(options.screenProfile) ??
    readEnvDefault(env, 'CAMOU_SCREEN_PROFILE', 'CAMOUCLI_SCREEN_PROFILE') ??
    configDefaults.screenProfile;

  const windowProfile =
    trimValue(options.windowProfile) ??
    readEnvDefault(env, 'CAMOU_WINDOW_PROFILE', 'CAMOUCLI_WINDOW_PROFILE') ??
    configDefaults.windowProfile;

  const blockImages =
    (options.blockImages !== undefined ? options.blockImages : undefined) ??
    readEnvBoolean(env, 'CAMOU_BLOCK_IMAGES', 'CAMOUCLI_BLOCK_IMAGES') ??
    configDefaults.blockImages;

  const blockWebRtc =
    (options.blockWebrtc !== undefined ? options.blockWebrtc : undefined) ??
    readEnvBoolean(env, 'CAMOU_BLOCK_WEBRTC', 'CAMOUCLI_BLOCK_WEBRTC') ??
    configDefaults.blockWebRtc;

  const blockWebGl =
    (options.blockWebgl !== undefined ? options.blockWebgl : undefined) ??
    readEnvBoolean(env, 'CAMOU_BLOCK_WEBGL', 'CAMOUCLI_BLOCK_WEBGL') ??
    configDefaults.blockWebGl;

  const disableCoop =
    (options.disableCoop !== undefined ? options.disableCoop : undefined) ??
    readEnvBoolean(env, 'CAMOU_DISABLE_COOP', 'CAMOUCLI_DISABLE_COOP') ??
    configDefaults.disableCoop;

  return {
    ...options,
    session,
    tabname,
    tabnameSource,
    ...(browser ? { browser } : {}),
    ...(headless !== undefined ? { headless } : {}),
    ...(proxy ? { proxy } : {}),
    ...(proxyBypass ? { proxyBypass } : {}),
    ...(headers ? { headers } : {}),
    ...(userAgent ? { userAgent } : {}),
    ...(ignoreHttpsErrors !== undefined ? { ignoreHttpsErrors } : {}),
    ...(colorScheme ? { colorScheme } : {}),
    ...(reducedMotion ? { reducedMotion } : {}),
    ...(initScript ? { initScript } : {}),
    ...(state ? { state } : {}),
    ...(preset ? { preset } : {}),
    ...(fingerprint ? { fingerprint } : {}),
    ...(fingerprintJson ? { fingerprintJson } : {}),
    ...(locales ? { locales } : {}),
    ...(region ? { region } : {}),
    ...(screenProfile ? { screenProfile } : {}),
    ...(windowProfile ? { windowProfile } : {}),
    ...(blockImages !== undefined ? { blockImages } : {}),
    ...(blockWebRtc !== undefined ? { blockWebRtc } : {}),
    ...(blockWebGl !== undefined ? { blockWebGl } : {}),
    ...(disableCoop !== undefined ? { disableCoop } : {}),
    defaultsFilePath: configDefaults.defaultsFilePath,
  };
}

export async function findCamouConfigFile(cwd: string = process.cwd()): Promise<string | undefined> {
  return findNearestConfigFile(cwd);
}

const ACTION_REQUIRES_SESSION = new Set([
  'open',
  'back',
  'forward',
  'reload',
  'snapshot',
  'click',
  'download',
  'dblclick',
  'hover',
  'focus',
  'fill',
  'type',
  'check',
  'uncheck',
  'select',
  'press',
  'keyboard.down',
  'keyboard.up',
  'keyboard.type',
  'keyboard.insertText',
  'mouse.move',
  'mouse.down',
  'mouse.up',
  'mouse.wheel',
  'scroll',
  'scroll.intoView',
  'upload',
  'drag',
  'screenshot',
  'diff.snapshot',
  'diff.screenshot',
  'diff.url',
  'console',
  'errors',
  'highlight',
  'clipboard.read',
  'clipboard.write',
  'clipboard.copy',
  'clipboard.paste',
  'get.url',
  'get.title',
  'get.text',
  'get.value',
  'get.html',
  'get.attr',
  'get.count',
  'get.box',
  'get.styles',
  'is.visible',
  'is.enabled',
  'is.checked',
  'wait',
  'runtime.set',
  'frame',
  'dialog.status',
  'dialog.accept',
  'dialog.dismiss',
  'read',
  'find',
  'eval',
  'vitals',
  'pushstate',
  'addinitscript',
  'removeinitscript',
  'network.route',
  'network.unroute',
  'network.requests',
  'network.request',
  'network.har.start',
  'network.har.stop',
  'trace.start',
  'trace.stop',
  'session.stop',
  'session.info',
  'cookies.set',
  'cookies.export',
  'cookies.import',
  'storage.local',
  'storage.session',
  'tab.list',
  'tab.new',
  'tab.close',
  'tab.activate',
  'window.new',
]);

const ACTION_REQUIRES_TAB = new Set([
  'open',
  'back',
  'forward',
  'reload',
  'snapshot',
  'click',
  'download',
  'dblclick',
  'hover',
  'focus',
  'fill',
  'type',
  'check',
  'uncheck',
  'select',
  'press',
  'keyboard.down',
  'keyboard.up',
  'keyboard.type',
  'keyboard.insertText',
  'mouse.move',
  'mouse.down',
  'mouse.up',
  'mouse.wheel',
  'scroll',
  'scroll.intoView',
  'upload',
  'drag',
  'screenshot',
  'diff.snapshot',
  'diff.screenshot',
  'diff.url',
  'highlight',
  'clipboard.read',
  'clipboard.write',
  'clipboard.copy',
  'clipboard.paste',
  'get.url',
  'get.title',
  'get.text',
  'get.value',
  'get.html',
  'get.attr',
  'get.count',
  'get.box',
  'get.styles',
  'is.visible',
  'is.enabled',
  'is.checked',
  'wait',
  'runtime.set',
  'frame',
  'dialog.status',
  'dialog.accept',
  'dialog.dismiss',
  'read',
  'find',
  'eval',
  'vitals',
  'pushstate',
  'cookies.set',
  'storage.local',
  'storage.session',
]);

const ACTION_SUPPORTS_LAUNCH_DEFAULTS = new Set([
  'open',
  'back',
  'forward',
  'reload',
  'snapshot',
  'click',
  'download',
  'dblclick',
  'hover',
  'focus',
  'fill',
  'type',
  'check',
  'uncheck',
  'select',
  'press',
  'keyboard.down',
  'keyboard.up',
  'keyboard.type',
  'keyboard.insertText',
  'mouse.move',
  'mouse.down',
  'mouse.up',
  'mouse.wheel',
  'scroll',
  'scroll.intoView',
  'upload',
  'drag',
  'screenshot',
  'diff.snapshot',
  'diff.screenshot',
  'diff.url',
  'highlight',
  'clipboard.read',
  'clipboard.write',
  'clipboard.copy',
  'clipboard.paste',
  'get.url',
  'get.title',
  'get.text',
  'get.value',
  'get.html',
  'get.attr',
  'get.count',
  'get.box',
  'get.styles',
  'is.visible',
  'is.enabled',
  'is.checked',
  'wait',
  'frame',
  'dialog.status',
  'dialog.accept',
  'dialog.dismiss',
  'read',
  'find',
  'eval',
  'vitals',
  'pushstate',
  'addinitscript',
  'cookies.set',
  'storage.local',
  'storage.session',
  'network.route',
  'trace.start',
  'tab.new',
  'window.new',
]);

export function applyCliDefaultsToPayload(
  action: string,
  payload: Record<string, unknown>,
  options: ResolvedCliDefaults & SharedOptions,
): Record<string, unknown> {
  const nextPayload = { ...payload };

  if (ACTION_REQUIRES_SESSION.has(action) && nextPayload.session === undefined) {
    nextPayload.session = options.session;
  }

  if (ACTION_REQUIRES_TAB.has(action) && nextPayload.tabName === undefined && options.tabnameSource !== 'builtin') {
    nextPayload.tabName = options.tabname;
  }

  if (ACTION_SUPPORTS_LAUNCH_DEFAULTS.has(action)) {
    if (nextPayload.browser === undefined && options.browser !== undefined) {
      nextPayload.browser = options.browser;
    }

    if (nextPayload.headless === undefined && options.headless !== undefined) {
      nextPayload.headless = options.headless;
    }

    if (nextPayload.proxy === undefined && options.proxy !== undefined) {
      nextPayload.proxy = options.proxy;
    }

    if (nextPayload.proxyBypass === undefined && options.proxyBypass !== undefined) {
      nextPayload.proxyBypass = options.proxyBypass;
    }

    if (nextPayload.headers === undefined && options.headers !== undefined) {
      nextPayload.headers = options.headers;
    }

    if (nextPayload.userAgent === undefined && options.userAgent !== undefined) {
      nextPayload.userAgent = options.userAgent;
    }

    if (nextPayload.ignoreHTTPSErrors === undefined && options.ignoreHttpsErrors !== undefined) {
      nextPayload.ignoreHTTPSErrors = options.ignoreHttpsErrors;
    }

    if (nextPayload.colorScheme === undefined && options.colorScheme !== undefined) {
      nextPayload.colorScheme = options.colorScheme;
    }

    if (nextPayload.reducedMotion === undefined && options.reducedMotion !== undefined) {
      nextPayload.reducedMotion = options.reducedMotion;
    }

    if (nextPayload.initScripts === undefined && options.initScript !== undefined) {
      nextPayload.initScripts = options.initScript;
    }

    if (nextPayload.state === undefined && options.state !== undefined) {
      nextPayload.state = options.state;
    }

    const currentPreset = Array.isArray(nextPayload.preset)
      ? nextPayload.preset.map((item) => String(item)).filter(Boolean)
      : undefined;
    if ((!currentPreset || currentPreset.length === 0) && options.preset && options.preset.length > 0) {
      nextPayload.preset = options.preset;
    }

    if (nextPayload.fingerprintPath === undefined && options.fingerprint !== undefined) {
      nextPayload.fingerprintPath = options.fingerprint;
    }

    if (nextPayload.fingerprintJson === undefined && options.fingerprintJson !== undefined) {
      nextPayload.fingerprintJson = options.fingerprintJson;
    }

    const currentLocales = Array.isArray(nextPayload.locales)
      ? nextPayload.locales.map((item) => String(item)).filter(Boolean)
      : undefined;
    if ((!currentLocales || currentLocales.length === 0) && options.locales && options.locales.length > 0) {
      nextPayload.locales = options.locales;
    }

    if (nextPayload.region === undefined && options.region !== undefined) {
      nextPayload.region = options.region;
    }

    if (nextPayload.screenProfile === undefined && options.screenProfile !== undefined) {
      nextPayload.screenProfile = options.screenProfile;
    }

    if (nextPayload.windowProfile === undefined && options.windowProfile !== undefined) {
      nextPayload.windowProfile = options.windowProfile;
    }

    if (nextPayload.blockImages === undefined && options.blockImages !== undefined) {
      nextPayload.blockImages = options.blockImages;
    }

    if (nextPayload.blockWebRtc === undefined && options.blockWebRtc !== undefined) {
      nextPayload.blockWebRtc = options.blockWebRtc;
    }

    if (nextPayload.blockWebGl === undefined && options.blockWebGl !== undefined) {
      nextPayload.blockWebGl = options.blockWebGl;
    }

    if (nextPayload.disableCoop === undefined && options.disableCoop !== undefined) {
      nextPayload.disableCoop = options.disableCoop;
    }
  }

  return nextPayload;
}
