import os from 'node:os';
import path from 'node:path';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { preparePersistentCamoufoxLaunch } from '../src/camoufox/launcher.js';
import { setCurrentBrowser, setInstalledBrowser } from '../src/camoufox/registry.js';
import type { CamoucliPaths } from '../src/state/paths.js';
import { ensureBasePaths, ensureSessionPaths } from '../src/state/paths.js';
import { SessionError } from '../src/util/errors.js';
import { createTestPaths } from './helpers/temp-paths.js';

describe('persistent Camoufox launcher preparation', () => {
  let rootDir: string;
  let paths: CamoucliPaths;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'camou-launcher-'));
    paths = createTestPaths(rootDir);
    await ensureBasePaths(paths);
    await seedInstalledBrowser(paths, '135.0.1-beta.24');
    await setCurrentBrowser(paths, '135.0.1-beta.24');
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('maps compatible launch inputs to Playwright persistent-context options', async () => {
    const prepared = await preparePersistentCamoufoxLaunch(paths, 'script', {
      headless: true,
      proxy: 'http://127.0.0.1:8080',
      proxyBypass: 'localhost',
      headers: '{"x-camou":"yes"}',
      userAgent: 'CamouTest/1.0',
      ignoreHTTPSErrors: true,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      initScript: '/tmp/init-a.js',
      initScripts: [{ content: 'window.injected = true;' }],
      state: 'auth',
    });

    expect(prepared.launchOptions).toMatchObject({
      executablePath: path.join(paths.browsersDir, 'official', '135.0.1-beta.24', 'camoufox-bin'),
      headless: true,
      proxy: { server: 'http://127.0.0.1:8080/', bypass: 'localhost' },
      extraHTTPHeaders: { 'x-camou': 'yes' },
      userAgent: 'CamouTest/1.0',
      ignoreHTTPSErrors: true,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      storageState: path.join(paths.statesDir, 'auth.json'),
    });
    expect(prepared.resolvedConfig.initScripts).toEqual([
      { path: '/tmp/init-a.js' },
      { content: 'window.injected = true;' },
    ]);
  });

  it('rejects launch storage state for an existing persistent profile', async () => {
    await ensureSessionPaths(paths, 'existing');

    await expect(
      preparePersistentCamoufoxLaunch(paths, 'existing', {
        state: 'auth',
      }),
    ).rejects.toThrow(SessionError);

    await expect(
      preparePersistentCamoufoxLaunch(paths, 'existing', {
        storageState: { cookies: [], origins: [] },
      }),
    ).rejects.toThrow('Launch-time state can only be applied to a new session profile');
  });
});

async function seedInstalledBrowser(paths: CamoucliPaths, version: string): Promise<void> {
  const rootDir = path.join(paths.browsersDir, 'official', version);
  await mkdir(rootDir, { recursive: true });
  await writeFile(path.join(rootDir, 'camoufox-bin'), '#!/bin/sh\n', 'utf8');
  await setInstalledBrowser(paths, {
    version,
    tag: `v${version}`,
    sourceRepo: 'official',
    assetName: `camoufox-${version}-lin.x86_64.zip`,
    assetUrl: `https://example.com/camoufox-${version}.zip`,
    rootDir,
    executablePath: path.join(rootDir, 'camoufox-bin'),
    installedAt: new Date().toISOString(),
    platform: 'lin',
    arch: 'x86_64',
  });
}
