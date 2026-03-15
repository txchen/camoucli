import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm, stat } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestPaths } from './helpers/temp-paths.js';

const launchPersistentCamoufoxMock = vi.fn();

vi.mock('../src/camoufox/launcher.js', () => ({
  launchPersistentCamoufox: launchPersistentCamoufoxMock,
}));

describe('public Node API', () => {
  let rootDir: string;

  beforeEach(async () => {
    vi.resetModules();
    launchPersistentCamoufoxMock.mockReset();
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'camou-api-'));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('launches a programmatic Camoufox session and exposes metadata', async () => {
    const fakePage = { id: 'page-1' };
    const fakeContext = {
      close: vi.fn(async () => undefined),
      newPage: vi.fn(async () => fakePage),
      pages: vi.fn(() => [fakePage]),
    };

    launchPersistentCamoufoxMock.mockResolvedValue({
      context: fakeContext,
      browserVersion: '135.0.1-beta.24',
      installPath: '/tmp/camoufox-bin',
      sessionPaths: {
        sessionName: 'script',
        safeSessionName: 'script',
        rootDir: path.join(rootDir, 'data', 'profiles', 'script'),
        profileDir: path.join(rootDir, 'data', 'profiles', 'script', 'user-data'),
        downloadsDir: path.join(rootDir, 'data', 'profiles', 'script', 'downloads'),
        artifactsDir: path.join(rootDir, 'data', 'profiles', 'script', 'artifacts'),
      },
      resolvedConfig: {
        headless: true,
        browser: '135.0.1-beta.24',
        presetNames: ['cache'],
        camouConfig: {},
        firefoxUserPrefs: {},
      },
    });

    const { launchCamoufox } = await import('../src/index.js');
    const paths = createTestPaths(rootDir);
    const session = await launchCamoufox({
      paths,
      session: 'script',
      headless: true,
      browser: '135.0.1-beta.24',
      preset: ['cache'],
    });

    expect(launchPersistentCamoufoxMock).toHaveBeenCalledWith(
      paths,
      'script',
      expect.objectContaining({
        headless: true,
        browser: '135.0.1-beta.24',
        preset: ['cache'],
      }),
      undefined,
    );
    await expect(stat(paths.profilesDir)).resolves.toBeDefined();

    expect(session.sessionName).toBe('script');
    expect(session.browserVersion).toBe('135.0.1-beta.24');
    expect(session.executablePath).toBe('/tmp/camoufox-bin');
    expect(session.profileDir).toContain(path.join('profiles', 'script', 'user-data'));
    expect(await session.newPage()).toBe(fakePage);
    expect(session.pages()).toEqual([fakePage]);

    await session.close();
    expect(fakeContext.close).toHaveBeenCalledTimes(1);
  });

  it('returns the raw BrowserContext when requested', async () => {
    const fakeContext = {
      close: vi.fn(async () => undefined),
      newPage: vi.fn(async () => ({ id: 'page-1' })),
      pages: vi.fn(() => []),
    };

    launchPersistentCamoufoxMock.mockResolvedValue({
      context: fakeContext,
      browserVersion: '135.0.1-beta.24',
      installPath: '/tmp/camoufox-bin',
      sessionPaths: {
        sessionName: 'default',
        safeSessionName: 'default',
        rootDir: '/tmp/default',
        profileDir: '/tmp/default/user-data',
        downloadsDir: '/tmp/default/downloads',
        artifactsDir: '/tmp/default/artifacts',
      },
      resolvedConfig: {
        headless: false,
        presetNames: [],
        camouConfig: {},
        firefoxUserPrefs: {},
      },
    });

    const { launchCamoufoxContext } = await import('../src/index.js');
    const context = await launchCamoufoxContext({ paths: createTestPaths(rootDir) });

    expect(context).toBe(fakeContext);
  });

  it('closes the session after withCamoufox callbacks, even on failure', async () => {
    const fakeContext = {
      close: vi.fn(async () => undefined),
      newPage: vi.fn(async () => ({ id: 'page-1' })),
      pages: vi.fn(() => []),
    };

    launchPersistentCamoufoxMock.mockResolvedValue({
      context: fakeContext,
      browserVersion: '135.0.1-beta.24',
      installPath: '/tmp/camoufox-bin',
      sessionPaths: {
        sessionName: 'default',
        safeSessionName: 'default',
        rootDir: '/tmp/default',
        profileDir: '/tmp/default/user-data',
        downloadsDir: '/tmp/default/downloads',
        artifactsDir: '/tmp/default/artifacts',
      },
      resolvedConfig: {
        headless: false,
        presetNames: [],
        camouConfig: {},
        firefoxUserPrefs: {},
      },
    });

    const { withCamoufox } = await import('../src/index.js');

    await expect(
      withCamoufox({ paths: createTestPaths(rootDir) }, async (session) => {
        expect(session.browserVersion).toBe('135.0.1-beta.24');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(fakeContext.close).toHaveBeenCalledTimes(1);
  });
});
