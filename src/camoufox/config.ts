import { readFile } from 'node:fs/promises';

import { z } from 'zod';

import { ValidationError } from '../util/errors.js';
import {
  fingerprintHelperSchema,
  fingerprintLocalesValueSchema,
  fingerprintScreenSchema,
  fingerprintWindowSchema,
  mergeFingerprintHelpers,
  resolveFingerprintHelpers,
  type FingerprintHelperInput,
} from './fingerprint.js';
import { parseFirefoxUserPrefs, type FirefoxUserPrefs } from './prefs.js';
import { resolveCamoufoxPresets } from './presets.js';

const jsonObjectSchema = z.record(z.string(), z.unknown());
const headerMapSchema = z.record(z.string(), z.string());
const storageStateSchema = z.union([
  z.string().min(1),
  z.object({
    cookies: z.array(z.record(z.string(), z.unknown())).default([]),
    origins: z.array(z.record(z.string(), z.unknown())).default([]),
  }),
]);
const initScriptSchema = z.union([z.string().min(1), z.object({ path: z.string().min(1) }), z.object({ content: z.string().min(1) })]);

export const launchInputSchema = z.object({
  headless: z.boolean().optional(),
  configPath: z.string().optional(),
  configJson: z.string().optional(),
  prefsPath: z.string().optional(),
  prefsJson: z.string().optional(),
  fingerprintPath: z.string().optional(),
  fingerprintJson: z.string().optional(),
  fingerprint: fingerprintHelperSchema.optional(),
  preset: z.array(z.string()).optional(),
  proxy: z.string().optional(),
  proxyBypass: z.string().optional(),
  headers: z.union([z.string().min(1), headerMapSchema]).optional(),
  extraHTTPHeaders: headerMapSchema.optional(),
  userAgent: z.string().optional(),
  ignoreHTTPSErrors: z.boolean().optional(),
  colorScheme: z.enum(['dark', 'light', 'no-preference']).optional(),
  reducedMotion: z.enum(['reduce', 'no-preference']).optional(),
  initScript: z.string().optional(),
  initScripts: z.array(initScriptSchema).optional(),
  state: z.string().optional(),
  storageState: storageStateSchema.optional(),
  locale: z.string().optional(),
  locales: fingerprintLocalesValueSchema.optional(),
  region: z.string().optional(),
  timezone: z.string().optional(),
  screenProfile: z.string().optional(),
  screen: z.union([z.string().min(1), fingerprintScreenSchema]).optional(),
  windowProfile: z.string().optional(),
  window: z.union([z.string().min(1), fingerprintWindowSchema]).optional(),
  fonts: z.array(z.string().min(1)).optional(),
  fontSpacingSeed: z.number().int().nonnegative().optional(),
  blockImages: z.boolean().optional(),
  blockWebRtc: z.boolean().optional(),
  blockWebGl: z.boolean().optional(),
  disableCoop: z.boolean().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  browser: z.string().optional(),
}).strict();

export type LaunchInput = z.infer<typeof launchInputSchema>;

export interface ProxySettings {
  server: string;
  bypass?: string;
}

export type InitScriptSpec =
  | { path: string; content?: never }
  | { content: string; path?: never };

export interface ResolvedLaunchConfig {
  headless: boolean;
  browser?: string | undefined;
  presetNames: string[];
  camouConfig: Record<string, unknown>;
  firefoxUserPrefs: FirefoxUserPrefs;
  proxy?: ProxySettings | undefined;
  extraHTTPHeaders?: Record<string, string> | undefined;
  userAgent?: string | undefined;
  ignoreHTTPSErrors?: boolean | undefined;
  colorScheme?: 'dark' | 'light' | 'no-preference' | undefined;
  reducedMotion?: 'reduce' | 'no-preference' | undefined;
  initScripts: InitScriptSpec[];
  storageState?: string | { cookies: Array<Record<string, unknown>>; origins: Array<Record<string, unknown>> } | undefined;
  state?: string | undefined;
  locale?: string | undefined;
  timezoneId?: string | undefined;
  viewport?: {
    width: number;
    height: number;
  } | undefined;
}

function parseJsonString(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new ValidationError(`Unable to parse ${label} JSON.`, undefined, error);
  }
}

export async function loadJsonObjectFile(filePath: string, label: string): Promise<Record<string, unknown>> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    throw new ValidationError(`Unable to read ${label} file at ${filePath}.`, { filePath }, error);
  }

  return parseJsonObjectString(raw, label);
}

