import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveLaunchConfig } from '../src/camoufox/config.js';
import { requireInstalledBrowser, setCurrentBrowser, setInstalledBrowser } from '../src/camoufox/registry.js';
import type { CamoucliPaths } from '../src/state/paths.js';
import { ensureBasePaths, ensureSessionPaths } from '../src/state/paths.js';
import { Logger } from '../src/util/log.js';
import { createFakeBrowserContext, getFakeContexts, getFakeLaunchLog, getProfileState, recordFakeLaunch, resetFakeBrowserState } from './helpers/fake-browser.js';
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

  it('reports running and stopped session info without launching stopped sessions', async () => {
    await ensureSessionPaths(paths, 'stored-only');
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'running-info',
      tabName: 'main',
      url: 'data:text/html,%3Ctitle%3ERunning%3C%2Ftitle%3E',
      headless: true,
    });

    const running = (await sendDaemonRequest(paths, {
      action: 'session.info',
      session: 'running-info',
    })) as { sessionName: string; active: boolean; activeTabName?: string; launch?: { browser?: string; headless?: boolean }; tabs?: Array<{ tabName: string }> };
    const stopped = (await sendDaemonRequest(paths, {
      action: 'session.info',
      session: 'stored-only',
    })) as { sessionName: string; active: boolean; profileName: string; profileDir: string };

    expect(running).toMatchObject({
      sessionName: 'running-info',
      active: true,
      activeTabName: 'main',
      launch: {
        browser: '135.0.1-beta.24',
        headless: true,
      },
    });
    expect(running.tabs).toEqual(expect.arrayContaining([expect.objectContaining({ tabName: 'main' })]));
    expect(stopped).toMatchObject({
      sessionName: 'stored-only',
      profileName: 'stored-only',
      active: false,
      profileDir: path.join(paths.profilesDir, 'stored-only', 'user-data'),
      downloadsDir: path.join(paths.profilesDir, 'stored-only', 'downloads'),
      artifactsDir: path.join(paths.profilesDir, 'stored-only', 'artifacts'),
    });
    expect(getFakeLaunchLog().map((launch) => launch.sessionName)).not.toContain('stored-only');
  });

  it('rejects incompatible launch options for already-running sessions', async () => {
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'launch-options',
      tabName: 'main',
      url: 'about:blank',
      headless: true,
      proxy: 'http://127.0.0.1:8080',
      proxyBypass: 'localhost',
      headers: '{"x-test":"1"}',
      userAgent: 'CamouTest/1.0',
      ignoreHTTPSErrors: true,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      initScripts: [{ content: 'window.ready = true;' }],
    });

    await expect(
      sendDaemonRequest(paths, {
        action: 'open',
        session: 'launch-options',
        tabName: 'main',
        url: 'about:blank',
        proxy: 'http://127.0.0.1:8080',
        proxyBypass: 'localhost',
        headers: '{"x-test":"1"}',
        userAgent: 'CamouTest/1.0',
        ignoreHTTPSErrors: true,
        colorScheme: 'dark',
        reducedMotion: 'reduce',
        initScripts: [{ content: 'window.ready = true;' }],
      }),
    ).resolves.toMatchObject({
      sessionName: 'launch-options',
      tabName: 'main',
    });

    await expect(
      sendDaemonRequest(paths, {
        action: 'open',
        session: 'launch-options',
        tabName: 'main',
        url: 'about:blank',
        userAgent: 'DifferentUA/1.0',
      }),
    ).rejects.toMatchObject({
      code: 'session_error',
      message: expect.stringContaining('userAgent CamouTest/1.0'),
    });

    await expect(
      sendDaemonRequest(paths, {
        action: 'open',
        session: 'launch-options',
        tabName: 'main',
        url: 'about:blank',
        state: 'auth',
      }),
    ).rejects.toMatchObject({
      code: 'session_error',
      message: expect.stringContaining('Launch-time state can only be applied when starting a new session'),
    });

    await expect(
      sendDaemonRequest(paths, {
        action: 'open',
        session: 'launch-options',
        tabName: 'main',
        url: 'about:blank',
        initScripts: [{ content: 'window.ready = false;' }],
      }),
    ).rejects.toMatchObject({
      code: 'session_error',
      message: expect.stringContaining('different launch init scripts'),
    });

    const info = (await sendDaemonRequest(paths, {
      action: 'session.info',
      session: 'launch-options',
    })) as { launch?: Record<string, unknown> };
    expect(info.launch).toMatchObject({
      proxy: 'http://127.0.0.1:8080/',
      proxyBypass: 'localhost',
      extraHTTPHeaders: { 'x-test': '1' },
      userAgent: 'CamouTest/1.0',
      ignoreHTTPSErrors: true,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    });
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

    const titleResult = (await sendDaemonRequest(paths, {
      action: 'eval',
      session: 'eval-session',
      tabName: 'main',
      expression: 'document.title',
    })) as { result: unknown; expression: string };

    const mathResult = (await sendDaemonRequest(paths, {
      action: 'eval',
      session: 'eval-session',
      tabName: 'main',
      expression: '1+1',
    })) as { result: unknown; expression: string };

    expect(titleResult).toMatchObject({ expression: 'document.title', result: 'Eval Page' });
    expect(mathResult).toMatchObject({ expression: '1+1', result: 2 });
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

  it('gets sets imports and clears cookies without requiring cookie values in human output', async () => {
    const curlCookiePath = path.join(rootDir, 'curl-cookie.txt');
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'cookie-edit',
      tabName: 'main',
      url: 'https://example.com',
      headless: true,
    });

    const set = (await sendDaemonRequest(paths, {
      action: 'cookies.set',
      session: 'cookie-edit',
      tabName: 'main',
      name: 'sid',
      value: 'secret',
      domain: 'example.com',
      path: '/',
    })) as { count: number; names: string[] };
    const listed = (await sendDaemonRequest(paths, {
      action: 'cookies.get',
      session: 'cookie-edit',
    })) as { count: number; cookies: Array<{ name: string; value: string }> };

    await writeFile(curlCookiePath, "curl 'https://example.com' -H 'Cookie: imported=very-secret'", 'utf8');
    const imported = (await sendDaemonRequest(paths, {
      action: 'cookies.set',
      session: 'cookie-edit',
      tabName: 'main',
      curlPath: curlCookiePath,
    })) as { count: number; names: string[] };

    const cleared = (await sendDaemonRequest(paths, {
      action: 'cookies.clear',
      session: 'cookie-edit',
    })) as { cleared: number };

    expect(set).toMatchObject({ count: 1, names: ['sid'] });
    expect(listed.cookies).toEqual([expect.objectContaining({ name: 'sid', value: 'secret' })]);
    expect(imported).toMatchObject({ count: 1, names: ['imported'] });
    expect(cleared.cleared).toBe(1);
  });

  it('manages local and session storage for the current origin', async () => {
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'storage-session',
      tabName: 'main',
      url: 'https://example.com',
      headless: true,
    });

    await sendDaemonRequest(paths, {
      action: 'storage.local',
      operation: 'set',
      session: 'storage-session',
      tabName: 'main',
      key: 'token',
      value: 'secret',
    });
    await sendDaemonRequest(paths, {
      action: 'storage.session',
      operation: 'set',
      session: 'storage-session',
      tabName: 'main',
      key: 'flash',
      value: 'one',
    });

    const local = (await sendDaemonRequest(paths, {
      action: 'storage.local',
      operation: 'get',
      session: 'storage-session',
      tabName: 'main',
      key: 'token',
    })) as { origin: string; values: Record<string, string> };
    const sessionStorage = (await sendDaemonRequest(paths, {
      action: 'storage.session',
      operation: 'get',
      session: 'storage-session',
      tabName: 'main',
    })) as { values: Record<string, string> };

    await sendDaemonRequest(paths, {
      action: 'storage.local',
      operation: 'clear',
      session: 'storage-session',
      tabName: 'main',
      key: 'token',
    });
    const cleared = (await sendDaemonRequest(paths, {
      action: 'storage.local',
      operation: 'get',
      session: 'storage-session',
      tabName: 'main',
      key: 'token',
    })) as { values: Record<string, string | null> };

    expect(local).toMatchObject({ origin: 'https://example.com', values: { token: 'secret' } });
    expect(sessionStorage.values).toMatchObject({ flash: 'one' });
    expect(cleared.values.token).toBeNull();
  });

  it('routes requests logs details and writes a portable HAR artifact', async () => {
    const interceptedUrl = 'https://example.test/intercept';
    await sendDaemonRequest(paths, {
      action: 'network.har.start',
      session: 'network-session',
    });
    const routed = (await sendDaemonRequest(paths, {
      action: 'network.route',
      session: 'network-session',
      url: interceptedUrl,
      body: '<title>Intercepted</title><button>OK</button>',
      status: 201,
      contentType: 'text/html',
      resourceTypes: ['document'],
    })) as { routeId: string; behavior: string; routes: number };

    const opened = (await sendDaemonRequest(paths, {
      action: 'open',
      session: 'network-session',
      tabName: 'main',
      url: interceptedUrl,
    })) as { title: string };

    const listed = (await sendDaemonRequest(paths, {
      action: 'network.requests',
      session: 'network-session',
      status: 201,
      resourceTypes: ['document'],
    })) as { count: number; requests: Array<{ requestId: string; status: number; tabName: string; url: string }> };
    const requestId = listed.requests[0]?.requestId ?? '';
    const detail = (await sendDaemonRequest(paths, {
      action: 'network.request',
      session: 'network-session',
      requestId,
    })) as { request: { response: { status: number }; tabName: string; url: string } };

    const harResult = (await sendDaemonRequest(paths, {
      action: 'network.har.stop',
      session: 'network-session',
      path: 'capture.har',
    })) as { path: string; entries: number };
    const har = JSON.parse(await readFile(harResult.path, 'utf8')) as { log: { version: string; entries: Array<{ request: { url: string }; response: { status: number } }> } };

    const unrouted = (await sendDaemonRequest(paths, {
      action: 'network.unroute',
      session: 'network-session',
      url: interceptedUrl,
    })) as { removed: number; routes: number };

    await sendDaemonRequest(paths, {
      action: 'network.route',
      session: 'network-session',
      url: 'https://example.test/abort',
      abort: true,
    });
    await expect(sendDaemonRequest(paths, {
      action: 'open',
      session: 'network-session',
      tabName: 'main',
      url: 'https://example.test/abort',
    })).rejects.toThrow();
    const failed = (await sendDaemonRequest(paths, {
      action: 'network.requests',
      session: 'network-session',
      filter: 'ERR_FAILED',
    })) as { count: number; requests: Array<{ failed: boolean; errorText: string }> };

    expect(routed).toMatchObject({ behavior: 'fulfill', routes: 1 });
    expect(opened.title).toBe('Intercepted');
    expect(listed).toMatchObject({ count: 1 });
    expect(listed.requests[0]).toMatchObject({ status: 201, tabName: 'main', url: interceptedUrl });
    expect(detail.request).toMatchObject({ response: { status: 201 }, tabName: 'main', url: interceptedUrl });
    expect(harResult.path).toBe(path.join(paths.profilesDir, 'network-session', 'artifacts', 'har', 'capture.har'));
    expect(harResult.entries).toBe(1);
    expect(har.log).toMatchObject({ version: '1.2' });
    expect(har.log.entries[0]).toMatchObject({ request: { url: interceptedUrl }, response: { status: 201 } });
    expect(unrouted).toMatchObject({ removed: 1, routes: 0 });
    expect(failed.requests[0]).toMatchObject({ failed: true, errorText: 'net::ERR_FAILED' });
  });

  it('buffers console and page-error events in memory and clears them with counts', async () => {
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'debug-events',
      tabName: 'main',
      url: dataPage('<title>Debug</title><button id="target">Target</button>'),
      headless: true,
    });

    const page = getFakeContexts().at(-1)?.pageAt(0);
    page?.emitConsole('warning', 'careful', ['careful']);
    page?.emitPageError(new TypeError('boom'));

    const consoleResult = (await sendDaemonRequest(paths, {
      action: 'console',
      session: 'debug-events',
    })) as { count: number; entries: Array<{ text: string; type: string; tabName: string; title: string }> };
    const errorsResult = (await sendDaemonRequest(paths, {
      action: 'errors',
      session: 'debug-events',
    })) as { count: number; errors: Array<{ message: string; name: string; tabName: string; title: string }> };

    const clearedConsole = (await sendDaemonRequest(paths, {
      action: 'console',
      session: 'debug-events',
      clear: true,
    })) as { cleared: number; count: number };
    const clearedErrors = (await sendDaemonRequest(paths, {
      action: 'errors',
      session: 'debug-events',
      clear: true,
    })) as { cleared: number; count: number };
    const emptyConsole = (await sendDaemonRequest(paths, {
      action: 'console',
      session: 'debug-events',
    })) as { count: number };

    expect(consoleResult).toMatchObject({ count: 1 });
    expect(consoleResult.entries[0]).toMatchObject({ text: 'careful', type: 'warning', tabName: 'main', title: 'Debug' });
    expect(errorsResult).toMatchObject({ count: 1 });
    expect(errorsResult.errors[0]).toMatchObject({ message: 'boom', name: 'TypeError', tabName: 'main', title: 'Debug' });
    expect(clearedConsole).toMatchObject({ count: 1, cleared: 1 });
    expect(clearedErrors).toMatchObject({ count: 1, cleared: 1 });
    expect(emptyConsole.count).toBe(0);
  });

  it('highlights refs, uses page clipboard APIs, traces, and daemon-owned artifact paths', async () => {
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'debug-artifacts',
      tabName: 'main',
      url: dataPage('<title>Artifacts</title><button id="target">Target</button>'),
      headless: true,
    });
    const snapshot = (await sendDaemonRequest(paths, {
      action: 'snapshot',
      session: 'debug-artifacts',
      tabName: 'main',
      interactive: true,
    })) as { count: number };
    expect(snapshot.count).toBe(1);

    const highlighted = (await sendDaemonRequest(paths, {
      action: 'highlight',
      session: 'debug-artifacts',
      tabName: 'main',
      target: '@e1',
      durationMs: 25,
    })) as { target: string; durationMs: number };

    const wrote = (await sendDaemonRequest(paths, {
      action: 'clipboard.write',
      session: 'debug-artifacts',
      tabName: 'main',
      text: 'clip text',
    })) as { valueLength: number };
    const read = (await sendDaemonRequest(paths, {
      action: 'clipboard.read',
      session: 'debug-artifacts',
      tabName: 'main',
    })) as { text: string; valueLength: number };

    await sendDaemonRequest(paths, {
      action: 'clipboard.copy',
      session: 'debug-artifacts',
      tabName: 'main',
    });
    await sendDaemonRequest(paths, {
      action: 'clipboard.paste',
      session: 'debug-artifacts',
      tabName: 'main',
    });

    const screenshot = (await sendDaemonRequest(paths, {
      action: 'screenshot',
      session: 'debug-artifacts',
      tabName: 'main',
      format: 'png',
    })) as { path: string };

    const traceStarted = (await sendDaemonRequest(paths, {
      action: 'trace.start',
      session: 'debug-artifacts',
      screenshots: false,
      snapshots: true,
      sources: true,
    })) as { active: boolean; screenshots: boolean; snapshots: boolean; sources: boolean };
    const traceStopped = (await sendDaemonRequest(paths, {
      action: 'trace.stop',
      session: 'debug-artifacts',
      path: 'debug.zip',
    })) as { path: string; active: boolean };
    const traceFile = await readFile(traceStopped.path, 'utf8');

    expect(highlighted).toMatchObject({ target: '@e1', durationMs: 25 });
    expect(wrote.valueLength).toBe(9);
    expect(read).toMatchObject({ text: 'clip text', valueLength: 9 });
    expect(screenshot.path).toMatch(new RegExp(`${path.join('debug-artifacts', 'artifacts', 'screenshots').replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}`));
    expect(traceStarted).toMatchObject({ active: true, screenshots: false, snapshots: true, sources: true });
    expect(traceStopped).toMatchObject({ path: path.join(paths.profilesDir, 'debug-artifacts', 'artifacts', 'traces', 'debug.zip'), active: false });
    expect(traceFile).toContain('fake trace zip');
  });

  it('diffs snapshots screenshots and URLs, collects vitals, pushes history state, and reports init-script limits', async () => {
    const baselineImagePath = path.join(rootDir, 'baseline.png');
    await writeFile(
      baselineImagePath,
      Buffer.concat([
        Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'),
        Buffer.from([0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x08, 0x02, 0x00, 0x00, 0x00]),
        Buffer.from('different baseline image\n', 'utf8'),
      ]),
    );
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'parity-debug',
      tabName: 'main',
      url: dataPage('<title>One</title><button id="target">One</button>'),
      headless: true,
    });

    const snapshotDiff = (await sendDaemonRequest(paths, {
      action: 'diff.snapshot',
      session: 'parity-debug',
      tabName: 'main',
      baselineText: 'old snapshot',
      interactive: true,
    })) as { equal: boolean; changes: number; path: string; diff: { unified: string } };
    const screenshotDiff = (await sendDaemonRequest(paths, {
      action: 'diff.screenshot',
      session: 'parity-debug',
      tabName: 'main',
      baselinePath: baselineImagePath,
      format: 'png',
    })) as { equal: boolean; bytesDifferent: number; path: string; actualPath: string; algorithm: string };
    const urlDiff = (await sendDaemonRequest(paths, {
      action: 'diff.url',
      session: 'parity-debug',
      tabName: 'main',
      leftUrl: dataPage('<title>Left</title><p>Left text</p>'),
      rightUrl: dataPage('<title>Right</title><p>Right text</p>'),
      mode: 'snapshot',
    })) as { equal: boolean; left: { finalUrl: string; mutated: boolean }; right: { finalUrl: string; mutated: boolean }; path: string };
    const vitals = (await sendDaemonRequest(paths, {
      action: 'vitals',
      session: 'parity-debug',
      tabName: 'main',
    })) as { metrics: { webVitals: { ttfb: number; fcp: number } } };

    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'parity-debug',
      tabName: 'main',
      url: 'https://example.com',
    });
    const pushed = (await sendDaemonRequest(paths, {
      action: 'pushstate',
      session: 'parity-debug',
      tabName: 'main',
      url: '/next',
    })) as { before: string; after: string };
    await expect(
      sendDaemonRequest(paths, {
        action: 'pushstate',
        session: 'parity-debug',
        tabName: 'main',
        url: 'https://other.example/blocked',
      }),
    ).rejects.toMatchObject({ code: 'validation_error', message: expect.stringContaining('pushstate failed') });

    const addedScript = (await sendDaemonRequest(paths, {
      action: 'addinitscript',
      session: 'parity-debug',
      source: 'window.injected = true;',
    })) as { id: string; sourceLength: number };
    const context = getFakeContexts().at(-1);
    const removedScript = (await sendDaemonRequest(paths, {
      action: 'removeinitscript',
      session: 'parity-debug',
      scriptId: addedScript.id,
    })) as { removed: boolean; unsupported: boolean; reason: string };

    expect(snapshotDiff).toMatchObject({ equal: false, changes: expect.any(Number) });
    expect(snapshotDiff.path).toContain(path.join('parity-debug', 'artifacts', 'diffs'));
    expect(snapshotDiff.diff.unified).toContain('-old snapshot');
    expect(screenshotDiff).toMatchObject({ equal: false, algorithm: 'byte-compare-with-image-header-metadata' });
    expect(screenshotDiff.bytesDifferent).toBeGreaterThan(0);
    await expect(stat(screenshotDiff.path)).resolves.toBeDefined();
    await expect(stat(screenshotDiff.actualPath)).resolves.toBeDefined();
    expect(urlDiff).toMatchObject({ equal: false, left: { mutated: false }, right: { mutated: false } });
    await expect(stat(urlDiff.path)).resolves.toBeDefined();
    expect(vitals.metrics.webVitals).toMatchObject({ ttfb: 5, fcp: 25 });
    expect(pushed).toMatchObject({ before: 'https://example.com/', after: 'https://example.com/next' });
    expect(addedScript.sourceLength).toBe('window.injected = true;'.length);
    expect(context?.initScripts).toContain('window.injected = true;');
    expect(removedScript).toMatchObject({ removed: false, unsupported: true });
    expect(removedScript.reason).toContain('does not expose removal');

    const nonImagePath = path.join(rootDir, 'baseline.txt');
    await writeFile(nonImagePath, 'not an image\n', 'utf8');
    await expect(
      sendDaemonRequest(paths, {
        action: 'diff.screenshot',
        session: 'parity-debug',
        tabName: 'main',
        baselinePath: nonImagePath,
      }),
    ).rejects.toMatchObject({ code: 'validation_error', message: expect.stringContaining('PNG or JPEG') });
  });

  it('manages portable state snapshots without deleting profiles', async () => {
    await ensureSessionPaths(paths, 'stored-profile');
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'state-source',
      tabName: 'main',
      url: 'https://example.com',
      headless: true,
    });
    await sendDaemonRequest(paths, {
      action: 'storage.local',
      operation: 'set',
      session: 'state-source',
      tabName: 'main',
      key: 'token',
      value: 'secret',
    });
    await sendDaemonRequest(paths, {
      action: 'cookies.set',
      session: 'state-source',
      tabName: 'main',
      name: 'sid',
      value: 'secret',
      domain: 'example.com',
      path: '/',
    });

    const saved = (await sendDaemonRequest(paths, {
      action: 'state.save',
      session: 'state-source',
      path: 'auth',
    })) as { path: string; cookies: number; origins: number };
    const listed = (await sendDaemonRequest(paths, { action: 'state.list' })) as { states: Array<{ name: string }> };
    const shown = (await sendDaemonRequest(paths, { action: 'state.show', path: 'auth' })) as { cookies: number; origins: number };
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'state-target',
      tabName: 'main',
      url: 'https://example.com',
      headless: true,
    });
    const loaded = (await sendDaemonRequest(paths, {
      action: 'state.load',
      session: 'state-target',
      path: 'auth',
    })) as { mode: string; cookies: number; localStorageItems: number };

    const importedLocal = (await sendDaemonRequest(paths, {
      action: 'storage.local',
      operation: 'get',
      session: 'state-target',
      tabName: 'main',
      key: 'token',
    })) as { values: Record<string, string> };

    const renamed = await sendDaemonRequest(paths, { action: 'state.rename', from: 'auth', to: 'renamed' });
    await writeFile(path.join(paths.statesDir, 'broken.json'), '{', 'utf8');
    const cleaned = (await sendDaemonRequest(paths, { action: 'state.clean' })) as { removed: number };
    const cleared = (await sendDaemonRequest(paths, { action: 'state.clear', all: true })) as { removed: number };
    const profiles = (await sendDaemonRequest(paths, { action: 'profile.list' })) as Array<{ profileName: string }>;

    expect(saved.path).toBe(path.join(paths.statesDir, 'auth.json'));
    expect(saved).toMatchObject({ cookies: 1, origins: 1 });
    expect(listed.states).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'auth' })]));
    expect(shown).toMatchObject({ cookies: 1, origins: 1 });
    expect(loaded).toMatchObject({ mode: 'merge', cookies: 1, localStorageItems: 1 });
    expect(importedLocal.values).toMatchObject({ token: 'secret' });
    expect(renamed).toMatchObject({ path: path.join(paths.statesDir, 'renamed.json') });
    expect(cleaned.removed).toBe(1);
    expect(cleared.removed).toBe(1);
    expect(profiles.map((profile) => profile.profileName)).toContain('stored-profile');
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
      code: 'invalid_ref',
      message: 'Reference @e1 is not available for the current tab. Run snapshot again.',
    });
  });

  it('supports URL-less open and active tab selection without explicit tab names', async () => {
    const launchOnly = (await sendDaemonRequest(paths, {
      action: 'open',
      session: 'lifecycle',
      headless: true,
    })) as { sessionName: string; tabName: string; url: string };

    expect(launchOnly).toMatchObject({ sessionName: 'lifecycle', tabName: 'main', url: 'about:blank' });

    await sendDaemonRequest(paths, {
      action: 'tab.new',
      session: 'lifecycle',
      tabName: 'docs',
      url: dataPage('<title>Docs</title>'),
      headless: true,
    });

    await sendDaemonRequest(paths, {
      action: 'tab.activate',
      session: 'lifecycle',
      target: 'docs',
    });

    const activeTitle = (await sendDaemonRequest(paths, {
      action: 'get.title',
      session: 'lifecycle',
    })) as { tabName: string; title: string };

    expect(activeTitle).toMatchObject({ tabName: 'docs', title: 'Docs' });

    const explicitMainTitle = (await sendDaemonRequest(paths, {
      action: 'get.title',
      session: 'lifecycle',
      tabName: 'main',
    })) as { tabName: string; title: string };

    expect(explicitMainTitle).toMatchObject({ tabName: 'main', title: 'about:blank' });
  });

  it('generates tab names, switches tabs, and chooses a deterministic active tab after close', async () => {
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'tabs',
      headless: true,
    });

    const generated = (await sendDaemonRequest(paths, {
      action: 'tab.new',
      session: 'tabs',
      url: dataPage('<title>Generated</title>'),
      headless: true,
    })) as { tabName: string };

    expect(generated.tabName).toBe('t2');

    const active = (await sendDaemonRequest(paths, {
      action: 'tab.activate',
      session: 'tabs',
      target: 'main',
    })) as { tabName: string };
    expect(active.tabName).toBe('main');

    const closed = (await sendDaemonRequest(paths, {
      action: 'tab.close',
      session: 'tabs',
    })) as { closed: boolean; tabName: string; activeTabName?: string };

    expect(closed).toMatchObject({ closed: true, tabName: 'main', activeTabName: 't2' });

    const activeTitle = (await sendDaemonRequest(paths, {
      action: 'get.title',
      session: 'tabs',
    })) as { tabName: string; title: string };
    expect(activeTitle).toMatchObject({ tabName: 't2', title: 'Generated' });
  });

  it('creates tracked pages through window new', async () => {
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'windows',
      headless: true,
    });

    const created = (await sendDaemonRequest(paths, {
      action: 'window.new',
      session: 'windows',
      label: 'child',
      url: dataPage('<title>Child</title>'),
      headless: true,
    })) as { tabName: string; page: boolean; window: boolean; title: string };

    expect(created).toMatchObject({ tabName: 'child', page: true, window: false, title: 'Child' });

    const activeTitle = (await sendDaemonRequest(paths, {
      action: 'get.title',
      session: 'windows',
    })) as { tabName: string; title: string };
    expect(activeTitle).toMatchObject({ tabName: 'child', title: 'Child' });
  });

  it('tracks click --new-tab popups and reports timeout when no page opens', async () => {
    const popupUrl = dataPage('<title>Popup</title>');
    const openerUrl = dataPage(`<title>Opener</title><a id="popup" href="${popupUrl}" target="_blank">Open popup</a><button id="stay">Stay</button>`);

    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'popups',
      tabName: 'main',
      url: openerUrl,
      headless: true,
    });

    const popup = (await sendDaemonRequest(paths, {
      action: 'click',
      session: 'popups',
      target: '#popup',
      newTab: true,
      label: 'popup',
      timeoutMs: 250,
    })) as { oldTabName: string; newTabName: string; title: string };

    expect(popup).toMatchObject({ oldTabName: 'main', newTabName: 'popup', title: 'Popup' });

    const activeTitle = (await sendDaemonRequest(paths, {
      action: 'get.title',
      session: 'popups',
    })) as { tabName: string; title: string };
    expect(activeTitle).toMatchObject({ tabName: 'popup', title: 'Popup' });

    await sendDaemonRequest(paths, {
      action: 'tab.activate',
      session: 'popups',
      target: 'main',
    });

    await expect(
      sendDaemonRequest(paths, {
        action: 'click',
        session: 'popups',
        target: '#stay',
        newTab: true,
        timeoutMs: 10,
      }),
    ).rejects.toMatchObject({
      code: 'timeout_error',
      message: 'Timed out waiting for a new tab after clicking #stay.',
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
      <div id="pane">Scrollable pane</div>
      <input id="name" placeholder="Name">
      <input id="agree" type="checkbox">
      <input id="file" type="file">
      <select id="choice"><option value="a" selected>A</option><option value="b">B</option><option value="c">C</option></select>
      <button id="submit">Submit</button>
      <button id="secondary" title="Secondary action">Second</button>
      <img id="logo" alt="Logo" data-testid="brand-logo">
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
      action: 'focus',
      session: 'actions',
      tabName: 'main',
      target: '#name',
    });

    await sendDaemonRequest(paths, {
      action: 'hover',
      session: 'actions',
      tabName: 'main',
      target: '#submit',
    });

    await sendDaemonRequest(paths, {
      action: 'dblclick',
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
      delayMs: 5,
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
      action: 'type',
      session: 'actions',
      tabName: 'main',
      target: '#name',
      text: 'typed',
      clear: true,
    });

    value = (await sendDaemonRequest(paths, {
      action: 'get.value',
      session: 'actions',
      tabName: 'main',
      target: '#name',
    })) as { value: string };
    expect(value.value).toBe('typed');

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
      value: ['b', 'c'],
    });

    value = (await sendDaemonRequest(paths, {
      action: 'get.value',
      session: 'actions',
      tabName: 'main',
      target: '#choice',
    })) as { value: string };
    expect(value.value).toBe('b,c');

    await sendDaemonRequest(paths, {
      action: 'keyboard.down',
      session: 'actions',
      tabName: 'main',
      key: 'Shift',
    });

    await sendDaemonRequest(paths, {
      action: 'keyboard.up',
      session: 'actions',
      tabName: 'main',
      key: 'Shift',
    });

    await sendDaemonRequest(paths, {
      action: 'keyboard.type',
      session: 'actions',
      tabName: 'main',
      text: 'keyboard',
      delayMs: 1,
    });

    await sendDaemonRequest(paths, {
      action: 'keyboard.insertText',
      session: 'actions',
      tabName: 'main',
      text: 'inserted',
    });

    await sendDaemonRequest(paths, {
      action: 'mouse.move',
      session: 'actions',
      tabName: 'main',
      x: 10,
      y: 20,
    });

    await sendDaemonRequest(paths, {
      action: 'mouse.down',
      session: 'actions',
      tabName: 'main',
      button: 'right',
    });

    await sendDaemonRequest(paths, {
      action: 'mouse.up',
      session: 'actions',
      tabName: 'main',
    });

    await sendDaemonRequest(paths, {
      action: 'mouse.wheel',
      session: 'actions',
      tabName: 'main',
      deltaX: 0,
      deltaY: 100,
    });

    await sendDaemonRequest(paths, {
      action: 'scroll',
      session: 'actions',
      tabName: 'main',
      direction: 'down',
      amount: 250,
    });

    await sendDaemonRequest(paths, {
      action: 'scroll',
      session: 'actions',
      tabName: 'main',
      target: '#pane',
    });

    await sendDaemonRequest(paths, {
      action: 'scroll.intoView',
      session: 'actions',
      tabName: 'main',
      target: '#submit',
    });

    await sendDaemonRequest(paths, {
      action: 'upload',
      session: 'actions',
      tabName: 'main',
      target: '#file',
      files: ['a.txt', 'b.txt'],
    });

    await sendDaemonRequest(paths, {
      action: 'drag',
      session: 'actions',
      tabName: 'main',
      source: '#submit',
      target: '#secondary',
    });

    const html = (await sendDaemonRequest(paths, {
      action: 'get.html',
      session: 'actions',
      tabName: 'main',
      target: '#pane',
    })) as { html: string };
    expect(html.html).toBe('Scrollable pane');

    const attr = (await sendDaemonRequest(paths, {
      action: 'get.attr',
      session: 'actions',
      tabName: 'main',
      target: '#next',
      attribute: 'href',
    })) as { value: string };
    expect(attr.value).toBe(secondUrl);

    const count = (await sendDaemonRequest(paths, {
      action: 'get.count',
      session: 'actions',
      tabName: 'main',
      target: 'button',
    })) as { count: number };
    expect(count.count).toBe(2);

    const box = (await sendDaemonRequest(paths, {
      action: 'get.box',
      session: 'actions',
      tabName: 'main',
      target: '#submit',
    })) as { box: { width: number } };
    expect(box.box.width).toBe(100);

    const styles = (await sendDaemonRequest(paths, {
      action: 'get.styles',
      session: 'actions',
      tabName: 'main',
      target: '#submit',
    })) as { styles: { display: string } };
    expect(styles.styles.display).toBe('block');

    const visible = (await sendDaemonRequest(paths, {
      action: 'is.visible',
      session: 'actions',
      tabName: 'main',
      target: '#submit',
    })) as { value: boolean };
    expect(visible.value).toBe(true);

    const enabled = (await sendDaemonRequest(paths, {
      action: 'is.enabled',
      session: 'actions',
      tabName: 'main',
      target: '#submit',
    })) as { value: boolean };
    expect(enabled.value).toBe(true);

    const checked = (await sendDaemonRequest(paths, {
      action: 'is.checked',
      session: 'actions',
      tabName: 'main',
      target: '#agree',
    })) as { value: boolean };
    expect(checked.value).toBe(false);

    const findText = (await sendDaemonRequest(paths, {
      action: 'find',
      session: 'actions',
      tabName: 'main',
      locatorType: 'role',
      value: 'button',
      name: 'Submit',
      subaction: 'text',
    })) as { text: string };
    expect(findText.text).toBe('Submit');

    await sendDaemonRequest(paths, {
      action: 'find',
      session: 'actions',
      tabName: 'main',
      locatorType: 'placeholder',
      value: 'Name',
      subaction: 'fill',
      text: 'Grace',
    });

    value = (await sendDaemonRequest(paths, {
      action: 'get.value',
      session: 'actions',
      tabName: 'main',
      target: '#name',
    })) as { value: string };
    expect(value.value).toBe('Grace');

    await sendDaemonRequest(paths, {
      action: 'find',
      session: 'actions',
      tabName: 'main',
      locatorType: 'nth',
      target: 'button',
      index: 1,
      subaction: 'hover',
    });

    await sendDaemonRequest(paths, {
      action: 'wait',
      session: 'actions',
      tabName: 'main',
      ms: 1,
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
      url: '**/controls',
      fn: 'document.title === "Controls"',
    });

    const screenshot = (await sendDaemonRequest(paths, {
      action: 'screenshot',
      session: 'actions',
      tabName: 'main',
      target: '#submit',
      format: 'jpeg',
      quality: 80,
    })) as { path: string; target: string; format: string };
    expect(screenshot.target).toBe('#submit');
    expect(screenshot.format).toBe('jpeg');
    await expect(stat(screenshot.path)).resolves.toBeDefined();
    await expect(readFile(screenshot.path, 'utf8')).resolves.toContain('fake element screenshot');

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

  it('handles downloads, runtime settings, frames, dialogs, and local DOM reads', async () => {
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'stateful',
      tabName: 'main',
      url: dataPage(`
        <title>Stateful</title>
        <a id="export" href="https://example.com/report.csv" download="report.csv" data-download="id,name">Export</a>
        <iframe id="child" data-frame-text="Inside Frame"></iframe>
        <button id="prompt" data-dialog="prompt" data-dialog-message="Name?" data-dialog-default="Ada">Prompt</button>
        <p>Alpha text</p>
        <p>Beta text</p>
      `),
      headless: true,
    });

    const download = (await sendDaemonRequest(paths, {
      action: 'download',
      session: 'stateful',
      tabName: 'main',
      target: '#export',
      path: 'reports/export.csv',
      timeoutMs: 1000,
    })) as { path: string; suggestedFilename: string; url: string };
    expect(download.path).toBe(path.join(paths.profilesDir, 'stateful', 'downloads', 'reports', 'export.csv'));
    expect(download.suggestedFilename).toBe('report.csv');
    expect(download.url).toBe('https://example.com/report.csv');
    await expect(readFile(download.path, 'utf8')).resolves.toBe('id,name');

    await expect(
      sendDaemonRequest(paths, {
        action: 'wait',
        session: 'stateful',
        tabName: 'main',
        download: true,
        timeoutMs: 5,
      }),
    ).rejects.toMatchObject({ code: 'timeout_error' });

    await expect(
      sendDaemonRequest(paths, {
        action: 'runtime.set',
        session: 'stateful',
        tabName: 'main',
        runtime: { setting: 'media' },
      }),
    ).rejects.toMatchObject({ code: 'validation_error', message: expect.stringContaining('media') });

    await expect(
      sendDaemonRequest(paths, {
        action: 'runtime.set',
        session: 'stateful',
        tabName: 'main',
        runtime: { setting: 'viewport', width: 800, height: 600 },
      }),
    ).resolves.toMatchObject({ setting: 'viewport', lifetime: 'tab', viewport: { width: 800, height: 600 } });

    await expect(
      sendDaemonRequest(paths, {
        action: 'runtime.set',
        session: 'stateful',
        tabName: 'main',
        runtime: { setting: 'geolocation', latitude: 47.6, longitude: -122.3, accuracy: 5 },
      }),
    ).resolves.toMatchObject({ setting: 'geolocation', lifetime: 'session' });

    await expect(
      sendDaemonRequest(paths, {
        action: 'runtime.set',
        session: 'stateful',
        tabName: 'main',
        runtime: { setting: 'offline', value: true },
      }),
    ).resolves.toMatchObject({ setting: 'offline', lifetime: 'session', offline: true });

    await expect(
      sendDaemonRequest(paths, {
        action: 'runtime.set',
        session: 'stateful',
        tabName: 'main',
        runtime: { setting: 'headers', headers: { 'x-test': '1' } },
      }),
    ).resolves.toMatchObject({ setting: 'headers', lifetime: 'session', headers: { 'x-test': '1' } });

    await expect(
      sendDaemonRequest(paths, {
        action: 'runtime.set',
        session: 'stateful',
        tabName: 'main',
        runtime: { setting: 'credentials', origin: 'https://example.com', username: 'ada', password: 'secret' },
      }),
    ).resolves.toMatchObject({ setting: 'credentials', lifetime: 'session', origin: 'https://example.com', username: 'ada' });

    await expect(
      sendDaemonRequest(paths, {
        action: 'runtime.set',
        session: 'stateful',
        tabName: 'main',
        runtime: { setting: 'media', colorScheme: 'dark', reducedMotion: 'reduce' },
      }),
    ).resolves.toMatchObject({ setting: 'media', lifetime: 'tab', colorScheme: 'dark', reducedMotion: 'reduce' });

    await expect(
      sendDaemonRequest(paths, {
        action: 'frame',
        session: 'stateful',
        tabName: 'main',
        target: '#child',
      }),
    ).resolves.toMatchObject({ active: true, frame: '#child' });
    await expect(
      sendDaemonRequest(paths, {
        action: 'get.text',
        session: 'stateful',
        tabName: 'main',
        target: '#inside',
      }),
    ).resolves.toMatchObject({ text: 'Inside Frame' });
    await expect(
      sendDaemonRequest(paths, {
        action: 'frame',
        session: 'stateful',
        tabName: 'main',
        target: 'main',
      }),
    ).resolves.toMatchObject({ active: false });

    await expect(sendDaemonRequest(paths, {
      action: 'click',
      session: 'stateful',
      tabName: 'main',
      target: '#prompt',
    })).resolves.toMatchObject({ dialog: true });
    await expect(
      sendDaemonRequest(paths, {
        action: 'dialog.status',
        session: 'stateful',
        tabName: 'main',
      }),
    ).resolves.toMatchObject({ pending: true, dialog: { type: 'prompt', message: 'Name?', defaultValue: 'Ada' } });
    await expect(
      sendDaemonRequest(paths, {
        action: 'dialog.accept',
        session: 'stateful',
        tabName: 'main',
        text: 'Grace',
      }),
    ).resolves.toMatchObject({ action: 'dialog.accept', text: 'Grace', dialog: { type: 'prompt' } });
    await expect(
      sendDaemonRequest(paths, {
        action: 'dialog.status',
        session: 'stateful',
        tabName: 'main',
      }),
    ).resolves.toMatchObject({ pending: false });

    const read = (await sendDaemonRequest(paths, {
      action: 'read',
      session: 'stateful',
      tabName: 'main',
      mode: 'text',
      filter: 'Beta',
    })) as { content: string };
    expect(read.content).toContain('Beta text');
    expect(read.content).not.toContain('Alpha text');

    const outline = (await sendDaemonRequest(paths, {
      action: 'read',
      session: 'stateful',
      tabName: 'main',
      mode: 'outline',
      filter: 'Export',
    })) as { content: string };
    expect(outline.content).toContain('a Export');

    await sendDaemonRequest(paths, {
      action: 'frame',
      session: 'stateful',
      tabName: 'main',
      target: '#child',
    });
    await sendDaemonRequest(paths, {
      action: 'open',
      session: 'stateful',
      tabName: 'main',
      url: dataPage('<title>Next</title><p>Navigation clears frame context</p>'),
    });
    const tabs = (await sendDaemonRequest(paths, {
      action: 'tab.list',
      session: 'stateful',
    })) as Array<{ tabName: string; activeFrame?: string }>;
    expect(tabs.find((tab) => tab.tabName === 'main')).not.toHaveProperty('activeFrame');
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
