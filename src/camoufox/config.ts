import { readFile } from 'node:fs/promises';

import { z } from 'zod';

import { ValidationError } from '../util/errors.js';
import { parseFirefoxUserPrefs, type FirefoxUserPrefs } from './prefs.js';
import { resolveCamoufoxPresets } from './presets.js';

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const launchInputSchema = z.object({
  headless: z.boolean().optional(),
  configPath: z.string().optional(),
  configJson: z.string().optional(),
  prefsPath: z.string().optional(),
  prefsJson: z.string().optional(),
  preset: z.array(z.string()).optional(),
  proxy: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new ValidationError(`Unable to parse ${label} JSON.`, undefined, error);
  }

  const result = jsonObjectSchema.safeParse(parsed);
  if (!result.success) {
    throw new ValidationError(`${label} must be a JSON object.`);
  }

  return result.data;
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
  const camouConfig = {
    ...presets.camouConfig,
    ...rawConfig,
  };
  const firefoxUserPrefs = parseFirefoxUserPrefs({
    ...presets.firefoxUserPrefs,
    ...rawPrefs,
  });
  const viewport = input.width && input.height ? { width: input.width, height: input.height } : undefined;

  if ((input.width && !input.height) || (!input.width && input.height)) {
    throw new ValidationError('Both width and height are required when setting window size.');
  }

  return {
    headless: input.headless ?? false,
    browser: input.browser,
    presetNames: presets.presetNames,
    camouConfig,
    firefoxUserPrefs,
    proxy: parseProxyString(input.proxy),
    locale: validateLocale(input.locale),
    timezoneId: validateTimezone(input.timezone),
    viewport,
  };
}