export function parseJsonObjectString(raw: string, label: string): Record<string, unknown> {
  const parsed = parseJsonString(raw, label);

  const result = jsonObjectSchema.safeParse(parsed);
  if (!result.success) {
    throw new ValidationError(`${label} must be a JSON object.`);
  }

  return result.data;
}

export function parseExtraHTTPHeaders(
  headers: LaunchInput['headers'],
  extraHTTPHeaders: LaunchInput['extraHTTPHeaders'],
): Record<string, string> | undefined {
  if (headers !== undefined && extraHTTPHeaders !== undefined) {
    throw new ValidationError('Pass either headers or extraHTTPHeaders, not both.');
  }

  const value = headers ?? extraHTTPHeaders;
  if (value === undefined) {
    return undefined;
  }

  const parsed = typeof value === 'string' ? parseJsonString(value, 'headers') : value;
  const result = headerMapSchema.safeParse(parsed);
  if (!result.success) {
    throw new ValidationError('headers must be a JSON object with string values.');
  }

  return result.data;
}

async function resolveFingerprintHelperInput(
  pathValue: string | undefined,
  jsonValue: string | undefined,
  directValue: FingerprintHelperInput | undefined,
): Promise<FingerprintHelperInput | undefined> {
  if (pathValue && jsonValue) {
    throw new ValidationError('Pass either fingerprint path or fingerprint JSON, not both.');
  }

  let parsedValue: FingerprintHelperInput | undefined;
  if (pathValue) {
    let raw: string;
    try {
      raw = await readFile(pathValue, 'utf8');
    } catch (error) {
      throw new ValidationError(`Unable to read fingerprint helper file at ${pathValue}.`, { filePath: pathValue }, error);
    }
    parsedValue = fingerprintHelperSchema.parse(parseJsonString(raw, 'fingerprint helper'));
  } else if (jsonValue) {
    parsedValue = fingerprintHelperSchema.parse(parseJsonString(jsonValue, 'fingerprint helper'));
  }

  return mergeFingerprintHelpers(parsedValue, directValue);
}

function buildLaunchFingerprintHelperInput(input: LaunchInput): FingerprintHelperInput | undefined {
  const flatHelperInput: FingerprintHelperInput = {
    ...(input.locales ? { locales: input.locales } : {}),
    ...(input.region ? { region: input.region } : {}),
    ...(input.screenProfile ? { screenProfile: input.screenProfile } : {}),
    ...(input.screen ? { screen: input.screen } : {}),
    ...(input.windowProfile ? { windowProfile: input.windowProfile } : {}),
    ...(input.window ? { window: input.window } : {}),
    ...(input.fonts ? { fonts: input.fonts } : {}),
    ...(input.fontSpacingSeed !== undefined ? { fontSpacingSeed: input.fontSpacingSeed } : {}),
    ...(input.blockImages !== undefined ? { blockImages: input.blockImages } : {}),
    ...(input.blockWebRtc !== undefined ? { blockWebRtc: input.blockWebRtc } : {}),
    ...(input.blockWebGl !== undefined ? { blockWebGl: input.blockWebGl } : {}),
    ...(input.disableCoop !== undefined ? { disableCoop: input.disableCoop } : {}),
  };

  return Object.keys(flatHelperInput).length > 0 ? flatHelperInput : undefined;
}

export function hasLaunchFingerprintHelpers(input: LaunchInput): boolean {
  return Boolean(
    input.fingerprintPath ||
      input.fingerprintJson ||
      input.fingerprint ||
      input.locales ||
      input.region ||
      input.screenProfile ||
      input.screen ||
      input.windowProfile ||
      input.window ||
      input.fonts ||
      input.fontSpacingSeed !== undefined ||
      input.blockImages !== undefined ||
      input.blockWebRtc !== undefined ||
      input.blockWebGl !== undefined ||
      input.disableCoop !== undefined,
  );
}

export async function resolveJsonObjectInput(
  pathValue: string | undefined,
  jsonValue: string | undefined,
  label: string,
): Promise<Record<string, unknown>> {
  if (pathValue && jsonValue) {
    throw new ValidationError(`Pass either ${label} path or ${label} JSON, not both.`);
  }

  if (pathValue) {
    return loadJsonObjectFile(pathValue, label);
  }

  if (jsonValue) {
    return parseJsonObjectString(jsonValue, label);
  }

  return {};
}

