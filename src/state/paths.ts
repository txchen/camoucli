import os from 'node:os';
import path from 'node:path';

import { UnsupportedPlatformError } from '../util/errors.js';
import { ensureDir } from './store.js';

export interface CamoucliPaths {
  appName: string;
  dataDir: string;
  stateDir: string;
  cacheDir: string;
  camoufoxCacheDir: string;
  camoufoxConfigFile: string;
  runtimeDir: string;
  logsDir: string;
  browsersDir: string;
  browserRegistryFile: string;
  profilesDir: string;
  presetsDir: string;
  daemonSocketPath?: string | undefined;
  daemonHost?: string | undefined;
  daemonPort?: number | undefined;
  daemonPidFile: string;
  daemonLogFile: string;
}

export interface SessionPaths {
  sessionName: string;
  safeSessionName: string;
  rootDir: string;
  profileDir: string;
  downloadsDir: string;
  artifactsDir: string;
}

function linuxBaseDirs(env: NodeJS.ProcessEnv, home: string): Pick<CamoucliPaths, 'dataDir' | 'stateDir' | 'cacheDir' | 'runtimeDir'> {
  const dataRoot = env.XDG_DATA_HOME ?? path.join(home, '.local', 'share');
  const stateRoot = env.XDG_STATE_HOME ?? path.join(home, '.local', 'state');
  const cacheRoot = env.XDG_CACHE_HOME ?? path.join(home, '.cache');
  const runtimeDir = env.XDG_RUNTIME_DIR
    ? path.join(env.XDG_RUNTIME_DIR, 'camoucli')
    : path.join(stateRoot, 'camoucli', 'runtime');

  return {
    dataDir: path.join(dataRoot, 'camoucli'),
    stateDir: path.join(stateRoot, 'camoucli'),
    cacheDir: path.join(cacheRoot, 'camoucli'),
    runtimeDir,
  };
}

function darwinBaseDirs(home: string): Pick<CamoucliPaths, 'dataDir' | 'stateDir' | 'cacheDir' | 'runtimeDir'> {
  const dataDir = path.join(home, 'Library', 'Application Support', 'camoucli');
  const stateDir = path.join(home, 'Library', 'Application Support', 'camoucli');
  const cacheDir = path.join(home, 'Library', 'Caches', 'camoucli');

  return {
    dataDir,
    stateDir,
    cacheDir,
    runtimeDir: path.join(stateDir, 'runtime'),
  };
}

function windowsBaseDirs(env: NodeJS.ProcessEnv, home: string): Pick<CamoucliPaths, 'dataDir' | 'stateDir' | 'cacheDir' | 'runtimeDir'> {
  const appData = env.APPDATA ?? path.join(home, 'AppData', 'Roaming');
  const localAppData = env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local');
  const dataDir = path.join(appData, 'camoucli');
  const stateDir = path.join(localAppData, 'camoucli');

  return {
    dataDir,
    stateDir,
    cacheDir: path.join(localAppData, 'camoucli', 'Cache'),
    runtimeDir: path.join(localAppData, 'camoucli', 'Runtime'),
  };
}

export function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'default';
}

export function getCamoucliPaths(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): CamoucliPaths {
  const home = os.homedir();
  let bases: Pick<CamoucliPaths, 'dataDir' | 'stateDir' | 'cacheDir' | 'runtimeDir'>;
  let camoufoxCacheDir: string;

  if (platform === 'linux') {
    bases = linuxBaseDirs(env, home);
    camoufoxCacheDir = path.join(env.XDG_CACHE_HOME ?? path.join(home, '.cache'), 'camoufox');
  } else if (platform === 'darwin') {
    bases = darwinBaseDirs(home);
    camoufoxCacheDir = path.join(home, 'Library', 'Caches', 'camoufox');
  } else if (platform === 'win32') {
    bases = windowsBaseDirs(env, home);
    camoufoxCacheDir = path.join(env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local'), 'camoufox', 'Cache');
  } else {
    throw new UnsupportedPlatformError(`Unsupported platform: ${platform}`);
  }

  const logsDir = path.join(bases.stateDir, 'logs');
  const runtimeDir = bases.runtimeDir;

  return {
    appName: 'camoucli',
    dataDir: bases.dataDir,
    stateDir: bases.stateDir,
    cacheDir: bases.cacheDir,
    camoufoxCacheDir,
    camoufoxConfigFile: path.join(camoufoxCacheDir, 'config.json'),
    runtimeDir,
    logsDir,
    browsersDir: path.join(camoufoxCacheDir, 'browsers'),
    browserRegistryFile: path.join(bases.dataDir, 'browsers', 'registry.json'),
    profilesDir: path.join(bases.dataDir, 'profiles'),
    presetsDir: path.join(bases.dataDir, 'presets'),
    daemonSocketPath: platform === 'win32' ? undefined : path.join(runtimeDir, 'daemon.sock'),
    daemonHost: platform === 'win32' ? '127.0.0.1' : undefined,
    daemonPort: platform === 'win32' ? Number(env.CAMOUCLI_PORT ?? 43133) : undefined,
    daemonPidFile: path.join(runtimeDir, 'daemon.pid'),
    daemonLogFile: path.join(logsDir, 'daemon.log'),
  };
}

export async function ensureBasePaths(paths: CamoucliPaths): Promise<void> {
  await Promise.all([
    ensureDir(paths.dataDir),
    ensureDir(paths.stateDir),
    ensureDir(paths.cacheDir),
    ensureDir(paths.camoufoxCacheDir),
    ensureDir(paths.runtimeDir),
    ensureDir(paths.logsDir),
    ensureDir(paths.browsersDir),
    ensureDir(paths.profilesDir),
    ensureDir(paths.presetsDir),
  ]);
}

export function getSessionPaths(paths: CamoucliPaths, sessionName: string): SessionPaths {
  const safeSessionName = sanitizeName(sessionName);
  const rootDir = path.join(paths.profilesDir, safeSessionName);

  return {
    sessionName,
    safeSessionName,
    rootDir,
    profileDir: path.join(rootDir, 'user-data'),
    downloadsDir: path.join(rootDir, 'downloads'),
    artifactsDir: path.join(rootDir, 'artifacts'),
  };
}

export async function ensureSessionPaths(paths: CamoucliPaths, sessionName: string): Promise<SessionPaths> {
  const sessionPaths = getSessionPaths(paths, sessionName);
  await Promise.all([
    ensureDir(sessionPaths.rootDir),
    ensureDir(sessionPaths.profileDir),
    ensureDir(sessionPaths.downloadsDir),
    ensureDir(sessionPaths.artifactsDir),
  ]);
  return sessionPaths;
}
