import { z } from 'zod';

import { ValidationError } from '../util/errors.js';
import type { FirefoxUserPrefs } from './prefs.js';

export const fingerprintLocalesValueSchema = z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]);

export const fingerprintScreenSchema = z.object({
  profile: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  availWidth: z.number().int().positive().optional(),
  availHeight: z.number().int().positive().optional(),
  availTop: z.number().int().nonnegative().optional(),
  availLeft: z.number().int().nonnegative().optional(),
  colorDepth: z.number().int().positive().optional(),
  pixelDepth: z.number().int().positive().optional(),
  devicePixelRatio: z.number().positive().optional(),
});

export const fingerprintWindowSchema = z.object({
  profile: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  innerWidth: z.number().int().positive().optional(),
  innerHeight: z.number().int().positive().optional(),
  outerWidth: z.number().int().positive().optional(),
  outerHeight: z.number().int().positive().optional(),
  screenX: z.number().int().optional(),
  screenY: z.number().int().optional(),
  devicePixelRatio: z.number().positive().optional(),
  historyLength: z.number().int().positive().optional(),
});

export const fingerprintGeolocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  timezone: z.string().optional(),
  region: z.string().optional(),
  webrtcIpv4: z.string().optional(),
  webrtcIpv6: z.string().optional(),
});

export const fingerprintHelperSchema = z.object({
  locales: fingerprintLocalesValueSchema.optional(),
  region: z.string().optional(),
  geolocation: fingerprintGeolocationSchema.optional(),
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
});

export type FingerprintScreenInput = z.infer<typeof fingerprintScreenSchema>;
export type FingerprintWindowInput = z.infer<typeof fingerprintWindowSchema>;
export type FingerprintGeolocationInput = z.infer<typeof fingerprintGeolocationSchema>;
export type FingerprintHelperInput = z.infer<typeof fingerprintHelperSchema>;

export interface ResolvedFingerprintHelpers {
  camouConfig: Record<string, unknown>;
  firefoxUserPrefs: FirefoxUserPrefs;
  locale?: string | undefined;
  timezoneId?: string | undefined;
  viewport?: {
    width: number;
    height: number;
  } | undefined;
}

export interface FingerprintScreenProfileDefinition {
  name: string;
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  devicePixelRatio: number;
  suggestedWindow: {
    innerWidth: number;
    innerHeight: number;
    outerWidth: number;
    outerHeight: number;
  };
}

export interface FingerprintWindowProfileDefinition {
  name: string;
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
  devicePixelRatio: number;
}

export interface FingerprintRegionProfileDefinition {
  region: string;
  description: string;
  locales: string[];
  timezone: string;
  latitude: number;
  longitude: number;
}

interface ResolvedScreenTemplate {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  availTop: number;
  availLeft: number;
  colorDepth: number;
  pixelDepth: number;
  devicePixelRatio: number;
  suggestedWindow: ResolvedWindowTemplate;
}

interface ResolvedWindowTemplate {
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
  screenX: number;
  screenY: number;
  devicePixelRatio: number;
  historyLength: number;
}

interface RegionProfile {
  description: string;
  locales: string[];
  timezone: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}

const SCREEN_PROFILES = {
  'laptop-hd': {
    width: 1366,
    height: 768,
    availWidth: 1366,
    availHeight: 728,
    availTop: 0,
    availLeft: 0,
    colorDepth: 24,
    pixelDepth: 24,
    devicePixelRatio: 1,
    suggestedWindow: {
      innerWidth: 1366,
      innerHeight: 728,
      outerWidth: 1366,
      outerHeight: 768,
      screenX: 0,
      screenY: 0,
      devicePixelRatio: 1,
      historyLength: 1,
    },
  },
  'desktop-fhd': {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1040,
    availTop: 0,
    availLeft: 0,
    colorDepth: 24,
    pixelDepth: 24,
    devicePixelRatio: 1,
    suggestedWindow: {
      innerWidth: 1600,
      innerHeight: 940,
      outerWidth: 1600,
      outerHeight: 1020,
      screenX: 160,
      screenY: 20,
      devicePixelRatio: 1,
      historyLength: 1,
    },
  },
  'desktop-qhd': {
    width: 2560,
    height: 1440,
    availWidth: 2560,
    availHeight: 1400,
    availTop: 0,
    availLeft: 0,
    colorDepth: 24,
    pixelDepth: 24,
    devicePixelRatio: 1,
    suggestedWindow: {
      innerWidth: 1728,
      innerHeight: 1117,
      outerWidth: 1728,
      outerHeight: 1197,
      screenX: 120,
      screenY: 20,
      devicePixelRatio: 1,
      historyLength: 1,
    },
  },
  'retina-mac': {
    width: 1440,
    height: 900,
    availWidth: 1440,
    availHeight: 860,
    availTop: 0,
    availLeft: 0,
    colorDepth: 24,
    pixelDepth: 24,
    devicePixelRatio: 2,
    suggestedWindow: {
      innerWidth: 1440,
      innerHeight: 780,
      outerWidth: 1440,
      outerHeight: 860,
      screenX: 0,
      screenY: 23,
      devicePixelRatio: 2,
      historyLength: 1,
    },
  },
} as const satisfies Record<string, ResolvedScreenTemplate>;

