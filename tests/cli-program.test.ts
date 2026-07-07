import { Readable } from 'node:stream';

import { describe, expect, it, vi } from 'vitest';

import { createProgram } from '../src/cli/program.js';

describe('CLI program parsing', () => {
  it('routes navigation aliases through open with URL normalization', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction));

    await program.parseAsync(['node', 'camou', 'open', 'example.com/docs'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'goto', 'localhost:3000/app'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'navigate', 'about:blank'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'navigate', 'data:text/html,hello'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'navigate', 'file:///tmp/page.html'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'navigate', 'chrome://version'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'navigate', 'chrome-extension://abc/page.html'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenNthCalledWith(
      1,
      'open',
      expect.objectContaining({ action: 'open', url: 'https://example.com/docs' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      2,
      'open',
      expect.objectContaining({ action: 'open', url: 'https://localhost:3000/app' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      3,
      'open',
      expect.objectContaining({ action: 'open', url: 'about:blank' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      4,
      'open',
      expect.objectContaining({ action: 'open', url: 'data:text/html,hello' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      5,
      'open',
      expect.objectContaining({ action: 'open', url: 'file:///tmp/page.html' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      6,
      'open',
      expect.objectContaining({ action: 'open', url: 'chrome://version' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      7,
      'open',
      expect.objectContaining({ action: 'open', url: 'chrome-extension://abc/page.html' }),
      expect.any(Object),
    );
  });

  it('requires URLs for goto and navigate aliases', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction), { quietErrors: true });

    await expect(program.parseAsync(['node', 'camou', 'goto'], { from: 'node' })).rejects.toThrow('missing required argument');
    await expect(program.parseAsync(['node', 'camou', 'navigate'], { from: 'node' })).rejects.toThrow('missing required argument');
    expect(onDaemonAction).not.toHaveBeenCalled();
  });

  it('routes URL-less open without requiring navigation', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction));

    await program.parseAsync(['node', 'camou', 'open', '--session', 'work'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenCalledWith(
      'open',
      expect.objectContaining({ action: 'open', session: 'work', url: undefined }),
      expect.any(Object),
    );
  });

  it('rejects unsupported explicit navigation schemes before contacting the daemon', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction), { quietErrors: true });

    await expect(program.parseAsync(['node', 'camou', 'open', 'ftp://example.com'], { from: 'node' })).rejects.toThrow('Unsupported URL scheme "ftp"');
    await expect(program.parseAsync(['node', 'camou', 'navigate', 'javascript:alert(1)'], { from: 'node' })).rejects.toThrow('Unsupported URL scheme "javascript"');
    expect(onDaemonAction).not.toHaveBeenCalled();
  });

  it('routes key and scrollinto aliases to existing daemon actions', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction));

    await program.parseAsync(['node', 'camou', 'key', 'Enter'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'scrollinto', '@e1'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenNthCalledWith(
      1,
      'press',
      expect.objectContaining({ action: 'press', key: 'Enter' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      2,
      'scroll.intoView',
      expect.objectContaining({ action: 'scroll.intoView', target: '@e1' }),
      expect.any(Object),
    );
  });

  it('routes eval input modes to the page evaluation handler', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction), {
      stdin: Readable.from(['window.location.href']),
    });

    await program.parseAsync(['node', 'camou', 'eval', 'document.title'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'eval', '--base64', 'ZG9jdW1lbnQuYm9keS5pbm5lclRleHQ='], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'eval', '--stdin'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenNthCalledWith(
      1,
      'eval',
      expect.objectContaining({ action: 'eval', expression: 'document.title' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      2,
      'eval',
      expect.objectContaining({ action: 'eval', expression: 'document.body.innerText' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      3,
      'eval',
      expect.objectContaining({ action: 'eval', expression: 'window.location.href' }),
      expect.any(Object),
    );
  });

  it('rejects invalid eval input before contacting the daemon', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction), { quietErrors: true });

    await expect(program.parseAsync(['node', 'camou', 'eval', '--base64', 'not base64!'], { from: 'node' })).rejects.toThrow('Invalid base64');
    await expect(program.parseAsync(['node', 'camou', 'eval', 'document.title', '--stdin'], { from: 'node' })).rejects.toThrow('Choose exactly one eval input mode');
    await expect(program.parseAsync(['node', 'camou', 'eval'], { from: 'node' })).rejects.toThrow('eval requires an expression');
    expect(onDaemonAction).not.toHaveBeenCalled();
  });

  it('routes batch JSON-array commands to the batch handler', async () => {
    const onBatch = vi.fn(async () => undefined);
    const program = createProgram({
      ...createHandlers(async () => undefined),
      onBatch,
    });

    await program.parseAsync([
      'node',
      'camou',
      'batch',
      '--session',
      'work',
      '--headless',
      '["open"]',
      '["network","route","*","--abort","--resource-type","script"]',
      '["navigate","localhost:3000/target"]',
    ], { from: 'node' });

    expect(onBatch).toHaveBeenCalledWith(
      [
        ['open'],
        ['network', 'route', '*', '--abort', '--resource-type', 'script'],
        ['navigate', 'localhost:3000/target'],
      ],
      expect.objectContaining({ session: 'work', headless: true }),
    );
  });

  it('rejects invalid batch command specs before contacting the daemon', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const onBatch = vi.fn(async () => undefined);
    const program = createProgram({ ...createHandlers(onDaemonAction), onBatch }, { quietErrors: true });

    await expect(program.parseAsync(['node', 'camou', 'batch', '{"open":true}'], { from: 'node' })).rejects.toThrow('non-empty JSON array of strings');
    await expect(program.parseAsync(['node', 'camou', 'batch', '[]'], { from: 'node' })).rejects.toThrow('non-empty JSON array of strings');
    await expect(program.parseAsync(['node', 'camou', 'batch', '["open",3]'], { from: 'node' })).rejects.toThrow('non-empty JSON array of strings');
    await expect(program.parseAsync(['node', 'camou', 'batch', 'not-json'], { from: 'node' })).rejects.toThrow('valid JSON');
    expect(onDaemonAction).not.toHaveBeenCalled();
    expect(onBatch).not.toHaveBeenCalled();
  });

  it('routes stateful runtime commands to daemon actions', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction));

    await program.parseAsync(['node', 'camou', 'download', '#export', 'reports/out.csv', '--timeout', '1000'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'wait', '--download', '--path', 'next.bin', '--timeout', '1000'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'wait', 'positional.bin', '--download'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'set', 'viewport', '1024', '768'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'set', 'geolocation', '47.6', '-122.3', '--accuracy', '9'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'set', 'offline', 'true'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'set', 'headers', '{"x-test":"1"}'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'set', 'credentials', 'https://example.com', 'user', 'pass'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'set', 'media', '--color-scheme', 'dark', '--reduced-motion', 'reduce'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'frame', '#child'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'dialog', 'status'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'dialog', 'accept', 'typed'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'read', 'example.com', '--outline', '--filter', 'Learn', '--timeout', '2000'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenNthCalledWith(
      1,
      'download',
      expect.objectContaining({ action: 'download', target: '#export', path: 'reports/out.csv', timeoutMs: 1000 }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      2,
      'wait',
      expect.objectContaining({ action: 'wait', download: true, path: 'next.bin', timeoutMs: 1000 }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      3,
      'wait',
      expect.objectContaining({ action: 'wait', download: true, path: 'positional.bin' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      4,
      'runtime.set',
      expect.objectContaining({ runtime: { setting: 'viewport', width: 1024, height: 768 } }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      5,
      'runtime.set',
      expect.objectContaining({ runtime: { setting: 'geolocation', latitude: 47.6, longitude: -122.3, accuracy: 9 } }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      6,
      'runtime.set',
      expect.objectContaining({ runtime: { setting: 'offline', value: true } }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      7,
      'runtime.set',
      expect.objectContaining({ runtime: { setting: 'headers', headers: { 'x-test': '1' } } }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      8,
      'runtime.set',
      expect.objectContaining({ runtime: { setting: 'credentials', origin: 'https://example.com', username: 'user', password: 'pass' } }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      9,
      'runtime.set',
      expect.objectContaining({ runtime: { setting: 'media', colorScheme: 'dark', reducedMotion: 'reduce' } }),
      expect.any(Object),
    );
    expect(onDaemonAction.mock.calls[8]?.[1].colorScheme).toBeUndefined();
    expect(onDaemonAction.mock.calls[8]?.[1].reducedMotion).toBeUndefined();
    expect(onDaemonAction).toHaveBeenNthCalledWith(10, 'frame', expect.objectContaining({ action: 'frame', target: '#child' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(11, 'dialog.status', expect.objectContaining({ action: 'dialog.status' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(12, 'dialog.accept', expect.objectContaining({ action: 'dialog.accept', text: 'typed' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      13,
      'read',
      expect.objectContaining({ action: 'read', url: 'https://example.com', mode: 'outline', filter: 'Learn', timeoutMs: 2000 }),
      expect.any(Object),
    );
  });

  it('rejects unsupported stateful runtime command variants before contacting the daemon', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction), { quietErrors: true });

    await expect(program.parseAsync(['node', 'camou', 'set', 'offline', 'sometimes'], { from: 'node' })).rejects.toThrow('Expected a boolean');
    await expect(program.parseAsync(['node', 'camou', 'set', 'headers', '{"x":1}'], { from: 'node' })).rejects.toThrow('string values');
    await expect(program.parseAsync(['node', 'camou', 'set', 'media'], { from: 'node' })).rejects.toThrow('set media requires');
    await expect(program.parseAsync(['node', 'camou', 'read', '--raw', '--outline'], { from: 'node' })).rejects.toThrow('Choose only one read mode');
    expect(onDaemonAction).not.toHaveBeenCalled();
  });

  it('routes cookie storage and state commands to daemon actions', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction));

    await program.parseAsync(['node', 'camou', 'cookies'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'cookies', 'get', '--session', 'work', 'https://example.com'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'cookies', 'set', 'sid', 'secret', '--domain', 'example.com', '--path', '/', '--http-only'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'cookies', 'set', 'urlsid', 'secret', '--url', 'https://example.com'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'cookies', 'set', '--curl', '/tmp/cookies.txt'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'cookies', 'clear', '--session', 'work'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'storage', 'local', 'set', 'token', 'secret'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'storage', 'session', 'get', 'token'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'storage', 'local', 'clear'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'state', 'save', 'auth', '--session', 'work'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'state', 'load', 'auth'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'state', 'list'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'state', 'show', 'auth'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'state', 'clear', 'auth'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'state', 'clear', '--all'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'state', 'clean'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'state', 'rename', 'old', 'new'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenNthCalledWith(1, 'cookies.get', expect.objectContaining({ action: 'cookies.get' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(2, 'cookies.get', expect.objectContaining({ urls: ['https://example.com'], session: 'work' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(3, 'cookies.set', expect.objectContaining({ name: 'sid', value: 'secret', domain: 'example.com', path: '/', httpOnly: true }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(4, 'cookies.set', expect.objectContaining({ name: 'urlsid', value: 'secret', url: 'https://example.com' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(5, 'cookies.set', expect.objectContaining({ curlPath: '/tmp/cookies.txt' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(6, 'cookies.clear', expect.objectContaining({ session: 'work' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(7, 'storage.local', expect.objectContaining({ operation: 'set', key: 'token', value: 'secret' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(8, 'storage.session', expect.objectContaining({ operation: 'get', key: 'token' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(9, 'storage.local', expect.objectContaining({ operation: 'clear' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(10, 'state.save', expect.objectContaining({ path: 'auth', session: 'work' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(11, 'state.load', expect.objectContaining({ path: 'auth' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(12, 'state.list', expect.objectContaining({ action: 'state.list' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(13, 'state.show', expect.objectContaining({ path: 'auth' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(14, 'state.clear', expect.objectContaining({ path: 'auth' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(15, 'state.clear', expect.objectContaining({ all: true }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(16, 'state.clean', expect.objectContaining({ action: 'state.clean' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(17, 'state.rename', expect.objectContaining({ from: 'old', to: 'new' }), expect.any(Object));
  });

  it('routes network commands to daemon actions', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction));

    await program.parseAsync(['node', 'camou', 'network', 'route', '**/api', '--abort', '--resource-type', 'xhr,fetch', '--session', 'work'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'network', 'route', 'https://example.com/mock', '--body', '{"ok":true}', '--status', '201', '--content-type', 'application/json'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'network', 'unroute', '**/api'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'network', 'requests', '--filter', 'api', '--type', 'xhr', '--method', 'GET', '--status', '200', '--clear'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'network', 'request', 'net_1'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'network', 'har', 'start'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'network', 'har', 'stop', 'capture.har'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenNthCalledWith(1, 'network.route', expect.objectContaining({ action: 'network.route', url: '**/api', abort: true, resourceTypes: ['xhr', 'fetch'], session: 'work' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(2, 'network.route', expect.objectContaining({ body: '{"ok":true}', status: 201, contentType: 'application/json' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(3, 'network.unroute', expect.objectContaining({ url: '**/api' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(4, 'network.requests', expect.objectContaining({ filter: 'api', resourceTypes: ['xhr'], method: 'GET', status: 200, clear: true }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(5, 'network.request', expect.objectContaining({ requestId: 'net_1' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(6, 'network.har.start', expect.objectContaining({ action: 'network.har.start' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(7, 'network.har.stop', expect.objectContaining({ path: 'capture.har' }), expect.any(Object));
  });

  it('routes debug event artifact commands to daemon actions', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction));

    await program.parseAsync(['node', 'camou', 'console', '--clear', '--session', 'work'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'errors', '--clear'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'highlight', '@e1', '--duration', '750'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'clipboard', 'read'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'clipboard', 'write', 'hello'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'clipboard', 'copy'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'clipboard', 'paste'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'trace', 'start', '--no-screenshots', '--sources'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'trace', 'stop', 'debug.zip'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenNthCalledWith(1, 'console', expect.objectContaining({ action: 'console', clear: true, session: 'work' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(2, 'errors', expect.objectContaining({ action: 'errors', clear: true }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(3, 'highlight', expect.objectContaining({ action: 'highlight', target: '@e1', durationMs: 750 }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(4, 'clipboard.read', expect.objectContaining({ action: 'clipboard.read' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(5, 'clipboard.write', expect.objectContaining({ action: 'clipboard.write', text: 'hello' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(6, 'clipboard.copy', expect.objectContaining({ action: 'clipboard.copy' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(7, 'clipboard.paste', expect.objectContaining({ action: 'clipboard.paste' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(8, 'trace.start', expect.objectContaining({ action: 'trace.start', screenshots: false, sources: true }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(9, 'trace.stop', expect.objectContaining({ action: 'trace.stop', path: 'debug.zip' }), expect.any(Object));
  });

  it('routes diff vitals pushstate and init script commands to daemon actions', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction));

    await program.parseAsync(['node', 'camou', 'diff', 'snapshot', '--text', 'old', '--interactive', '--path', 'snap.json'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'diff', 'screenshot', '--baseline', '/tmp/base.png', '--selector', '#app', '--viewport', '--format', 'png'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'diff', 'url', 'example.com/a', 'example.com/b', '--mode', 'screenshot', '--full'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'vitals'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'web-vitals'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'pushstate', '/next'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'addinitscript', 'window.ready = true;'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'removeinitscript', 'init_1', '--session', 'work'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenNthCalledWith(1, 'diff.snapshot', expect.objectContaining({ action: 'diff.snapshot', baselineText: 'old', interactive: true, path: 'snap.json' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(2, 'diff.screenshot', expect.objectContaining({ action: 'diff.screenshot', baselinePath: '/tmp/base.png', target: '#app', fullPage: false, format: 'png' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(3, 'diff.url', expect.objectContaining({ action: 'diff.url', leftUrl: 'https://example.com/a', rightUrl: 'https://example.com/b', mode: 'screenshot', fullPage: true }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(4, 'vitals', expect.objectContaining({ action: 'vitals' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(5, 'vitals', expect.objectContaining({ action: 'vitals' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(6, 'pushstate', expect.objectContaining({ action: 'pushstate', url: '/next' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(7, 'addinitscript', expect.objectContaining({ action: 'addinitscript', source: 'window.ready = true;' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(8, 'removeinitscript', expect.objectContaining({ action: 'removeinitscript', session: 'work', scriptId: 'init_1' }), expect.any(Object));
  });

  it('rejects invalid diff command variants before contacting the daemon', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction), { quietErrors: true });

    await expect(program.parseAsync(['node', 'camou', 'diff', 'snapshot'], { from: 'node' })).rejects.toThrow('requires --baseline');
    await expect(program.parseAsync(['node', 'camou', 'diff', 'snapshot', '--baseline', 'old.txt', '--text', 'old'], { from: 'node' })).rejects.toThrow('either --baseline or --text');
    await expect(program.parseAsync(['node', 'camou', 'diff', 'url', 'a.test', 'b.test', '--mode', 'dom'], { from: 'node' })).rejects.toThrow('snapshot or screenshot');
    expect(onDaemonAction).not.toHaveBeenCalled();
  });

  it('throws structured unsupported command errors for excluded compatibility surfaces', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction), { quietErrors: true });

    await expect(program.parseAsync(['node', 'camou', 'connect', '--cdp', '9222'], { from: 'node' })).rejects.toMatchObject({ code: 'unsupported_command' });
    await expect(program.parseAsync(['node', 'camou', 'inspect'], { from: 'node' })).rejects.toMatchObject({ code: 'unsupported_command' });
    await expect(program.parseAsync(['node', 'camou', 'profiler'], { from: 'node' })).rejects.toMatchObject({ code: 'unsupported_command' });
    await expect(program.parseAsync(['node', 'camou', 'pdf', 'page.pdf'], { from: 'node' })).rejects.toMatchObject({ code: 'unsupported_command' });
    expect(onDaemonAction).not.toHaveBeenCalled();
  });

  it('throws structured unsupported errors for excluded migration flags on browser commands', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction), { quietErrors: true });

    await expect(program.parseAsync(['node', 'camou', 'open', 'example.com', '--cdp', '9222'], { from: 'node' })).rejects.toMatchObject({
      code: 'unsupported_command',
      details: expect.objectContaining({ flags: [expect.objectContaining({ flag: '--cdp', value: '9222' })] }),
    });
    await expect(program.parseAsync(['node', 'camou', 'screenshot', '--provider', 'browserbase'], { from: 'node' })).rejects.toMatchObject({
      code: 'unsupported_command',
      details: expect.objectContaining({ flags: [expect.objectContaining({ flag: '--provider', value: 'browserbase' })] }),
    });
    expect(onDaemonAction).not.toHaveBeenCalled();
  });

  it('rejects no-op network routes before contacting the daemon', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction), { quietErrors: true });

    await expect(program.parseAsync(['node', 'camou', 'network', 'route', '**/api'], { from: 'node' })).rejects.toThrow('requires --abort or --body');
    await expect(program.parseAsync(['node', 'camou', 'network', 'route', '**/api', '--abort', '--body', 'ok'], { from: 'node' })).rejects.toThrow('either --abort or --body');
    expect(onDaemonAction).not.toHaveBeenCalled();
  });

  it('lists core alias and eval input modes in help', () => {
    const program = createProgram(createHandlers(async () => undefined));
    const help = program.helpInformation();

    expect(help).toContain('skills');
    expect(help).toContain('open [options] [url]');
    expect(help).toContain('goto [options] <url>');
    expect(help).toContain('navigate [options] <url>');
    expect(help).toContain('key [options] <key>');
    expect(help).toContain('scrollinto [options] <target>');
    expect(help).toContain('window');
    expect(help).toContain('download [options] <target> <path>');
    expect(help).toContain('frame [options] <target>');
    expect(help).toContain('dialog');
    expect(help).toContain('read [options] [url]');
    expect(help).toContain('diff');
    expect(help).toContain('vitals');
    expect(help).toContain('web-vitals');
    expect(help).toContain('pushstate [options] <url>');
    expect(help).toContain('addinitscript [options] <js>');
    expect(help).toContain('removeinitscript [options] <id>');
    expect(help).toContain('connect');
    expect(help).toContain('inspect');
    expect(help).toContain('profiler');
    expect(help).toContain('pdf');
    expect(help).toContain('structured migration error');
    const openHelp = program.commands.find((command) => command.name() === 'open')?.helpInformation();
    expect(openHelp).toContain('--headed');
    expect(openHelp).toContain('--proxy-bypass <hosts>');
    expect(openHelp).toContain('--headers <json>');
    expect(openHelp).toContain('--init-script <path>');
    expect(openHelp).toContain('--state <path-or-name>');

    const evalHelp = program.commands.find((command) => command.name() === 'eval')?.helpInformation();
    expect(evalHelp).toContain('--base64 <script>');
    expect(evalHelp).toContain('--stdin');
    const closeHelp = program.commands.find((command) => command.name() === 'close')?.helpInformation();
    expect(closeHelp).toContain('--all');
    expect(closeHelp).toContain('--session <name>');
    const sessionHelp = program.commands.find((command) => command.name() === 'session')?.helpInformation();
    expect(sessionHelp).toContain('id [options]');
    expect(sessionHelp).toContain('info [options]');
    const tabNewHelp = program.commands.find((command) => command.name() === 'tab')?.commands.find((command) => command.name() === 'new')?.helpInformation();
    expect(tabNewHelp).toContain('--label <name>');
    const windowNewHelp = program.commands.find((command) => command.name() === 'window')?.commands.find((command) => command.name() === 'new')?.helpInformation();
    expect(windowNewHelp).toContain('not guaranteed to be a separate OS window');
    const setHelp = program.commands.find((command) => command.name() === 'set')?.helpInformation();
    expect(setHelp).toContain('viewport');
    expect(setHelp).toContain('media');
    expect(program.commands.find((command) => command.name() === 'cookies')?.helpInformation()).toContain('set');
    expect(program.commands.find((command) => command.name() === 'storage')?.helpInformation()).toContain('local');
    expect(program.commands.find((command) => command.name() === 'state')?.helpInformation()).toContain('save');
    expect(program.commands.find((command) => command.name() === 'network')?.helpInformation()).toContain('requests');
    expect(program.commands.find((command) => command.name() === 'network')?.commands.find((command) => command.name() === 'har')?.helpInformation()).toContain('stop');
    expect(help).toContain('console');
    expect(help).toContain('errors');
    expect(help).toContain('highlight');
    expect(help).toContain('clipboard');
    expect(help).toContain('trace');
    expect(program.commands.find((command) => command.name() === 'trace')?.helpInformation()).toContain('Playwright trace zip');
  });

  it('routes skills commands through the local skills handler without daemon actions', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const onSkills = vi.fn(async () => undefined);
    const program = createProgram({
      ...createHandlers(onDaemonAction),
      onSkills,
    });

    await program.parseAsync(['node', 'camou', 'skills'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'skills', 'list', '--json'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'skills', 'get', 'core', '--full', '--json'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'skills', 'get', '--all'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'skills', 'path', 'core'], { from: 'node' });

    expect(onSkills).toHaveBeenNthCalledWith(1, [], expect.objectContaining({ json: undefined, full: undefined, all: undefined }));
    expect(onSkills).toHaveBeenNthCalledWith(2, ['list'], expect.objectContaining({ json: true }));
    expect(onSkills).toHaveBeenNthCalledWith(3, ['get', 'core'], expect.objectContaining({ json: true, full: true }));
    expect(onSkills).toHaveBeenNthCalledWith(4, ['get'], expect.objectContaining({ all: true }));
    expect(onSkills).toHaveBeenNthCalledWith(5, ['path', 'core'], expect.any(Object));
    expect(onDaemonAction).not.toHaveBeenCalled();
  });

  it('maps open command flags into a daemon payload', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction,
    });

    await program.parseAsync(
      [
        'node',
        'camou',
        'open',
        'https://example.com',
        '--session',
        'work',
        '--tabname',
        'docs',
        '--headless',
        '--proxy',
        'http://127.0.0.1:8080',
        '--proxy-bypass',
        'localhost',
        '--headers',
        '{"x-test":"1"}',
        '--user-agent',
        'CamouTest/1.0',
        '--ignore-https-errors',
        '--color-scheme',
        'dark',
        '--reduced-motion',
        'reduce',
        '--init-script',
        '/tmp/init-a.js',
        '--init-script',
        '/tmp/init-b.js',
        '--state',
        'auth',
        '--browser',
        '135.0.1-beta.24',
        '--preset',
        'cache,low-bandwidth',
        '--config-json',
        '{"foo":1}',
        '--prefs-json',
        '{"bar":true}',
        '--locales',
        'en-US,fr-FR',
        '--screen-profile',
        'desktop-fhd',
        '--window-profile',
        'desktop',
        '--block-images',
        '--block-webrtc',
        '--block-webgl',
        '--disable-coop',
        '--json',
      ],
      { from: 'node' },
    );

    expect(onDaemonAction).toHaveBeenCalledTimes(1);
    expect(onDaemonAction).toHaveBeenCalledWith(
      'open',
      expect.objectContaining({
        action: 'open',
        url: 'https://example.com',
        session: 'work',
        tabName: 'docs',
        headless: true,
        proxy: 'http://127.0.0.1:8080',
        proxyBypass: 'localhost',
        headers: '{"x-test":"1"}',
        userAgent: 'CamouTest/1.0',
        ignoreHTTPSErrors: true,
        colorScheme: 'dark',
        reducedMotion: 'reduce',
        initScripts: ['/tmp/init-a.js', '/tmp/init-b.js'],
        state: 'auth',
        browser: '135.0.1-beta.24',
        preset: ['cache', 'low-bandwidth'],
        configJson: '{"foo":1}',
        prefsJson: '{"bar":true}',
        locales: ['en-US', 'fr-FR'],
        screenProfile: 'desktop-fhd',
        windowProfile: 'desktop',
        blockImages: true,
        blockWebRtc: true,
        blockWebGl: true,
        disableCoop: true,
      }),
      expect.objectContaining({
        session: 'work',
        tabname: 'docs',
        json: true,
      }),
    );
  });

  it('maps headed alias to headless false', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction));

    await program.parseAsync(['node', 'camou', 'open', 'https://example.com', '--headed'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenCalledWith(
      'open',
      expect.objectContaining({ action: 'open', headless: false }),
      expect.any(Object),
    );
  });

  it('parses wait timeout as a number', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction,
    });

    await program.parseAsync(['node', 'camou', 'wait', '#app', '--timeout', '2500'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenCalledWith(
      'wait',
      expect.objectContaining({
        action: 'wait',
        target: '#app',
        timeoutMs: 2500,
      }),
      expect.any(Object),
    );
  });

  it('passes fingerprint helper JSON through shared launch options', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction,
    });

    await program.parseAsync(
      ['node', 'camou', 'open', 'https://example.com', '--fingerprint-json', '{"screenProfile":"laptop-hd"}'],
      { from: 'node' },
    );

    expect(onDaemonAction).toHaveBeenCalledWith(
      'open',
      expect.objectContaining({
        action: 'open',
        fingerprintJson: '{"screenProfile":"laptop-hd"}',
      }),
      expect.any(Object),
    );
  });

  it('parses wait text and load-state options', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction,
    });

    await program.parseAsync(['node', 'camou', 'wait', '--text', 'Done', '--load', 'networkidle'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenCalledWith(
      'wait',
      expect.objectContaining({
        action: 'wait',
        text: 'Done',
        loadState: 'networkidle',
      }),
      expect.any(Object),
    );
  });

  it('routes broadened automation commands to daemon actions', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction,
    });

    await program.parseAsync(['node', 'camou', 'hover', '@e1'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'dblclick', '@e1'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'focus', '#name'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'type', '#name', 'hello'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'type', '#name', 'reset', '--clear', '--delay', '25'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'select', '#choice', 'b', 'c'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'scroll', 'down', '250', '--selector', '#pane'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'scrollintoview', '#submit'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'upload', '#file', 'a.txt', 'b.txt'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'drag', '#source', '#target'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'get', 'value', '#name'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'get', 'html', '#panel'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'get', 'attr', '#next', 'href'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'get', 'count', 'button'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'get', 'box', '#submit'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'get', 'styles', '#submit'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'is', 'visible', '#submit'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'reload'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenNthCalledWith(
      1,
      'hover',
      expect.objectContaining({ action: 'hover', target: '@e1' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      2,
      'dblclick',
      expect.objectContaining({ action: 'dblclick', target: '@e1' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      3,
      'focus',
      expect.objectContaining({ action: 'focus', target: '#name' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      4,
      'type',
      expect.objectContaining({ action: 'type', target: '#name', text: 'hello' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      5,
      'type',
      expect.objectContaining({ action: 'type', target: '#name', text: 'reset', clear: true, delayMs: 25 }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      6,
      'select',
      expect.objectContaining({ action: 'select', target: '#choice', value: ['b', 'c'] }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      7,
      'scroll',
      expect.objectContaining({ action: 'scroll', direction: 'down', amount: 250, target: '#pane' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      8,
      'scroll.intoView',
      expect.objectContaining({ action: 'scroll.intoView', target: '#submit' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      9,
      'upload',
      expect.objectContaining({ action: 'upload', target: '#file', files: ['a.txt', 'b.txt'] }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      10,
      'drag',
      expect.objectContaining({ action: 'drag', source: '#source', target: '#target' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      11,
      'get.value',
      expect.objectContaining({ action: 'get.value', target: '#name' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      12,
      'get.html',
      expect.objectContaining({ action: 'get.html', target: '#panel' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      13,
      'get.attr',
      expect.objectContaining({ action: 'get.attr', target: '#next', attribute: 'href' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      14,
      'get.count',
      expect.objectContaining({ action: 'get.count', target: 'button' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      15,
      'get.box',
      expect.objectContaining({ action: 'get.box', target: '#submit' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      16,
      'get.styles',
      expect.objectContaining({ action: 'get.styles', target: '#submit' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      17,
      'is.visible',
      expect.objectContaining({ action: 'is.visible', target: '#submit' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      18,
      'reload',
      expect.objectContaining({ action: 'reload' }),
      expect.any(Object),
    );
  });

  it('routes direct keyboard mouse wait screenshot and find commands', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction));

    await program.parseAsync(['node', 'camou', 'keydown', 'Shift'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'keyup', 'Shift'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'keyboard', 'type', 'hello', '--delay', '10'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'keyboard', 'inserttext', 'raw'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'mouse', 'move', '10', '20'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'mouse', 'down', 'right'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'mouse', 'up'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'mouse', 'wheel', '400', '5'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'wait', '250'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'wait', '--url', '**/done', '--fn', 'document.title === "Done"', '--timeout', '1000'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'screenshot', '#panel', 'panel.jpg', '--format', 'jpeg', '--quality', '80'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'find', 'role', 'button', '--name', 'Submit', '--action', 'text', '--exact'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'find', 'text', 'Name', '--action', 'fill', '--value', 'Ada'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'find', 'nth', 'button', '1', '--action', 'hover'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenNthCalledWith(1, 'keyboard.down', expect.objectContaining({ action: 'keyboard.down', key: 'Shift' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(2, 'keyboard.up', expect.objectContaining({ action: 'keyboard.up', key: 'Shift' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(3, 'keyboard.type', expect.objectContaining({ action: 'keyboard.type', text: 'hello', delayMs: 10 }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(4, 'keyboard.insertText', expect.objectContaining({ action: 'keyboard.insertText', text: 'raw' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(5, 'mouse.move', expect.objectContaining({ action: 'mouse.move', x: 10, y: 20 }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(6, 'mouse.down', expect.objectContaining({ action: 'mouse.down', button: 'right' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(7, 'mouse.up', expect.objectContaining({ action: 'mouse.up' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(8, 'mouse.wheel', expect.objectContaining({ action: 'mouse.wheel', deltaY: 400, deltaX: 5 }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(9, 'wait', expect.objectContaining({ action: 'wait', ms: 250 }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(10, 'wait', expect.objectContaining({ action: 'wait', url: '**/done', fn: 'document.title === "Done"', timeoutMs: 1000 }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(11, 'screenshot', expect.objectContaining({ action: 'screenshot', target: '#panel', path: 'panel.jpg', format: 'jpeg', quality: 80 }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(12, 'find', expect.objectContaining({ action: 'find', locatorType: 'role', value: 'button', name: 'Submit', subaction: 'text', exact: true }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(13, 'find', expect.objectContaining({ action: 'find', locatorType: 'text', value: 'Name', subaction: 'fill', text: 'Ada' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(14, 'find', expect.objectContaining({ action: 'find', locatorType: 'nth', target: 'button', index: 1, subaction: 'hover' }), expect.any(Object));
  });

  it('routes session list to the running session handler', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction,
    });

    await program.parseAsync(['node', 'camou', 'session', 'list', '--json'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenCalledWith(
      'session.list',
      { action: 'session.list' },
      expect.objectContaining({ json: true, verbose: undefined }),
    );
  });

  it('routes profile list to the stored profile handler', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction,
    });

    await program.parseAsync(['node', 'camou', 'profile', 'list', '--json'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenCalledWith(
      'profile.list',
      { action: 'profile.list' },
      expect.objectContaining({ json: true, verbose: undefined }),
    );
  });

  it('routes profile inspect to the stored profile inspection handler', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction,
    });

    await program.parseAsync(['node', 'camou', 'profile', 'inspect', 'work', '--json'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenCalledWith(
      'profile.inspect',
      { action: 'profile.inspect', profile: 'work' },
      expect.objectContaining({ json: true, verbose: undefined }),
    );
  });

  it('routes profile remove to the stored profile removal handler', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction,
    });

    await program.parseAsync(['node', 'camou', 'profile', 'remove', 'work', '--json'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenCalledWith(
      'profile.remove',
      { action: 'profile.remove', profile: 'work' },
      expect.objectContaining({ json: true, verbose: undefined }),
    );
  });

  it('routes eval to the page evaluation handler', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction,
    });

    await program.parseAsync(['node', 'camou', 'eval', 'document.title', '--json'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenCalledWith(
      'eval',
      { action: 'eval', expression: 'document.title', session: undefined, tabName: undefined },
      expect.objectContaining({ json: true, verbose: undefined }),
    );
  });

  it('routes cookies export to the cookie export handler', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction,
    });

    await program.parseAsync(['node', 'camou', 'cookies', 'export', 'cookies.json', '--json'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenCalledWith(
      'cookies.export',
      expect.objectContaining({ action: 'cookies.export', path: 'cookies.json' }),
      expect.objectContaining({ json: true, verbose: undefined }),
    );
  });

  it('routes cookies import to the cookie import handler', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction,
    });

    await program.parseAsync(['node', 'camou', 'cookies', 'import', 'cookies.json', '--json'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenCalledWith(
      'cookies.import',
      expect.objectContaining({ action: 'cookies.import', path: 'cookies.json' }),
      expect.objectContaining({ json: true, verbose: undefined }),
    );
  });

  it('routes daemon stop to the daemon stop handler', async () => {
    const onDaemonStop = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction: async () => undefined,
      onDaemonStop,
      onDaemonRestart: async () => undefined,
      onDaemonCleanup: async () => undefined,
    });

    await program.parseAsync(['node', 'camou', 'daemon', 'stop', '--json'], { from: 'node' });

    expect(onDaemonStop).toHaveBeenCalledWith(expect.objectContaining({ json: true, verbose: undefined }));
  });

  it('routes daemon cleanup to the daemon cleanup handler', async () => {
    const onDaemonCleanup = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction: async () => undefined,
      onDaemonStop: async () => undefined,
      onDaemonRestart: async () => undefined,
      onDaemonCleanup,
    });

    await program.parseAsync(['node', 'camou', 'daemon', 'cleanup', '--json'], { from: 'node' });

    expect(onDaemonCleanup).toHaveBeenCalledWith(expect.objectContaining({ json: true, verbose: undefined }));
  });

  it('routes daemon restart to the daemon restart handler', async () => {
    const onDaemonRestart = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction: async () => undefined,
      onDaemonStop: async () => undefined,
      onDaemonRestart,
      onDaemonCleanup: async () => undefined,
    });

    await program.parseAsync(['node', 'camou', 'daemon', 'restart', '--json'], { from: 'node' });

    expect(onDaemonRestart).toHaveBeenCalledWith(expect.objectContaining({ json: true, verbose: undefined }));
  });

  it('routes close --all to the stop-all handler', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction,
    });

    await program.parseAsync(['node', 'camou', 'close', '--all', '--json'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenCalledWith(
      'session.stopAll',
      { action: 'session.stopAll' },
      expect.objectContaining({ json: true, verbose: undefined }),
    );
  });

  it('routes close quit and exit to the current session stop handler', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction));

    await program.parseAsync(['node', 'camou', 'close', '--session', 'work'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'quit'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'exit'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenNthCalledWith(
      1,
      'session.stop',
      expect.objectContaining({ action: 'session.stop', session: 'work' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      2,
      'session.stop',
      expect.objectContaining({ action: 'session.stop' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      3,
      'session.stop',
      expect.objectContaining({ action: 'session.stop' }),
      expect.any(Object),
    );
  });

  it('routes session helpers through local handlers', async () => {
    const onSessionCurrent = vi.fn(async () => undefined);
    const onSessionId = vi.fn(async () => undefined);
    const onSessionInfo = vi.fn(async () => undefined);
    const program = createProgram({
      ...createHandlers(async () => undefined),
      onSessionCurrent,
      onSessionId,
      onSessionInfo,
    });

    await program.parseAsync(['node', 'camou', 'session', '--json'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'session', 'id', '--scope', 'cwd', '--prefix', 'work'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'session', 'info', '--session', 'work'], { from: 'node' });

    expect(onSessionCurrent).toHaveBeenCalledWith(expect.objectContaining({ json: true }));
    expect(onSessionId).toHaveBeenCalledWith(expect.objectContaining({ scope: 'cwd', prefix: 'work' }));
    expect(onSessionInfo).toHaveBeenCalledWith(expect.objectContaining({ session: 'work' }));
  });

  it('leaves session stop unresolved so env/config defaults can apply later', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction,
    });

    await program.parseAsync(['node', 'camou', 'session', 'stop'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenCalledWith(
      'session.stop',
      { action: 'session.stop' },
      expect.objectContaining({ json: undefined, verbose: undefined }),
    );
  });

  it('routes tab lifecycle commands including labels and active switching', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction));

    await program.parseAsync(['node', 'camou', 'tab'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'tab', 'new', '--label', 'docs', 'example.com', '--session', 'work', '--headless'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'tab', 'docs'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'tab', 'close', '--session', 'work'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenNthCalledWith(1, 'tab.list', expect.objectContaining({ action: 'tab.list' }), expect.any(Object));
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      2,
      'tab.new',
      expect.objectContaining({ action: 'tab.new', session: 'work', tabName: 'docs', url: 'https://example.com', headless: true }),
      expect.objectContaining({ session: 'work', headless: true }),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      3,
      'tab.activate',
      expect.objectContaining({ action: 'tab.activate', target: 'docs' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(4, 'tab.close', expect.objectContaining({ action: 'tab.close', session: 'work' }), expect.objectContaining({ session: 'work' }));
  });

  it('routes click new-tab and window new commands', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram(createHandlers(onDaemonAction));

    await program.parseAsync(['node', 'camou', 'click', '#launch', '--new-tab', '--label', 'launched', '--timeout', '250'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'window', 'new', 'example.com', '--label', 'win', '--session', 'work', '--headless'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenNthCalledWith(
      1,
      'click',
      expect.objectContaining({ action: 'click', target: '#launch', newTab: true, label: 'launched', timeoutMs: 250 }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      2,
      'window.new',
      expect.objectContaining({ action: 'window.new', session: 'work', url: 'https://example.com', label: 'win', headless: true }),
      expect.objectContaining({ session: 'work', headless: true }),
    );
  });

  it('routes use to the version selection handler', async () => {
    const onUse = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction: async () => undefined,
    });

    await program.parseAsync(['node', 'camou', 'use', '135.0.1-beta.24', '--json'], { from: 'node' });

    expect(onUse).toHaveBeenCalledWith('135.0.1-beta.24', expect.objectContaining({ json: true }));
  });

  it('routes versions to the listing handler', async () => {
    const onVersions = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction: async () => undefined,
    });

    await program.parseAsync(['node', 'camou', 'versions', '--json'], { from: 'node' });

    expect(onVersions).toHaveBeenCalledWith(expect.objectContaining({ json: true }));
  });

  it('routes remote-versions to the remote listing handler', async () => {
    const onRemoteVersions = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onRemoteVersions,
      onPresets: async () => undefined,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction: async () => undefined,
    });

    await program.parseAsync(['node', 'camou', 'remote-versions', '--json'], { from: 'node' });

    expect(onRemoteVersions).toHaveBeenCalledWith(expect.objectContaining({ json: true }));
  });

  it('routes presets to the listing handler', async () => {
    const onPresets = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets,
      onFingerprintProfiles: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction: async () => undefined,
    });

    await program.parseAsync(['node', 'camou', 'presets', '--json'], { from: 'node' });

    expect(onPresets).toHaveBeenCalledWith(expect.objectContaining({ json: true }));
  });

  it('routes fingerprint profiles to the listing handler', async () => {
    const onFingerprintProfiles = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onFingerprintProfiles,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction: async () => undefined,
    });

    await program.parseAsync(['node', 'camou', 'fingerprint-profiles', '--json'], { from: 'node' });

    expect(onFingerprintProfiles).toHaveBeenCalledWith(expect.objectContaining({ json: true }));
  });
});

function createHandlers(onDaemonAction: (action: string, payload: Record<string, unknown>, options: Record<string, unknown>) => Promise<void>) {
  return {
    onInstall: async () => undefined,
    onRemove: async () => undefined,
    onUse: async () => undefined,
    onVersions: async () => undefined,
    onPresets: async () => undefined,
    onFingerprintProfiles: async () => undefined,
    onPath: async () => undefined,
    onVersion: async () => undefined,
    onDoctor: async () => undefined,
    onDaemonAction,
    onSkills: async () => undefined,
  };
}
