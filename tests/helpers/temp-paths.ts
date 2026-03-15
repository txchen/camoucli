import path from 'node:path';

import type { CamoucliPaths } from '../../src/state/paths.js';

export function createTestPaths(rootDir: string): CamoucliPaths {
  return {
    appName: 'camoucli',
    dataDir: path.join(rootDir, 'data'),
    stateDir: path.join(rootDir, 'state'),
    cacheDir: path.join(rootDir, 'cache'),
    camoufoxCacheDir: path.join(rootDir, 'camoufox-cache'),
    camoufoxConfigFile: path.join(rootDir, 'camoufox-cache', 'config.json'),
    runtimeDir: path.join(rootDir, 'runtime'),
    logsDir: path.join(rootDir, 'logs'),
    browsersDir: path.join(rootDir, 'camoufox-cache', 'browsers'),
    browserRegistryFile: path.join(rootDir, 'data', 'browsers', 'registry.json'),
    profilesDir: path.join(rootDir, 'data', 'profiles'),
    presetsDir: path.join(rootDir, 'data', 'presets'),
    daemonSocketPath: path.join(rootDir, 'runtime', 'daemon.sock'),
    daemonPidFile: path.join(rootDir, 'runtime', 'daemon.pid'),
    daemonLogFile: path.join(rootDir, 'logs', 'daemon.log'),
  };
}