const WINDOW_PROFILES = {
  laptop: {
    innerWidth: 1280,
    innerHeight: 688,
    outerWidth: 1366,
    outerHeight: 768,
    screenX: 0,
    screenY: 0,
    devicePixelRatio: 1,
    historyLength: 1,
  },
  desktop: {
    innerWidth: 1440,
    innerHeight: 900,
    outerWidth: 1536,
    outerHeight: 980,
    screenX: 40,
    screenY: 20,
    devicePixelRatio: 1,
    historyLength: 1,
  },
  'desktop-large': {
    innerWidth: 1600,
    innerHeight: 920,
    outerWidth: 1680,
    outerHeight: 1000,
    screenX: 60,
    screenY: 20,
    devicePixelRatio: 1,
    historyLength: 1,
  },
  retina: {
    innerWidth: 1440,
    innerHeight: 797,
    outerWidth: 1440,
    outerHeight: 875,
    screenX: 0,
    screenY: 23,
    devicePixelRatio: 2,
    historyLength: 1,
  },
} as const satisfies Record<string, ResolvedWindowTemplate>;

const REGION_PROFILES = {
  AU: { description: 'Australia east coast desktop traffic', locales: ['en-AU', 'en'], timezone: 'Australia/Sydney', latitude: -33.8688, longitude: 151.2093, accuracy: 25 },
  BR: { description: 'Brazil southeast traffic', locales: ['pt-BR', 'pt'], timezone: 'America/Sao_Paulo', latitude: -23.5505, longitude: -46.6333, accuracy: 25 },
  CA: { description: 'Canada central traffic', locales: ['en-CA', 'fr-CA', 'en'], timezone: 'America/Toronto', latitude: 43.6532, longitude: -79.3832, accuracy: 25 },
  CH: { description: 'Switzerland central europe traffic', locales: ['de-CH', 'fr-CH', 'it-CH', 'de'], timezone: 'Europe/Zurich', latitude: 47.3769, longitude: 8.5417, accuracy: 20 },
  DE: { description: 'Germany central europe traffic', locales: ['de-DE', 'de'], timezone: 'Europe/Berlin', latitude: 52.52, longitude: 13.405, accuracy: 20 },
  ES: { description: 'Spain iberian traffic', locales: ['es-ES', 'ca-ES', 'es'], timezone: 'Europe/Madrid', latitude: 40.4168, longitude: -3.7038, accuracy: 20 },
  FR: { description: 'France western europe traffic', locales: ['fr-FR', 'fr'], timezone: 'Europe/Paris', latitude: 48.8566, longitude: 2.3522, accuracy: 20 },
  GB: { description: 'United Kingdom traffic', locales: ['en-GB', 'en'], timezone: 'Europe/London', latitude: 51.5072, longitude: -0.1276, accuracy: 20 },
  HK: { description: 'Hong Kong traffic', locales: ['zh-HK', 'en-HK', 'zh'], timezone: 'Asia/Hong_Kong', latitude: 22.3193, longitude: 114.1694, accuracy: 15 },
  IE: { description: 'Ireland traffic', locales: ['en-IE', 'en'], timezone: 'Europe/Dublin', latitude: 53.3498, longitude: -6.2603, accuracy: 20 },
  IN: { description: 'India metro traffic', locales: ['en-IN', 'hi-IN', 'en'], timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209, accuracy: 30 },
  IT: { description: 'Italy traffic', locales: ['it-IT', 'it'], timezone: 'Europe/Rome', latitude: 41.9028, longitude: 12.4964, accuracy: 20 },
  JP: { description: 'Japan metro traffic', locales: ['ja-JP', 'ja'], timezone: 'Asia/Tokyo', latitude: 35.6764, longitude: 139.6500, accuracy: 20 },
  KR: { description: 'South Korea metro traffic', locales: ['ko-KR', 'ko'], timezone: 'Asia/Seoul', latitude: 37.5665, longitude: 126.978, accuracy: 20 },
  MX: { description: 'Mexico city traffic', locales: ['es-MX', 'es'], timezone: 'America/Mexico_City', latitude: 19.4326, longitude: -99.1332, accuracy: 25 },
  NL: { description: 'Netherlands traffic', locales: ['nl-NL', 'en-NL', 'nl'], timezone: 'Europe/Amsterdam', latitude: 52.3676, longitude: 4.9041, accuracy: 20 },
  NZ: { description: 'New Zealand traffic', locales: ['en-NZ', 'en'], timezone: 'Pacific/Auckland', latitude: -36.8485, longitude: 174.7633, accuracy: 25 },
  PT: { description: 'Portugal traffic', locales: ['pt-PT', 'pt'], timezone: 'Europe/Lisbon', latitude: 38.7223, longitude: -9.1393, accuracy: 20 },
  SG: { description: 'Singapore traffic', locales: ['en-SG', 'zh-SG', 'ms-SG', 'en'], timezone: 'Asia/Singapore', latitude: 1.3521, longitude: 103.8198, accuracy: 10 },
  TW: { description: 'Taiwan traffic', locales: ['zh-TW', 'zh'], timezone: 'Asia/Taipei', latitude: 25.033, longitude: 121.5654, accuracy: 15 },
  US: { description: 'United States east coast traffic', locales: ['en-US', 'es-US', 'en'], timezone: 'America/New_York', latitude: 40.7128, longitude: -74.006, accuracy: 25 },
} as const satisfies Record<string, RegionProfile>;

