import path from 'node:path';
import { access, readFile } from 'node:fs/promises';

import { z } from 'zod';

import { fingerprintLocalesValueSchema } from '../camoufox/fingerprint.js';
import { ValidationError } from '../util/errors.js';
import type { SharedOptions } from './program.js';

const presetValueSchema = z.union([z.string().min(1), z.array(z.string().min(1))]);

const configDefaultsSchema = z.object({
  session: z.string().min(1).optional(),
  tab: z.string().min(1).optional(),
  tabname: z.string().min(1).optional(),
  browser: z.string().min(1).optional(),
  headless: z.boolean().optional(),
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
  browser?: string | undefined;
  headless?: boolean | undefined;
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

  const tabname =
    trimValue(options.tabname) ??
    readEnvDefault(env, 'CAMOU_TAB', 'CAMOU_TABNAME', 'CAMOUCLI_TAB', 'CAMOUCLI_TABNAME') ??
    configDefaults.tabname ??
    'main';

  const browser =
    trimValue(options.browser) ??
    readEnvDefault(env, 'CAMOU_BROWSER', 'CAMOUCLI_BROWSER') ??
    configDefaults.browser;

  const headless =
    (options.headless !== undefined ? options.headless : undefined) ??
    readEnvBoolean(env, 'CAMOU_HEADLESS', 'CAMOUCLI_HEADLESS') ??
    configDefaults.headless;

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
    ...(browser ? { browser } : {}),
    ...(headless !== undefined ? { headless } : {}),
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
  'hover',
  'fill',
  'type',
  'check',
  'uncheck',
  'select',
  'press',
  'scroll',
  'scroll.intoView',
  'screenshot',
  'get.url',
  'get.title',
  'get.text',
  'get.value',
  'wait',
  'eval',
  'session.stop',
  'cookies.export',
  'cookies.import',
  'tab.list',
  'tab.new',
  'tab.close',
]);

const ACTION_REQUIRES_TAB = new Set([
  'open',
  'back',
  'forward',
  'reload',
  'snapshot',
  'click',
  'hover',
  'fill',
  'type',
  'check',
  'uncheck',
  'select',
  'press',
  'scroll',
  'scroll.intoView',
  'screenshot',
  'get.url',
  'get.title',
  'get.text',
  'get.value',
  'wait',
  'eval',
  'tab.new',
]);

const ACTION_SUPPORTS_LAUNCH_DEFAULTS = new Set([
  'open',
  'back',
  'forward',
  'reload',
  'snapshot',
  'click',
  'hover',
  'fill',
  'type',
  'check',
  'uncheck',
  'select',
  'press',
  'scroll',
  'scroll.intoView',
  'screenshot',
  'get.url',
  'get.title',
  'get.text',
  'get.value',
  'wait',
  'eval',
  'tab.new',
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

  if (ACTION_REQUIRES_TAB.has(action) && nextPayload.tabName === undefined) {
    nextPayload.tabName = options.tabname;
  }

  if (action === 'tab.close' && nextPayload.target === undefined) {
    nextPayload.target = options.tabname;
  }

  if (ACTION_SUPPORTS_LAUNCH_DEFAULTS.has(action)) {
    if (nextPayload.browser === undefined && options.browser !== undefined) {
      nextPayload.browser = options.browser;
    }

    if (nextPayload.headless === undefined && options.headless !== undefined) {
      nextPayload.headless = options.headless;
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
