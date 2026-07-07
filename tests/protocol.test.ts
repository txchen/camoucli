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

  it('rejects invalid direct automation request shapes', () => {
    expect(() => daemonRequestSchema.parse({ ...base, action: 'upload', target: '#file', files: [] })).toThrow();
    expect(() => daemonRequestSchema.parse({ ...base, action: 'mouse.down', button: 'primary' })).toThrow();
    expect(() => daemonRequestSchema.parse({ ...base, action: 'screenshot', format: 'gif' })).toThrow();
    expect(() => daemonRequestSchema.parse({ ...base, action: 'find', locatorType: 'css', value: '#submit' })).toThrow();
  });
});