type FingerprintScreenValue = FingerprintHelperInput['screen'];
type FingerprintWindowValue = FingerprintHelperInput['window'];

function cloneWindowTemplate(template: ResolvedWindowTemplate): ResolvedWindowTemplate {
  return { ...template };
}

function cloneScreenTemplate(template: ResolvedScreenTemplate): ResolvedScreenTemplate {
  return {
    ...template,
    suggestedWindow: cloneWindowTemplate(template.suggestedWindow),
  };
}

function splitListValue(value: string | string[] | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const items = (Array.isArray(value) ? value : value.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean);

  return items.length > 0 ? [...new Set(items)] : undefined;
}

function expandLocaleChain(locales: string[]): string[] {
  const expanded: string[] = [];

  for (const locale of locales) {
    if (!expanded.includes(locale)) {
      expanded.push(locale);
    }

    const normalized = new Intl.Locale(locale).baseName;
    if (!expanded.includes(normalized)) {
      expanded.push(normalized);
    }

    const language = new Intl.Locale(locale).language;
    if (!expanded.includes(language)) {
      expanded.push(language);
    }
  }

  return expanded;
}

function formatAcceptLanguage(locales: string[]): string {
  return locales
    .map((locale, index) => {
      if (index === 0) {
        return `${locale};q=1.0`;
      }

      const quality = Math.max(0.1, 1 - index * 0.1).toFixed(1);
      return `${locale};q=${quality}`;
    })
    .join(', ');
}

function normalizeRegionCode(value: string | undefined): string | undefined {
  const trimmed = value?.trim().toUpperCase();
  return trimmed ? trimmed : undefined;
}

function resolveRegionProfile(regionInput: string | undefined): RegionProfile | undefined {
  const regionCode = normalizeRegionCode(regionInput);
  if (!regionCode) {
    return undefined;
  }

  const profile = REGION_PROFILES[regionCode as keyof typeof REGION_PROFILES];
  if (!profile) {
    throw new ValidationError(
      `Unknown region profile: ${regionCode}. Available regions: ${Object.keys(REGION_PROFILES).join(', ')}`,
    );
  }

  return profile;
}

