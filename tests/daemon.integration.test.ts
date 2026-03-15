import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveLaunchConfig } from '../src/camoufox/config.js';
import { requireInstalledBrowser, setCurrentBrowser, setInstalledBrowser } from '../src/camoufox/registry.js';
import type { CamoucliPaths } from '../src/state/paths.js';
import { ensureBasePaths, ensureSessionPaths } from '../src/state/paths.js';
import { Logger } from '../src/util/log.js';
import { createFakeBrowserContext, getFakeLaunchLog, getProfileState, recordFakeLaunch, resetFakeBrowserState } from './helpers/fake-browser.js';
import { createTestPaths } from './helpers/temp-paths.js';

vi.mock('../src/camoufox/launcher.js', async () => ({
  launchPersistentCamoufox: async (paths: CamoucliPaths, sessionName: string, input: Parameters<typeof resolveLaunchConfig>[0]) => {
    const browser = await requireInstalledBrowser(paths, input.browser);
    const sessionPaths = await ensureSessionPaths(paths, sessionName);
    const resolvedConfig = await resolveLaunchConfig(input);
    recordFakeLaunch({
      sessionName,
      profileDir: sessionPaths.profileDir,
      browserVersion: browser.version,
    });
    return {
      context: createFakeBrowserContext(sessionPaths.profileDir) as never,
      browserVersion: browser.version,
      installPath: browser.executablePath,
      sessionPaths,
      resolvedConfig,
    };
  },
  probeCamoufoxLaunch: async (paths: CamoucliPaths, version?: string) => {
    const browser = await requireInstalledBrowser(paths, version);
    const incompatible = browser.version.endsWith('beta.23');
    return {
      attempted: true,
      success: !incompatible,
      version: browser.version,
      executablePath: browser.executablePath,
      ...(incompatible ? { error: { message: 'Mock launch failure for beta.23' } } : {}),
    };
  },
}));

