import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CamoucliPaths } from '../src/state/paths.js';
import {
  loadBrowserRegistry,
  removeInstalledBrowser,
  resolveInstalledBrowser,
  setCurrentBrowser,
  setInstalledBrowser,
} from '../src/camoufox/registry.js';

function createPaths(rootDir: string): CamoucliPaths {
  return {
    appName: 'camoucli',
    dataDir: path.join(rootDir, 'data'),
    stateDir: path.join(rootDir, 'state'),
    cacheDir: path.join(rootDir, 'cache'),
    runtimeDir: path.join(rootDir, 'runtime'),
    logsDir: path.join(rootDir, 'logs'),
    browsersDir: path.join(rootDir, 'data', 'browsers'),
    browserRegistryFile: path.join(rootDir, 'data', 'browsers', 'registry.json'),
    profilesDir: path.join(rootDir, 'data', 'profiles'),
    presetsDir: path.join(rootDir, 'data', 'presets'),
    daemonSocketPath: path.join(rootDir, 'runtime', 'daemon.sock'),
    daemonPidFile: path.join(rootDir, 'runtime', 'daemon.pid'),
    daemonLogFile: path.join(rootDir, 'logs', 'daemon.log'),
  };
}

describe('browser registry', () => {
  let rootDir: string;
  let paths: CamoucliPaths;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'camoucli-registry-'));
    paths = createPaths(rootDir);
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('stores and resolves installed browsers', async () => {
    await setInstalledBrowser(paths, {
      version: '135.0.1-beta.24',
      tag: 'v135.0.1-beta.24',
      sourceRepo: 'daijro/camoufox',
      assetName: 'camoufox-135.0.1-beta.24-lin.x86_64.zip',
      assetUrl: 'https://example.com/camoufox.zip',
      rootDir: path.join(rootDir, 'browser'),
      executablePath: path.join(rootDir, 'browser', 'camoufox-bin'),
      installedAt: new Date().toISOString(),
      platform: 'lin',
      arch: 'x86_64',
    });

    const installed = await resolveInstalledBrowser(paths);

    expect(installed?.version).toBe('135.0.1-beta.24');
    expect(installed?.sourceRepo).toBe('daijro/camoufox');
  });

  it('updates the current version and removes installs', async () => {
    await setInstalledBrowser(paths, {
      version: '134.0.0-beta.20',
      tag: 'v134.0.0-beta.20',
      sourceRepo: 'daijro/camoufox',
      assetName: 'a.zip',
      assetUrl: 'https://example.com/a.zip',
      rootDir: path.join(rootDir, 'a'),
      executablePath: path.join(rootDir, 'a', 'camoufox-bin'),
      installedAt: new Date().toISOString(),
      platform: 'lin',
      arch: 'x86_64',
    });

    await setInstalledBrowser(paths, {
      version: '135.0.1-beta.24',
      tag: 'v135.0.1-beta.24',
      sourceRepo: 'daijro/camoufox',
      assetName: 'b.zip',
      assetUrl: 'https://example.com/b.zip',
      rootDir: path.join(rootDir, 'b'),
      executablePath: path.join(rootDir, 'b', 'camoufox-bin'),
      installedAt: new Date().toISOString(),
      platform: 'lin',
      arch: 'x86_64',
    });

    await setCurrentBrowser(paths, '134.0.0-beta.20');
    let registry = await loadBrowserRegistry(paths);
    expect(registry.currentVersion).toBe('134.0.0-beta.20');

    registry = await removeInstalledBrowser(paths, '134.0.0-beta.20');
    expect(registry.currentVersion).toBe('135.0.1-beta.24');
    expect(Object.keys(registry.installs)).toEqual(['135.0.1-beta.24']);
  });
});