function resolveLocaleHelpers(localesInput: string | string[] | undefined): Pick<ResolvedFingerprintHelpers, 'camouConfig' | 'locale'> {
  const locales = splitListValue(localesInput);
  if (!locales || locales.length === 0) {
    return {
      camouConfig: {},
    };
  }

  for (const locale of locales) {
    if (Intl.DateTimeFormat.supportedLocalesOf([locale]).length === 0) {
      throw new ValidationError(`Invalid locale: ${locale}`);
    }
  }

  const expandedLocales = expandLocaleChain(locales);
  const primaryLocaleValue = locales[0];
  if (!primaryLocaleValue) {
    throw new ValidationError('At least one locale is required when using locale helpers.');
  }

  const primaryLocale = new Intl.Locale(primaryLocaleValue).maximize();

  return {
    locale: primaryLocaleValue,
    camouConfig: {
      'navigator.language': primaryLocaleValue,
      'navigator.languages': expandedLocales,
      'locale:language': primaryLocale.language,
      ...(primaryLocale.region ? { 'locale:region': primaryLocale.region } : {}),
      ...(primaryLocale.script ? { 'locale:script': primaryLocale.script } : {}),
      'locale:all': expandedLocales.join(', '),
      'headers.Accept-Language': formatAcceptLanguage(expandedLocales),
    },
  };
}

function resolveGeolocationHelpers(input: FingerprintHelperInput): Pick<ResolvedFingerprintHelpers, 'camouConfig' | 'timezoneId'> {
  const regionProfile = resolveRegionProfile(input.region ?? input.geolocation?.region);
  const latitude = input.geolocation?.latitude ?? regionProfile?.latitude;
  const longitude = input.geolocation?.longitude ?? regionProfile?.longitude;
  const accuracy = input.geolocation?.accuracy ?? regionProfile?.accuracy;
  const timezone = input.geolocation?.timezone ?? regionProfile?.timezone;
  const regionCode = normalizeRegionCode(input.geolocation?.region ?? input.region);

  if ((latitude !== undefined && longitude === undefined) || (latitude === undefined && longitude !== undefined)) {
    throw new ValidationError('Both geolocation latitude and longitude are required when setting geolocation helpers.');
  }

  if (timezone) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    } catch (error) {
      throw new ValidationError(`Invalid timezone: ${timezone}`, undefined, error);
    }
  }

  if (regionCode && !regionProfile && (latitude !== undefined || timezone !== undefined)) {
    throw new ValidationError(`Unknown region profile: ${regionCode}.`);
  }

  return {
    timezoneId: timezone,
    camouConfig: {
      ...(latitude !== undefined ? { 'geolocation:latitude': latitude } : {}),
      ...(longitude !== undefined ? { 'geolocation:longitude': longitude } : {}),
      ...(accuracy !== undefined ? { 'geolocation:accuracy': accuracy } : {}),
      ...(timezone ? { timezone } : {}),
      ...(input.geolocation?.webrtcIpv4 ? { 'webrtc:ipv4': input.geolocation.webrtcIpv4 } : {}),
      ...(input.geolocation?.webrtcIpv6 ? { 'webrtc:ipv6': input.geolocation.webrtcIpv6 } : {}),
    },
  };
}

function asScreenProfileName(value: string | undefined): keyof typeof SCREEN_PROFILES | undefined {
  if (!value) {
    return undefined;
  }

  if (!(value in SCREEN_PROFILES)) {
    throw new ValidationError(
      `Unknown screen profile: ${value}. Available screen profiles: ${Object.keys(SCREEN_PROFILES).join(', ')}`,
    );
  }

  return value as keyof typeof SCREEN_PROFILES;
}

function asWindowProfileName(value: string | undefined): keyof typeof WINDOW_PROFILES | undefined {
  if (!value) {
    return undefined;
  }

  if (!(value in WINDOW_PROFILES)) {
    throw new ValidationError(
      `Unknown window profile: ${value}. Available window profiles: ${Object.keys(WINDOW_PROFILES).join(', ')}`,
    );
  }

  return value as keyof typeof WINDOW_PROFILES;
}

