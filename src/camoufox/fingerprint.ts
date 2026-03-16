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

export const fingerprintHelperSchema = z.object({
  locales: fingerprintLocalesValueSchema.optional(),
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
export type FingerprintHelperInput = z.infer<typeof fingerprintHelperSchema>;

export interface ResolvedFingerprintHelpers {
  camouConfig: Record<string, unknown>;
  firefoxUserPrefs: FirefoxUserPrefs;
  locale?: string | undefined;
  viewport?: {
    width: number;
    height: number;
  } | undefined;
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

  const localeHelpers = resolveLocaleHelpers(input.locales);
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
      ...buildScreenCamouConfig(screen),
      ...buildWindowCamouConfig(window),
      ...(input.fonts && input.fonts.length > 0 ? { fonts: [...new Set(input.fonts)] } : {}),
      ...(input.fontSpacingSeed !== undefined ? { 'fonts:spacing_seed': input.fontSpacingSeed } : {}),
    },
    firefoxUserPrefs,
    locale: localeHelpers.locale,
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