describe('daemon integration', () => {
  let rootDir: string;
  let paths: CamoucliPaths;
  let daemon: import('../src/daemon/daemon.js').CamoucliDaemon;
  let sendDaemonRequest: typeof import('../src/ipc/client.js').sendDaemonRequest;

  beforeEach(async () => {
    vi.resetModules();
    resetFakeBrowserState();

    rootDir = await mkdtemp(path.join(os.tmpdir(), 'camoucli-daemon-int-'));
    paths = createTestPaths(rootDir);
    await ensureBasePaths(paths);
    await seedInstalledBrowser(paths, '135.0.1-beta.24');
    await seedInstalledBrowser(paths, '135.0.1-beta.23');
    await setCurrentBrowser(paths, '135.0.1-beta.24');

    const daemonModule = await import('../src/daemon/daemon.js');
    const clientModule = await import('../src/ipc/client.js');
    sendDaemonRequest = clientModule.sendDaemonRequest;
    daemon = new daemonModule.CamoucliDaemon(paths, new Logger({ name: 'test-daemon' }));
    await daemon.start();
  });

  afterEach(async () => {
    await daemon?.stop().catch(() => undefined);
    await rm(rootDir, { recursive: true, force: true });
  });

  it('persists session pages across daemon restarts for the same profile', async () => {
    const pageUrl = 'data:text/html,%3Ctitle%3EPersisted%3C%2Ftitle%3E%3Cp%3Eremember%3C%2Fp%3E';

    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'persist',
      tabName: 'main',
      url: pageUrl,
      headless: true,
    });

    await daemon.stop();

    const daemonModule = await import('../src/daemon/daemon.js');
    daemon = new daemonModule.CamoucliDaemon(paths, new Logger({ name: 'test-daemon-restart' }));
    await daemon.start();

    const restored = (await sendDaemonRequest(paths, {
      action: 'get.url',
      session: 'persist',
      tabName: 'main',
    })) as { url: string };

    expect(restored.url).toBe(pageUrl);
    expect(getProfileState(path.join(paths.profilesDir, 'persist', 'user-data'))?.[0]?.url).toBe(pageUrl);
  });

  it('keeps tabs isolated and invalidates snapshot refs after navigation', async () => {
    const firstUrl = 'data:text/html,%3Ctitle%3EAlpha%3C%2Ftitle%3E%3Ca%20id%3D%22cta%22%20href%3D%22%23%22%3ELearn%20A%3C%2Fa%3E%3Cbutton%20id%3D%22go%22%3EGo%3C%2Fbutton%3E';
    const secondUrl = 'data:text/html,%3Ctitle%3EBeta%3C%2Ftitle%3E%3Cbutton%20id%3D%22beta%22%3EBeta%3C%2Fbutton%3E';
    const replacementUrl = 'data:text/html,%3Ctitle%3EGamma%3C%2Ftitle%3E%3Cbutton%20id%3D%22fresh%22%3EFresh%3C%2Fbutton%3E';

    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'work',
      tabName: 'main',
      url: firstUrl,
      headless: true,
    });
    await sendDaemonRequest(paths, {
      action: 'tab.new',
      session: 'work',
      tabName: 'side',
      url: secondUrl,
      headless: true,
    });

    const snapshot = (await sendDaemonRequest(paths, {
      action: 'snapshot',
      session: 'work',
      tabName: 'main',
      interactive: true,
    })) as { count: number; snapshot: string };

    expect(snapshot.count).toBeGreaterThan(0);
    expect(snapshot.snapshot).toContain('@e1');

    const sideTitle = (await sendDaemonRequest(paths, {
      action: 'get.title',
      session: 'work',
      tabName: 'side',
    })) as { title: string };
    expect(sideTitle.title).toBe('Beta');

    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'work',
      tabName: 'main',
      url: replacementUrl,
      headless: true,
    });

    await expect(
      sendDaemonRequest(paths, {
        action: 'click',
        session: 'work',
        tabName: 'main',
        target: '@e1',
      }),
    ).rejects.toMatchObject({
      code: 'ipc_error',
      message: 'Reference @e1 is not available for the current tab. Run snapshot again.',
    });
  });

  it('uses the selected browser version for new sessions and explicit browser overrides', async () => {
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'alpha',
      tabName: 'main',
      url: 'data:text/html,%3Ctitle%3EAlpha%3C%2Ftitle%3E',
      headless: true,
    });

    await setCurrentBrowser(paths, '135.0.1-beta.23');
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'beta',
      tabName: 'main',
      url: 'data:text/html,%3Ctitle%3EBeta%3C%2Ftitle%3E',
      headless: true,
    });
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'explicit',
      tabName: 'main',
      url: 'data:text/html,%3Ctitle%3EExplicit%3C%2Ftitle%3E',
      headless: true,
      browser: '135.0.1-beta.24',
    });

    const sessions = (await sendDaemonRequest(paths, {
      action: 'session.list',
    })) as Array<{ sessionName: string; browserVersion: string }>;

    expect(sessions.find((session) => session.sessionName === 'alpha')?.browserVersion).toBe('135.0.1-beta.24');
    expect(sessions.find((session) => session.sessionName === 'beta')?.browserVersion).toBe('135.0.1-beta.23');
    expect(sessions.find((session) => session.sessionName === 'explicit')?.browserVersion).toBe('135.0.1-beta.24');

    const launches = getFakeLaunchLog();
    expect(launches.map((launch) => `${launch.sessionName}:${launch.browserVersion}`)).toEqual(
      expect.arrayContaining(['alpha:135.0.1-beta.24', 'beta:135.0.1-beta.23', 'explicit:135.0.1-beta.24']),
    );
  });
});

async function seedInstalledBrowser(paths: CamoucliPaths, version: string): Promise<void> {
  const rootDir = path.join(paths.browsersDir, 'official', version);
  await mkdir(rootDir, { recursive: true });
  await writeFile(path.join(rootDir, 'camoufox-bin'), '#!/bin/sh\n', 'utf8');
  await writeFile(
    path.join(rootDir, 'properties.json'),
    JSON.stringify([{ property: 'navigator.language', type: 'str' }], null, 2),
    'utf8',
  );
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