function isScreenObject(value: FingerprintScreenValue | undefined): value is FingerprintScreenInput {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isWindowObject(value: FingerprintWindowValue | undefined): value is FingerprintWindowInput {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function resolveScreenTemplate(input: FingerprintHelperInput): ResolvedScreenTemplate | undefined {
  const profileName = asScreenProfileName(
    input.screenProfile ?? (typeof input.screen === 'string' ? input.screen : input.screen?.profile),
  );
  const profile = profileName ? cloneScreenTemplate(SCREEN_PROFILES[profileName]) : undefined;

  if (!isScreenObject(input.screen)) {
    return profile;
  }

  const width = input.screen.width ?? profile?.width;
  const height = input.screen.height ?? profile?.height;

  if ((input.screen.width !== undefined || input.screen.height !== undefined) && (!width || !height)) {
    throw new ValidationError('Both screen width and height are required when overriding screen dimensions.');
  }

  if (!width || !height) {
    return profile;
  }

  const availWidth = input.screen.availWidth ?? profile?.availWidth ?? width;
  const availHeight = input.screen.availHeight ?? profile?.availHeight ?? Math.max(1, height - 40);

  return {
    width,
    height,
    availWidth,
    availHeight,
    availTop: input.screen.availTop ?? profile?.availTop ?? 0,
    availLeft: input.screen.availLeft ?? profile?.availLeft ?? 0,
    colorDepth: input.screen.colorDepth ?? profile?.colorDepth ?? 24,
    pixelDepth: input.screen.pixelDepth ?? input.screen.colorDepth ?? profile?.pixelDepth ?? profile?.colorDepth ?? 24,
    devicePixelRatio: input.screen.devicePixelRatio ?? profile?.devicePixelRatio ?? 1,
    suggestedWindow: profile?.suggestedWindow ?? {
      innerWidth: availWidth,
      innerHeight: availHeight,
      outerWidth: width,
      outerHeight: height,
      screenX: 0,
      screenY: Math.max(0, height - availHeight),
      devicePixelRatio: input.screen.devicePixelRatio ?? profile?.devicePixelRatio ?? 1,
      historyLength: 1,
    },
  };
}

function resolveWindowTemplate(input: FingerprintHelperInput, screen: ResolvedScreenTemplate | undefined): ResolvedWindowTemplate | undefined {
  const profileName = asWindowProfileName(
    input.windowProfile ?? (typeof input.window === 'string' ? input.window : input.window?.profile),
  );
  const base = profileName
    ? cloneWindowTemplate(WINDOW_PROFILES[profileName])
    : screen
      ? cloneWindowTemplate(screen.suggestedWindow)
      : undefined;

  if (!isWindowObject(input.window)) {
    return base;
  }

  const innerWidth = input.window.innerWidth ?? input.window.width ?? base?.innerWidth;
  const innerHeight = input.window.innerHeight ?? input.window.height ?? base?.innerHeight;
  const outerWidth = input.window.outerWidth ?? base?.outerWidth ?? innerWidth;
  const outerHeight = input.window.outerHeight ?? base?.outerHeight ?? (innerHeight ? innerHeight + 80 : undefined);

  if ((input.window.width !== undefined || input.window.height !== undefined) && (!innerWidth || !innerHeight)) {
    throw new ValidationError('Both window width and height are required when overriding window dimensions.');
  }

  if (!innerWidth || !innerHeight || !outerWidth || !outerHeight) {
    return base;
  }

  return {
    innerWidth,
    innerHeight,
    outerWidth,
    outerHeight,
    screenX: input.window.screenX ?? base?.screenX ?? 0,
    screenY: input.window.screenY ?? base?.screenY ?? 0,
    devicePixelRatio: input.window.devicePixelRatio ?? base?.devicePixelRatio ?? screen?.devicePixelRatio ?? 1,
    historyLength: input.window.historyLength ?? base?.historyLength ?? 1,
  };
}

function buildScreenCamouConfig(screen: ResolvedScreenTemplate | undefined): Record<string, unknown> {
  if (!screen) {
    return {};
  }

  return {
    'screen.width': screen.width,
    'screen.height': screen.height,
    'screen.availWidth': screen.availWidth,
    'screen.availHeight': screen.availHeight,
    'screen.availTop': screen.availTop,
    'screen.availLeft': screen.availLeft,
    'screen.colorDepth': screen.colorDepth,
    'screen.pixelDepth': screen.pixelDepth,
    'window.devicePixelRatio': screen.devicePixelRatio,
  };
}

function buildWindowCamouConfig(window: ResolvedWindowTemplate | undefined): Record<string, unknown> {
  if (!window) {
    return {};
  }

  return {
    'window.outerWidth': window.outerWidth,
    'window.outerHeight': window.outerHeight,
    'window.innerWidth': window.innerWidth,
    'window.innerHeight': window.innerHeight,
    'window.screenX': window.screenX,
    'window.screenY': window.screenY,
    'window.devicePixelRatio': window.devicePixelRatio,
    'window.history.length': window.historyLength,
  };
}

export function mergeFingerprintHelpers(
  base: FingerprintHelperInput | undefined,
  override: FingerprintHelperInput | undefined,
): FingerprintHelperInput | undefined {
  if (!base) {
    return override;
  }

  if (!override) {
    return base;
  }

  return {
    ...base,
    ...override,
    ...(base.geolocation && override.geolocation
      ? { geolocation: { ...base.geolocation, ...override.geolocation } }
      : {}),
    ...(base.screen && override.screen && isScreenObject(base.screen) && isScreenObject(override.screen)
      ? { screen: { ...base.screen, ...override.screen } }
      : {}),
    ...(base.window && override.window && isWindowObject(base.window) && isWindowObject(override.window)
      ? { window: { ...base.window, ...override.window } }
      : {}),
  };
}

export function resolveFingerprintHelpers(input: FingerprintHelperInput | undefined): ResolvedFingerprintHelpers {
  if (!input) {
    return {
      camouConfig: {},
      firefoxUserPrefs: {},
    };
  }

  const regionProfile = resolveRegionProfile(input.region ?? input.geolocation?.region);
  const localeHelpers = resolveLocaleHelpers(input.locales ?? regionProfile?.locales);
  const geolocationHelpers = resolveGeolocationHelpers(input);
  const screen = resolveScreenTemplate(input);
  const window = resolveWindowTemplate(input, screen);

  const firefoxUserPrefs: FirefoxUserPrefs = {
    ...(input.blockImages ? { 'permissions.default.image': 2 } : {}),
    ...(input.blockWebRtc ? { 'media.peerconnection.enabled': false } : {}),
    ...(input.blockWebGl ? { 'webgl.disabled': true } : {}),
    ...(input.disableCoop ? { 'browser.tabs.remote.useCrossOriginOpenerPolicy': false } : {}),
  };

  return {
    camouConfig: {
      ...localeHelpers.camouConfig,
      ...geolocationHelpers.camouConfig,
      ...buildScreenCamouConfig(screen),
      ...buildWindowCamouConfig(window),
      ...(input.fonts && input.fonts.length > 0 ? { fonts: [...new Set(input.fonts)] } : {}),
      ...(input.fontSpacingSeed !== undefined ? { 'fonts:spacing_seed': input.fontSpacingSeed } : {}),
    },
    firefoxUserPrefs,
    locale: localeHelpers.locale,
    timezoneId: geolocationHelpers.timezoneId,
    viewport: window
      ? {
          width: window.innerWidth,
          height: window.innerHeight,
        }
      : undefined,
  };
}

export function listFingerprintScreenProfiles(): string[] {
  return Object.keys(SCREEN_PROFILES);
}

export function listFingerprintWindowProfiles(): string[] {
  return Object.keys(WINDOW_PROFILES);
}

export function describeFingerprintScreenProfiles(): FingerprintScreenProfileDefinition[] {
  return Object.entries(SCREEN_PROFILES).map(([name, profile]) => ({
    name,
    width: profile.width,
    height: profile.height,
    availWidth: profile.availWidth,
    availHeight: profile.availHeight,
    devicePixelRatio: profile.devicePixelRatio,
    suggestedWindow: {
      innerWidth: profile.suggestedWindow.innerWidth,
      innerHeight: profile.suggestedWindow.innerHeight,
      outerWidth: profile.suggestedWindow.outerWidth,
      outerHeight: profile.suggestedWindow.outerHeight,
    },
  }));
}

export function describeFingerprintWindowProfiles(): FingerprintWindowProfileDefinition[] {
  return Object.entries(WINDOW_PROFILES).map(([name, profile]) => ({
    name,
    innerWidth: profile.innerWidth,
    innerHeight: profile.innerHeight,
    outerWidth: profile.outerWidth,
    outerHeight: profile.outerHeight,
    devicePixelRatio: profile.devicePixelRatio,
  }));
}

export function describeFingerprintRegionProfiles(): FingerprintRegionProfileDefinition[] {
  return Object.entries(REGION_PROFILES).map(([region, profile]) => ({
    region,
    description: profile.description,
    locales: [...profile.locales],
    timezone: profile.timezone,
    latitude: profile.latitude,
    longitude: profile.longitude,
  }));
}
