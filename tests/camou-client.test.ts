import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestPaths } from './helpers/temp-paths.js';

const mocks = vi.hoisted(() => ({
  ensureDaemonRunning: vi.fn(),
  sendDaemonRequest: vi.fn(),
}));

vi.mock('../src/cli/daemon.js', () => ({
  ensureDaemonRunning: mocks.ensureDaemonRunning,
}));

vi.mock('../src/ipc/client.js', () => ({
  sendDaemonRequest: mocks.sendDaemonRequest,
}));

describe('CamouClient public Node API', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'camou-client-'));
    mocks.ensureDaemonRunning.mockReset();
    mocks.sendDaemonRequest.mockReset();
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('sends browser commands with defaults launch options paths and timeout propagation', async () => {
    mocks.sendDaemonRequest.mockResolvedValue({ sessionName: 'work', tabName: 'main', url: 'https://example.com' });

    const { CamouClient } = await import('../src/index.js');
    const paths = createTestPaths(rootDir);
    const client = CamouClient.create({
      paths,
      session: 'work',
      tabName: 'main',
      timeoutMs: 1234,
      verbose: true,
      headless: true,
      browser: '135.0.1-beta.24',
      extraHTTPHeaders: { 'x-api': 'yes' },
      initScripts: [{ content: 'window.ready = true;' }],
    });

    const result = await client.open('example.com');

    expect(result).toEqual({ sessionName: 'work', tabName: 'main', url: 'https://example.com' });
    expect(mocks.ensureDaemonRunning).toHaveBeenCalledWith(paths, true);
    expect(mocks.sendDaemonRequest).toHaveBeenCalledWith(
      paths,
      {
        action: 'open',
        url: 'example.com',
        session: 'work',
        tabName: 'main',
        headless: true,
        browser: '135.0.1-beta.24',
        extraHTTPHeaders: { 'x-api': 'yes' },
        initScripts: [{ content: 'window.ready = true;' }],
      },
      1234,
    );
  });

  it('exposes canonical methods without CLI-only aliases or unsupported stubs', async () => {
    const { createCamouClient } = await import('../src/index.js');
    const client = createCamouClient({ paths: createTestPaths(rootDir), autoStartDaemon: false });
    const surface = client as unknown as Record<string, unknown>;

    expect(typeof surface.open).toBe('function');
    expect(typeof surface.press).toBe('function');
    expect(typeof surface.scrollIntoView).toBe('function');
    expect(surface.goto).toBeUndefined();
    expect(surface.navigate).toBeUndefined();
    expect(surface.key).toBeUndefined();
    expect(surface.scrollinto).toBeUndefined();
    expect(surface.quit).toBeUndefined();
    expect(surface.exit).toBeUndefined();
    expect(surface.connect).toBeUndefined();
    expect(surface.inspect).toBeUndefined();
    expect(surface.pdf).toBeUndefined();
  });

  it('wraps state network trace and cookie workflows as structured methods', async () => {
    mocks.sendDaemonRequest
      .mockResolvedValueOnce({ saved: true, path: '/tmp/auth.json' })
      .mockResolvedValueOnce({ routeId: 'route_1' })
      .mockResolvedValueOnce({ requests: [{ id: 'net_1' }] })
      .mockResolvedValueOnce({ tracing: true })
      .mockResolvedValueOnce({ path: '/tmp/trace.zip' })
      .mockResolvedValueOnce({ count: 1 });

    const { createCamouClient } = await import('../src/index.js');
    const paths = createTestPaths(rootDir);
    const client = createCamouClient({ paths, session: 'work', tabName: 'main', autoStartDaemon: false });

    await expect(client.state.save('auth')).resolves.toEqual({ saved: true, path: '/tmp/auth.json' });
    await expect(client.network.route('**/api', { abort: true, resourceTypes: ['xhr'] })).resolves.toEqual({ routeId: 'route_1' });
    await expect(client.network.requests({ method: 'GET', clear: true, timeoutMs: 5000 })).resolves.toEqual({ requests: [{ id: 'net_1' }] });
    await expect(client.trace.start({ screenshots: false })).resolves.toEqual({ tracing: true });
    await expect(client.trace.stop('trace.zip')).resolves.toEqual({ path: '/tmp/trace.zip' });
    await expect(client.cookies.set({ name: 'sid', value: 'secret', domain: 'example.com', path: '/' })).resolves.toEqual({ count: 1 });

    expect(mocks.ensureDaemonRunning).not.toHaveBeenCalled();
    expect(mocks.sendDaemonRequest).toHaveBeenNthCalledWith(1, paths, { action: 'state.save', path: 'auth', session: 'work' }, 20_000);
    expect(mocks.sendDaemonRequest).toHaveBeenNthCalledWith(
      2,
      paths,
      { action: 'network.route', url: '**/api', abort: true, resourceTypes: ['xhr'], session: 'work', tabName: 'main' },
      20_000,
    );
    expect(mocks.sendDaemonRequest).toHaveBeenNthCalledWith(
      3,
      paths,
      { action: 'network.requests', method: 'GET', clear: true, session: 'work' },
      5000,
    );
    expect(mocks.sendDaemonRequest).toHaveBeenNthCalledWith(4, paths, { action: 'trace.start', screenshots: false, session: 'work' }, 20_000);
    expect(mocks.sendDaemonRequest).toHaveBeenNthCalledWith(5, paths, { action: 'trace.stop', path: 'trace.zip', session: 'work' }, 20_000);
    expect(mocks.sendDaemonRequest).toHaveBeenNthCalledWith(
      6,
      paths,
      { action: 'cookies.set', name: 'sid', value: 'secret', domain: 'example.com', path: '/', session: 'work', tabName: 'main' },
      20_000,
    );
  });

  it('propagates normalized Camoucli errors from daemon requests', async () => {
    const { CamoucliError, createCamouClient } = await import('../src/index.js');
    const error = new CamoucliError({
      code: 'unsupported_command',
      message: 'PDF export is unsupported.',
      details: { alternative: 'Use screenshot.' },
      exitCode: 2,
    });
    mocks.sendDaemonRequest.mockRejectedValue(error);

    const client = createCamouClient({ paths: createTestPaths(rootDir), autoStartDaemon: false });

    await expect(client.initScripts.remove('init_1')).rejects.toMatchObject({
      code: 'unsupported_command',
      details: { alternative: 'Use screenshot.' },
      exitCode: 2,
    });
  });
});
