import os from 'node:os';
import path from 'node:path';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CamoucliPaths } from '../src/state/paths.js';
import {
  listInstalledBrowsers,
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
    const installRoot = path.join(paths.browsersDir, 'official', '135.0.1-beta.24');
    await setInstalledBrowser(paths, {
      version: '135.0.1-beta.24',
      tag: 'v135.0.1-beta.24',
      sourceRepo: 'daijro/camoufox',
      assetName: 'camoufox-135.0.1-beta.24-lin.x86_64.zip',
      assetUrl: 'https://example.com/camoufox.zip',
      rootDir: installRoot,
      executablePath: path.join(installRoot, 'camoufox-bin'),
      installedAt: new Date().toISOString(),
      platform: 'lin',
      arch: 'x86_64',
    });

    const installed = await resolveInstalledBrowser(paths);

    expect(installed?.version).toBe('135.0.1-beta.24');
    expect(installed?.sourceRepo).toBe('daijro/camoufox');
  });

  it('lists installed browsers in descending version order', async () => {
    const firstInstallRoot = path.join(paths.browsersDir, 'official', '134.0.0-beta.20');
    const secondInstallRoot = path.join(paths.browsersDir, 'official', '135.0.1-beta.24');

    await setInstalledBrowser(paths, {
      version: '134.0.0-beta.20',
      tag: 'v134.0.0-beta.20',
      sourceRepo: 'daijro/camoufox',
      assetName: 'a.zip',
      assetUrl: 'https://example.com/a.zip',
      rootDir: firstInstallRoot,
      executablePath: path.join(firstInstallRoot, 'camoufox-bin'),
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
      rootDir: secondInstallRoot,
      executablePath: path.join(secondInstallRoot, 'camoufox-bin'),
      installedAt: new Date().toISOString(),
      platform: 'lin',
      arch: 'x86_64',
    });

    await setCurrentBrowser(paths, '134.0.0-beta.20');

    const listing = await listInstalledBrowsers(paths);

    expect(listing.currentVersion).toBe('134.0.0-beta.20');
    expect(listing.installs.map((install) => install.version)).toEqual([
      '135.0.1-beta.24',
      '134.0.0-beta.20',
    ]);
  });

  it('updates the current version and removes installs', async () => {
    const firstInstallRoot = path.join(paths.browsersDir, 'official', '134.0.0-beta.20');
    await setInstalledBrowser(paths, {
      version: '134.0.0-beta.20',
      tag: 'v134.0.0-beta.20',
      sourceRepo: 'daijro/camoufox',
      assetName: 'a.zip',
      assetUrl: 'https://example.com/a.zip',
      rootDir: firstInstallRoot,
      executablePath: path.join(firstInstallRoot, 'camoufox-bin'),
      installedAt: new Date().toISOString(),
      platform: 'lin',
      arch: 'x86_64',
    });

    const secondInstallRoot = path.join(paths.browsersDir, 'official', '135.0.1-beta.24');
    await setInstalledBrowser(paths, {
      version: '135.0.1-beta.24',
      tag: 'v135.0.1-beta.24',
      sourceRepo: 'daijro/camoufox',
      assetName: 'b.zip',
      assetUrl: 'https://example.com/b.zip',
      rootDir: secondInstallRoot,
      executablePath: path.join(secondInstallRoot, 'camoufox-bin'),
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

  it('writes the shared active_version when switching versions', async () => {
    const firstInstallRoot = path.join(paths.browsersDir, 'official', '134.0.0-beta.20');
    const secondInstallRoot = path.join(paths.browsersDir, 'official', '135.0.1-beta.24');

    await setInstalledBrowser(paths, {
      version: '134.0.0-beta.20',
      tag: 'v134.0.0-beta.20',
      sourceRepo: 'daijro/camoufox',
      assetName: 'a.zip',
      assetUrl: 'https://example.com/a.zip',
      rootDir: firstInstallRoot,
      executablePath: path.join(firstInstallRoot, 'camoufox-bin'),
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
      rootDir: secondInstallRoot,
      executablePath: path.join(secondInstallRoot, 'camoufox-bin'),
      installedAt: new Date().toISOString(),
      platform: 'lin',
      arch: 'x86_64',
    });

    await setCurrentBrowser(paths, '134.0.0-beta.20');

    const sharedConfig = JSON.parse(await readFile(paths.camoufoxConfigFile, 'utf8')) as { active_version?: string };

    expect(sharedConfig.active_version).toBe('browsers/official/134.0.0-beta.20');
  });

  it('detects installs from the shared Camoufox cache layout', async () => {
    const installRoot = path.join(paths.browsersDir, 'official', '135.0.1-beta.24');
    await mkdir(installRoot, { recursive: true });
    await writeFile(
      path.join(installRoot, 'version.json'),
      JSON.stringify({ version: '135.0.1', build: 'beta.24', prerelease: false }),
      'utf8',
    );
    await writeFile(paths.camoufoxConfigFile, JSON.stringify({ active_version: 'browsers/official/135.0.1-beta.24' }), 'utf8');

    const installed = await resolveInstalledBrowser(paths);

    expect(installed?.version).toBe('135.0.1-beta.24');
    expect(installed?.rootDir).toBe(installRoot);
    expect(installed?.sourceRepo).toBe('official');
  });
});
