import os from 'node:os';
import path from 'node:path';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setCurrentBrowser, setInstalledBrowser } from '../src/camoufox/registry.js';
import type { CamoucliPaths } from '../src/state/paths.js';
import { ensureBasePaths } from '../src/state/paths.js';
import { createTestPaths } from './helpers/temp-paths.js';

const addInitScriptMock = vi.fn(async () => undefined);
const launchPersistentContextMock = vi.fn(async () => ({
  addInitScript: addInitScriptMock,
  close: vi.fn(async () => undefined),
}));

vi.mock('playwright-core', () => ({
  firefox: {
    launchPersistentContext: launchPersistentContextMock,
  },
}));

describe('persistent Camoufox launch init scripts', () => {
  let rootDir: string;
  let paths: CamoucliPaths;

  beforeEach(async () => {
    vi.resetAllMocks();
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'camou-launch-init-'));
    paths = createTestPaths(rootDir);
    await ensureBasePaths(paths);
    await seedInstalledBrowser(paths, '135.0.1-beta.24');
    await setCurrentBrowser(paths, '135.0.1-beta.24');
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('registers launch init scripts as part of session launch', async () => {
    const { launchPersistentCamoufox } = await import('../src/camoufox/launcher.js');

    await launchPersistentCamoufox(paths, 'scripted', {
      initScript: '/tmp/init-a.js',
      initScripts: [{ content: 'window.ready = true;' }],
    });

    expect(launchPersistentContextMock).toHaveBeenCalledTimes(1);
    expect(addInitScriptMock).toHaveBeenNthCalledWith(1, { path: '/tmp/init-a.js' });
    expect(addInitScriptMock).toHaveBeenNthCalledWith(2, { content: 'window.ready = true;' });
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
