import os from 'node:os';
import path from 'node:path';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installCamoufox, listRemoteCamoufoxReleases } from '../src/camoufox/installer.js';
import { resolveInstalledBrowser } from '../src/camoufox/registry.js';
import { ensureBasePaths } from '../src/state/paths.js';
import { buildExpectedAssetName, getPlatformTarget } from '../src/util/platform.js';
import { createTestPaths } from './helpers/temp-paths.js';

vi.mock('extract-zip', () => ({
  default: async (_archivePath: string, options: { dir: string }) => {
    const target = getPlatformTarget();
    const executablePath = path.join(options.dir, target.executableRelativePath);
    await mkdir(path.dirname(executablePath), { recursive: true });
    await Promise.all([
      writeFile(executablePath, '#!/bin/sh\n', 'utf8'),
      writeFile(
        path.join(options.dir, 'properties.json'),
        JSON.stringify([{ property: 'navigator.language', type: 'str' }], null, 2),
        'utf8',
      ),
    ]);
  },
}));

describe('installer integration', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'camoucli-install-int-'));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    await rm(rootDir, { recursive: true, force: true });
  });

  it('installs a mocked release into the shared cache layout and updates the registry', async () => {
    const paths = createTestPaths(rootDir);
    await ensureBasePaths(paths);
    const target = getPlatformTarget();
    const expectedAssetName = buildExpectedAssetName('135.0.1-beta.24', target);
    const expectedExecutablePath = path.join(
      paths.browsersDir,
      'official',
      '135.0.1-beta.24',
      target.executableRelativePath,
    );

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/releases')) {
        return new Response(
          JSON.stringify([
            {
              tag_name: 'v135.0.1-beta.24',
              prerelease: false,
              assets: [
                {
                  name: expectedAssetName,
                  browser_download_url: `https://example.com/${expectedAssetName}`,
                },
              ],
            },
          ]),
          { status: 200 },
        );
      }

      return new Response('archive-data', { status: 200 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const release = await installCamoufox(paths, { version: '135.0.1-beta.24', force: true });
    const installed = await resolveInstalledBrowser(paths, release.version);

    expect(release.version).toBe('135.0.1-beta.24');
    expect(installed?.executablePath).toBe(expectedExecutablePath);

    const versionJson = JSON.parse(
      await readFile(path.join(paths.browsersDir, 'official', '135.0.1-beta.24', 'version.json'), 'utf8'),
    ) as { version?: string; build?: string };

    expect(versionJson).toMatchObject({ version: '135.0.1', build: 'beta.24' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('lists only remote releases compatible with the current machine', async () => {
    const target = getPlatformTarget();
    const compatibleAsset = buildExpectedAssetName('135.0.1-beta.24', target);
    const newerCompatibleAsset = buildExpectedAssetName('135.0.1-beta.25', target);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            {
              tag_name: 'v135.0.1-beta.24',
              prerelease: false,
              assets: [
                {
                  name: compatibleAsset,
                  browser_download_url: `https://example.com/${compatibleAsset}`,
                },
              ],
            },
            {
              tag_name: 'v135.0.1-beta.24-linux-x86_64',
              prerelease: false,
              assets: [
                {
                  name: 'camoufox-135.0.1-beta.24-win.x86_64.zip',
                  browser_download_url: 'https://example.com/incompatible.zip',
                },
              ],
            },
            {
              tag_name: 'v135.0.1-beta.25',
              prerelease: true,
              assets: [
                {
                  name: newerCompatibleAsset,
                  browser_download_url: `https://example.com/${newerCompatibleAsset}`,
                },
              ],
            },
          ]),
          { status: 200 },
        ),
      ),
    );

    const releases = await listRemoteCamoufoxReleases();

    expect(releases).toMatchObject([
      {
        version: '135.0.1-beta.25',
        tag: 'v135.0.1-beta.25',
        prerelease: true,
      },
      {
        version: '135.0.1-beta.24',
        tag: 'v135.0.1-beta.24',
        prerelease: false,
      },
    ]);
  });
});