export function parseProxyString(proxy?: string, proxyBypass?: string): ProxySettings | undefined {
  if (!proxy) {
    if (proxyBypass) {
      throw new ValidationError('proxyBypass requires proxy.');
    }
    return undefined;
  }

  try {
    const url = new URL(proxy);
    if (!['http:', 'https:', 'socks5:', 'socks4:'].includes(url.protocol)) {
      throw new Error(`Unsupported protocol ${url.protocol}`);
    }
    return { server: url.toString(), ...(proxyBypass ? { bypass: proxyBypass } : {}) };
  } catch (error) {
    throw new ValidationError(`Invalid proxy URL: ${proxy}`, undefined, error);
  }
}

export function resolveInitScripts(input: LaunchInput): InitScriptSpec[] {
  const scripts: InitScriptSpec[] = [];

  if (input.initScript) {
    scripts.push({ path: input.initScript });
  }

  for (const script of input.initScripts ?? []) {
    if (typeof script === 'string') {
      scripts.push({ path: script });
    } else {
      scripts.push(script);
    }
  }

  return scripts;
}

export function validateLocale(locale?: string): string | undefined {
  if (!locale) {
    return undefined;
  }

  if (Intl.DateTimeFormat.supportedLocalesOf([locale]).length === 0) {
    throw new ValidationError(`Invalid locale: ${locale}`);
  }

  return locale;
}

export function validateTimezone(timezone?: string): string | undefined {
  if (!timezone) {
    return undefined;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
  } catch (error) {
    throw new ValidationError(`Invalid timezone: ${timezone}`, undefined, error);
  }

  return timezone;
}

export async function resolveLaunchConfig(input: LaunchInput): Promise<ResolvedLaunchConfig> {
  const presets = resolveCamoufoxPresets(input.preset);
  const rawConfig = await resolveJsonObjectInput(input.configPath, input.configJson, 'config');
  const rawPrefs = await resolveJsonObjectInput(input.prefsPath, input.prefsJson, 'prefs');
  if (input.locale && input.locales) {
    throw new ValidationError('Pass either locale or locales, not both.');
  }
  if (input.state !== undefined && input.storageState !== undefined) {
    throw new ValidationError('Pass either state or storageState, not both.');
  }

  const helperInput = mergeFingerprintHelpers(
    await resolveFingerprintHelperInput(input.fingerprintPath, input.fingerprintJson, input.fingerprint),
    buildLaunchFingerprintHelperInput({
      ...input,
      ...(input.locale ? { locales: [input.locale] } : {}),
    }),
  );
  const fingerprintHelpers = resolveFingerprintHelpers(helperInput);
  const camouConfig = {
    ...presets.camouConfig,
    ...fingerprintHelpers.camouConfig,
    ...rawConfig,
  };
  const firefoxUserPrefs = parseFirefoxUserPrefs({
    ...presets.firefoxUserPrefs,
    ...fingerprintHelpers.firefoxUserPrefs,
    ...rawPrefs,
  });
  const viewport = input.width && input.height ? { width: input.width, height: input.height } : fingerprintHelpers.viewport;

  if ((input.width && !input.height) || (!input.width && input.height)) {
    throw new ValidationError('Both width and height are required when setting window size.');
  }

  if (viewport) {
    camouConfig['window.innerWidth'] = viewport.width;
    camouConfig['window.innerHeight'] = viewport.height;
  }

  return {
    headless: input.headless ?? false,
    browser: input.browser,
    presetNames: presets.presetNames,
    camouConfig,
    firefoxUserPrefs,
    proxy: parseProxyString(input.proxy, input.proxyBypass),
    extraHTTPHeaders: parseExtraHTTPHeaders(input.headers, input.extraHTTPHeaders),
    ...(input.userAgent ? { userAgent: input.userAgent } : {}),
    ...(input.ignoreHTTPSErrors !== undefined ? { ignoreHTTPSErrors: input.ignoreHTTPSErrors } : {}),
    ...(input.colorScheme ? { colorScheme: input.colorScheme } : {}),
    ...(input.reducedMotion ? { reducedMotion: input.reducedMotion } : {}),
    initScripts: resolveInitScripts(input),
    ...(input.storageState !== undefined ? { storageState: input.storageState } : {}),
    ...(input.state ? { state: input.state } : {}),
    locale: validateLocale(fingerprintHelpers.locale ?? input.locale),
    timezoneId: validateTimezone(input.timezone ?? fingerprintHelpers.timezoneId),
    viewport,
  };
}
