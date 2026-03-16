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
});

export type LaunchInput = z.infer<typeof launchInputSchema>;

export interface ProxySettings {
  server: string;
}

export interface ResolvedLaunchConfig {
  headless: boolean;
  browser?: string | undefined;
  presetNames: string[];
  camouConfig: Record<string, unknown>;
  firefoxUserPrefs: FirefoxUserPrefs;
  proxy?: ProxySettings | undefined;
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

export function parseProxyString(proxy?: string): ProxySettings | undefined {
  if (!proxy) {
    return undefined;
  }

  try {
    const url = new URL(proxy);
    if (!['http:', 'https:', 'socks5:', 'socks4:'].includes(url.protocol)) {
      throw new Error(`Unsupported protocol ${url.protocol}`);
    }
    return { server: url.toString() };
  } catch (error) {
    throw new ValidationError(`Invalid proxy URL: ${proxy}`, undefined, error);
  }
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
    proxy: parseProxyString(input.proxy),
    locale: validateLocale(fingerprintHelpers.locale ?? input.locale),
    timezoneId: validateTimezone(input.timezone ?? fingerprintHelpers.timezoneId),
    viewport,
  };
}
