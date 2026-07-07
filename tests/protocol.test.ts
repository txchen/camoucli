import { describe, expect, it } from 'vitest';

import { daemonRequestSchema } from '../src/ipc/protocol.js';

const base = {
  id: 'request-1',
  session: 'default',
  tabName: 'main',
};

describe('daemon IPC protocol', () => {
  it('accepts direct Playwright automation requests', () => {
    expect(daemonRequestSchema.parse({ ...base, action: 'dblclick', target: '#submit' })).toMatchObject({
      action: 'dblclick',
      target: '#submit',
    });
    expect(daemonRequestSchema.parse({ ...base, action: 'type', target: '#name', text: 'Ada', clear: true, delayMs: 20 })).toMatchObject({
      action: 'type',
      clear: true,
      delayMs: 20,
    });
    expect(daemonRequestSchema.parse({ ...base, action: 'select', target: '#choice', value: ['a', 'b'] })).toMatchObject({
      action: 'select',
      value: ['a', 'b'],
    });
    expect(daemonRequestSchema.parse({ ...base, action: 'mouse.wheel', deltaX: 5, deltaY: 300 })).toMatchObject({
      action: 'mouse.wheel',
      deltaX: 5,
      deltaY: 300,
    });
    expect(daemonRequestSchema.parse({ ...base, action: 'wait', ms: 250, url: '**/done', fn: 'document.title === "Done"' })).toMatchObject({
      action: 'wait',
      ms: 250,
      url: '**/done',
    });
    expect(daemonRequestSchema.parse({ ...base, action: 'screenshot', target: '#panel', format: 'jpeg', quality: 80 })).toMatchObject({
      action: 'screenshot',
      target: '#panel',
      format: 'jpeg',
      quality: 80,
    });
    expect(daemonRequestSchema.parse({ ...base, action: 'find', locatorType: 'role', value: 'button', subaction: 'text' })).toMatchObject({
      action: 'find',
      locatorType: 'role',
      subaction: 'text',
    });
    expect(daemonRequestSchema.parse({ ...base, action: 'download', target: '#export', path: 'reports/out.csv' })).toMatchObject({
      action: 'download',
      target: '#export',
      path: 'reports/out.csv',
    });
    expect(daemonRequestSchema.parse({ ...base, action: 'wait', download: true, path: 'next.bin' })).toMatchObject({
      action: 'wait',
      download: true,
      path: 'next.bin',
    });
    expect(daemonRequestSchema.parse({ ...base, action: 'runtime.set', runtime: { setting: 'viewport', width: 1024, height: 768 } })).toMatchObject({
      action: 'runtime.set',
      runtime: { setting: 'viewport' },
    });
    expect(daemonRequestSchema.parse({ ...base, action: 'frame', target: '@e1' })).toMatchObject({
      action: 'frame',
      target: '@e1',
    });
    expect(daemonRequestSchema.parse({ ...base, action: 'dialog.accept', text: 'ok' })).toMatchObject({
      action: 'dialog.accept',
      text: 'ok',
    });
    expect(daemonRequestSchema.parse({ ...base, action: 'read', mode: 'outline', filter: 'submit' })).toMatchObject({
      action: 'read',
      mode: 'outline',
      filter: 'submit',
    });
  });

  it('accepts lifecycle requests with daemon-resolved active tabs', () => {
    expect(daemonRequestSchema.parse({ id: 'request-2', action: 'open', session: 'default' })).toMatchObject({
      action: 'open',
      session: 'default',
    });
    expect(daemonRequestSchema.parse({ id: 'request-3', action: 'click', session: 'default', target: '#launch', newTab: true })).toMatchObject({
      action: 'click',
      session: 'default',
      target: '#launch',
      newTab: true,
    });
    expect(daemonRequestSchema.parse({ id: 'request-4', action: 'tab.activate', session: 'default', target: 'docs' })).toMatchObject({
      action: 'tab.activate',
      target: 'docs',
    });
    expect(daemonRequestSchema.parse({ id: 'request-5', action: 'window.new', session: 'default', label: 'popup' })).toMatchObject({
      action: 'window.new',
      label: 'popup',
    });
    expect(daemonRequestSchema.parse({ id: 'request-6', action: 'session.info', session: 'default' })).toMatchObject({
      action: 'session.info',
      session: 'default',
    });
  });

  it('accepts cookie storage and state snapshot requests', () => {
    expect(daemonRequestSchema.parse({ id: 'request-7', action: 'cookies.get', session: 'default', urls: ['https://example.com'] })).toMatchObject({
      action: 'cookies.get',
      urls: ['https://example.com'],
    });
    expect(daemonRequestSchema.parse({ ...base, action: 'cookies.set', name: 'sid', value: 'secret', domain: 'example.com', path: '/' })).toMatchObject({
      action: 'cookies.set',
      name: 'sid',
    });
    expect(daemonRequestSchema.parse({ id: 'request-8', action: 'cookies.clear', session: 'default' })).toMatchObject({
      action: 'cookies.clear',
    });
    expect(daemonRequestSchema.parse({ ...base, action: 'storage.local', operation: 'set', key: 'token', value: 'secret' })).toMatchObject({
      action: 'storage.local',
      operation: 'set',
    });
    expect(daemonRequestSchema.parse({ id: 'request-9', action: 'state.save', session: 'default', path: 'auth' })).toMatchObject({
      action: 'state.save',
      path: 'auth',
    });
    expect(daemonRequestSchema.parse({ id: 'request-10', action: 'state.clear', all: true })).toMatchObject({
      action: 'state.clear',
      all: true,
    });
  });

  it('accepts network route request log and HAR requests', () => {
    expect(daemonRequestSchema.parse({ ...base, action: 'network.route', url: '**/api', abort: true, resourceTypes: ['xhr'] })).toMatchObject({
      action: 'network.route',
      url: '**/api',
      abort: true,
      resourceTypes: ['xhr'],
    });
    expect(daemonRequestSchema.parse({ id: 'request-11', action: 'network.requests', session: 'default', clear: true, method: 'GET', status: 200 })).toMatchObject({
      action: 'network.requests',
      clear: true,
      status: 200,
    });
    expect(daemonRequestSchema.parse({ id: 'request-12', action: 'network.request', session: 'default', requestId: 'net_1' })).toMatchObject({
      action: 'network.request',
      requestId: 'net_1',
    });
    expect(daemonRequestSchema.parse({ id: 'request-13', action: 'network.har.start', session: 'default' })).toMatchObject({
      action: 'network.har.start',
    });
    expect(daemonRequestSchema.parse({ id: 'request-14', action: 'network.har.stop', session: 'default', path: 'capture.har' })).toMatchObject({
      action: 'network.har.stop',
      path: 'capture.har',
    });
  });

  it('rejects invalid direct automation request shapes', () => {
    expect(() => daemonRequestSchema.parse({ ...base, action: 'upload', target: '#file', files: [] })).toThrow();
    expect(() => daemonRequestSchema.parse({ ...base, action: 'mouse.down', button: 'primary' })).toThrow();
    expect(() => daemonRequestSchema.parse({ ...base, action: 'screenshot', format: 'gif' })).toThrow();
    expect(() => daemonRequestSchema.parse({ ...base, action: 'find', locatorType: 'css', value: '#submit' })).toThrow();
    expect(() => daemonRequestSchema.parse({ ...base, action: 'runtime.set', runtime: { setting: 'viewport', width: 0, height: 768 } })).toThrow();
    expect(() => daemonRequestSchema.parse({ ...base, action: 'read', mode: 'markdown' })).toThrow();
  });

  it('rejects unsupported migration launch surfaces instead of stripping them', () => {
    expect(() => daemonRequestSchema.parse({ ...base, action: 'open', executablePath: '/tmp/browser' })).toThrow();
    expect(() => daemonRequestSchema.parse({ ...base, action: 'open', provider: 'browserbase' })).toThrow();
    expect(() => daemonRequestSchema.parse({ ...base, action: 'open', restorePolicy: 'last' })).toThrow();
  });
});
