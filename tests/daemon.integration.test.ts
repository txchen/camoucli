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

  it('lists stored profiles on disk and marks running ones', async () => {
    await ensureSessionPaths(paths, 'stored-only');
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'running profile',
      tabName: 'main',
      url: 'data:text/html,%3Ctitle%3ERunning%3C%2Ftitle%3E',
      headless: true,
    });

    const profiles = (await sendDaemonRequest(paths, {
      action: 'profile.list',
    })) as Array<{ profileName: string; running: boolean }>;

    expect(profiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ profileName: 'stored-only', running: false }),
        expect.objectContaining({ profileName: 'running-profile', running: true }),
      ]),
    );
  });

  it('inspects one stored profile and includes running metadata when active', async () => {
    await ensureSessionPaths(paths, 'stored-only');
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'running profile',
      tabName: 'main',
      url: 'data:text/html,%3Ctitle%3ERunning%3C%2Ftitle%3E',
      headless: true,
    });

    const stored = (await sendDaemonRequest(paths, {
      action: 'profile.inspect',
      profile: 'stored-only',
    })) as { profileName: string; found: boolean; running: boolean };

    const running = (await sendDaemonRequest(paths, {
      action: 'profile.inspect',
      profile: 'running profile',
    })) as { profileName: string; found: boolean; running: boolean; sessionName?: string; tabs?: Array<{ tabName: string }> };

    const missing = (await sendDaemonRequest(paths, {
      action: 'profile.inspect',
      profile: 'missing',
    })) as { profileName: string; found: boolean; running: boolean };

    expect(stored).toMatchObject({ profileName: 'stored-only', found: true, running: false });
    expect(running).toMatchObject({ profileName: 'running-profile', found: true, running: true, sessionName: 'running profile' });
    expect(running.tabs).toEqual(expect.arrayContaining([expect.objectContaining({ tabName: 'main' })]));
    expect(missing).toMatchObject({ profileName: 'missing', found: false, running: false });
  });

  it('removes a stored profile and stops the running session if needed', async () => {
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'running profile',
      tabName: 'main',
      url: 'data:text/html,%3Ctitle%3ERunning%3C%2Ftitle%3E',
      headless: true,
    });

    const removed = (await sendDaemonRequest(paths, {
      action: 'profile.remove',
      profile: 'running profile',
    })) as { profileName: string; removed: boolean; stopped: boolean; rootDir: string };

    const profiles = (await sendDaemonRequest(paths, {
      action: 'profile.list',
    })) as Array<{ profileName: string }>;

    expect(removed).toMatchObject({
      profileName: 'running-profile',
      removed: true,
      stopped: true,
    });
    expect(removed.rootDir).toBe(path.join(paths.profilesDir, 'running-profile'));
    expect(profiles.map((profile) => profile.profileName)).not.toContain('running-profile');
  });

  it('evaluates JavaScript in the current tab', async () => {
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'eval-session',
      tabName: 'main',
      url: 'data:text/html,%3Ctitle%3EEval%20Page%3C%2Ftitle%3E',
      headless: true,
    });

    const result = (await sendDaemonRequest(paths, {
      action: 'eval',
      session: 'eval-session',
      tabName: 'main',
      expression: 'document.title',
    })) as { result: unknown; expression: string };

    expect(result).toMatchObject({ expression: 'document.title', result: 'Eval Page' });
  });

  it('exports and imports cookies for a session', async () => {
    const cookiePath = path.join(rootDir, 'cookies.json');
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'cookie-session',
      tabName: 'main',
      url: 'data:text/html,%3Ctitle%3ECookie%20Page%3C%2Ftitle%3E',
      headless: true,
    });

    await sendDaemonRequest(paths, {
      action: 'cookies.import',
      session: 'cookie-session',
      path: cookiePath,
    }).catch(() => undefined);

    await writeFile(cookiePath, JSON.stringify([{ name: 'sid', value: 'abc', domain: 'example.com', path: '/' }], null, 2), 'utf8');

    const imported = (await sendDaemonRequest(paths, {
      action: 'cookies.import',
      session: 'cookie-session',
      path: cookiePath,
    })) as { imported: number };

    const exported = (await sendDaemonRequest(paths, {
      action: 'cookies.export',
      session: 'cookie-session',
    })) as { count: number; cookies: Array<{ name: string; value: string }> };

    const fileExport = (await sendDaemonRequest(paths, {
      action: 'cookies.export',
      session: 'cookie-session',
      path: cookiePath,
    })) as { count: number; path: string };

    expect(imported).toMatchObject({ imported: 1 });
    expect(exported.count).toBe(1);
    expect(exported.cookies).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'sid', value: 'abc' })]));
    expect(fileExport).toMatchObject({ count: 1, path: cookiePath });
  });

  it('stops all running sessions through the public close-all action', async () => {
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'one',
      tabName: 'main',
      url: 'data:text/html,%3Ctitle%3EOne%3C%2Ftitle%3E',
      headless: true,
    });
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'two',
      tabName: 'main',
      url: 'data:text/html,%3Ctitle%3ETwo%3C%2Ftitle%3E',
      headless: true,
    });

    const closed = (await sendDaemonRequest(paths, {
      action: 'session.stopAll',
    })) as { stopped: number; sessionNames: string[] };
    const sessions = (await sendDaemonRequest(paths, {
      action: 'session.list',
    })) as Array<unknown>;

    expect(closed.stopped).toBe(2);
    expect(closed.sessionNames.sort()).toEqual(['one', 'two']);
    expect(sessions).toEqual([]);
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

  it('supports broader navigation, interaction, and extraction commands', async () => {
    const secondUrl = dataPage('<title>Second</title><p>Next page</p>');
    const controlsUrl = dataPage(`
      <title>Controls</title>
      <input id="name" placeholder="Name">
      <input id="agree" type="checkbox">
      <select id="choice"><option value="a" selected>A</option><option value="b">B</option></select>
      <button id="submit">Submit</button>
      <a id="next" href="${secondUrl}">Next</a>
    `);

    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'actions',
      tabName: 'main',
      url: controlsUrl,
      headless: true,
    });

    await sendDaemonRequest(paths, {
      action: 'hover',
      session: 'actions',
      tabName: 'main',
      target: '#submit',
    });

    await sendDaemonRequest(paths, {
      action: 'type',
      session: 'actions',
      tabName: 'main',
      target: '#name',
      text: 'hello',
    });

    let value = (await sendDaemonRequest(paths, {
      action: 'get.value',
      session: 'actions',
      tabName: 'main',
      target: '#name',
    })) as { value: string };
    expect(value.value).toBe('hello');

    await sendDaemonRequest(paths, {
      action: 'fill',
      session: 'actions',
      tabName: 'main',
      target: '#name',
      text: 'reset',
    });

    value = (await sendDaemonRequest(paths, {
      action: 'get.value',
      session: 'actions',
      tabName: 'main',
      target: '#name',
    })) as { value: string };
    expect(value.value).toBe('reset');

    await sendDaemonRequest(paths, {
      action: 'check',
      session: 'actions',
      tabName: 'main',
      target: '#agree',
    });

    await sendDaemonRequest(paths, {
      action: 'uncheck',
      session: 'actions',
      tabName: 'main',
      target: '#agree',
    });

    await sendDaemonRequest(paths, {
      action: 'select',
      session: 'actions',
      tabName: 'main',
      target: '#choice',
      value: 'b',
    });

    value = (await sendDaemonRequest(paths, {
      action: 'get.value',
      session: 'actions',
      tabName: 'main',
      target: '#choice',
    })) as { value: string };
    expect(value.value).toBe('b');

    await sendDaemonRequest(paths, {
      action: 'scroll',
      session: 'actions',
      tabName: 'main',
      direction: 'down',
      amount: 250,
    });

    await sendDaemonRequest(paths, {
      action: 'scroll.intoView',
      session: 'actions',
      tabName: 'main',
      target: '#submit',
    });

    await sendDaemonRequest(paths, {
      action: 'wait',
      session: 'actions',
      tabName: 'main',
      target: '#submit',
    });

    await sendDaemonRequest(paths, {
      action: 'wait',
      session: 'actions',
      tabName: 'main',
      text: 'Submit',
      loadState: 'networkidle',
    });

    await sendDaemonRequest(paths, {
      action: 'click',
      session: 'actions',
      tabName: 'main',
      target: '#next',
    });

    let pageState = (await sendDaemonRequest(paths, {
      action: 'get.title',
      session: 'actions',
      tabName: 'main',
    })) as { title: string };
    expect(pageState.title).toBe('Second');

    await sendDaemonRequest(paths, {
      action: 'back',
      session: 'actions',
      tabName: 'main',
    });
    pageState = (await sendDaemonRequest(paths, {
      action: 'get.title',
      session: 'actions',
      tabName: 'main',
    })) as { title: string };
    expect(pageState.title).toBe('Controls');

    await sendDaemonRequest(paths, {
      action: 'forward',
      session: 'actions',
      tabName: 'main',
    });
    pageState = (await sendDaemonRequest(paths, {
      action: 'get.title',
      session: 'actions',
      tabName: 'main',
    })) as { title: string };
    expect(pageState.title).toBe('Second');

    await sendDaemonRequest(paths, {
      action: 'reload',
      session: 'actions',
      tabName: 'main',
    });
    pageState = (await sendDaemonRequest(paths, {
      action: 'get.title',
      session: 'actions',
      tabName: 'main',
    })) as { title: string };
    expect(pageState.title).toBe('Second');
  });
});

function dataPage(html: string): string {
  return `data:text/html,${encodeURIComponent(html)}`;
}

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
