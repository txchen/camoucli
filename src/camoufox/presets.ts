import type { FirefoxUserPrefs } from './prefs.js';
import { ValidationError } from '../util/errors.js';

export interface CamoufoxPresetDefinition {
  name: string;
  description: string;
  camouConfig: Record<string, unknown>;
  firefoxUserPrefs: FirefoxUserPrefs;
}

export interface ResolvedPresetBundle {
  presetNames: string[];
  camouConfig: Record<string, unknown>;
  firefoxUserPrefs: FirefoxUserPrefs;
}

const CACHE_PREFS: FirefoxUserPrefs = {
  'browser.cache.disk.smart_size.enabled': true,
  'browser.cache.disk_cache_ssl': true,
  'browser.cache.memory.enable': true,
  'browser.sessionhistory.max_entries': 10,
  'browser.sessionhistory.max_total_viewers': -1,
};

const PRESETS: Record<string, CamoufoxPresetDefinition> = {
  default: {
    name: 'default',
    description: 'Baseline Camoufox launch with no additional config overrides.',
    camouConfig: {},
    firefoxUserPrefs: {},
  },
  cache: {
    name: 'cache',
    description: 'Enable Firefox cache/session history prefs used by the Python library.',
    camouConfig: {},
    firefoxUserPrefs: CACHE_PREFS,
  },
  'low-bandwidth': {
    name: 'low-bandwidth',
    description: 'Reduce network-heavy assets by blocking images and speculative requests.',
    camouConfig: {},
    firefoxUserPrefs: {
      'network.http.speculative-parallel-limit': 0,
      'permissions.default.image': 2,
    },
  },
  'disable-coop': {
    name: 'disable-coop',
    description: 'Relax Cross-Origin-Opener-Policy isolation for troublesome embedded flows.',
    camouConfig: {},
    firefoxUserPrefs: {
      'browser.tabs.remote.useCrossOriginOpenerPolicy': false,
    },
  },
};

export function listCamoufoxPresets(): CamoufoxPresetDefinition[] {
  return Object.values(PRESETS);
}

export function resolveCamoufoxPresets(presetNames: string[] | undefined): ResolvedPresetBundle {
  if (!presetNames || presetNames.length === 0) {
    return {
      presetNames: [],
      camouConfig: {},
      firefoxUserPrefs: {},
    };
  }

  const normalizedNames = [...new Set(presetNames.map((presetName) => presetName.trim()).filter(Boolean))];
  const bundle: ResolvedPresetBundle = {
    presetNames: normalizedNames,
    camouConfig: {},
    firefoxUserPrefs: {},
  };

  for (const presetName of normalizedNames) {
    const preset = PRESETS[presetName];
    if (!preset) {
      throw new ValidationError(
        `Unknown preset: ${presetName}. Available presets: ${listCamoufoxPresets().map((item) => item.name).join(', ')}`,
      );
    }

    bundle.camouConfig = {
      ...bundle.camouConfig,
      ...preset.camouConfig,
    };
    bundle.firefoxUserPrefs = {
      ...bundle.firefoxUserPrefs,
      ...preset.firefoxUserPrefs,
    };
  }

  return bundle;
}
