import { describe, expect, it, vi } from 'vitest';

import { createProgram } from '../src/cli/program.js';

describe('CLI program parsing', () => {
  it('maps open command flags into a daemon payload', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
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
        '--browser',
        '135.0.1-beta.24',
        '--preset',
        'cache,low-bandwidth',
        '--config-json',
        '{"foo":1}',
        '--prefs-json',
        '{"bar":true}',
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
        browser: '135.0.1-beta.24',
        preset: ['cache', 'low-bandwidth'],
        configJson: '{"foo":1}',
        prefsJson: '{"bar":true}',
      }),
      expect.objectContaining({
        session: 'work',
        tabname: 'docs',
        json: true,
      }),
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

  it('parses wait text and load-state options', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
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
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction,
    });

    await program.parseAsync(['node', 'camou', 'hover', '@e1'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'type', '#name', 'hello'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'select', '#choice', 'b'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'scroll', 'down', '250'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'scrollintoview', '#submit'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'get', 'value', '#name'], { from: 'node' });
    await program.parseAsync(['node', 'camou', 'reload'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenNthCalledWith(
      1,
      'hover',
      expect.objectContaining({ action: 'hover', target: '@e1' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      2,
      'type',
      expect.objectContaining({ action: 'type', target: '#name', text: 'hello' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      3,
      'select',
      expect.objectContaining({ action: 'select', target: '#choice', value: 'b' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      4,
      'scroll',
      expect.objectContaining({ action: 'scroll', direction: 'down', amount: 250 }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      5,
      'scroll.intoView',
      expect.objectContaining({ action: 'scroll.intoView', target: '#submit' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      6,
      'get.value',
      expect.objectContaining({ action: 'get.value', target: '#name' }),
      expect.any(Object),
    );
    expect(onDaemonAction).toHaveBeenNthCalledWith(
      7,
      'reload',
      expect.objectContaining({ action: 'reload' }),
      expect.any(Object),
    );
  });

  it('defaults session stop to the default session name', async () => {
    const onDaemonAction = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets: async () => undefined,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction,
    });

    await program.parseAsync(['node', 'camou', 'session', 'stop'], { from: 'node' });

    expect(onDaemonAction).toHaveBeenCalledWith(
      'session.stop',
      { action: 'session.stop', session: 'default' },
      expect.objectContaining({ session: 'default', tabname: 'main' }),
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
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction: async () => undefined,
    });

    await program.parseAsync(['node', 'camou', 'versions', '--json'], { from: 'node' });

    expect(onVersions).toHaveBeenCalledWith(expect.objectContaining({ json: true }));
  });

  it('routes presets to the listing handler', async () => {
    const onPresets = vi.fn(async () => undefined);
    const program = createProgram({
      onInstall: async () => undefined,
      onRemove: async () => undefined,
      onUse: async () => undefined,
      onVersions: async () => undefined,
      onPresets,
      onPath: async () => undefined,
      onVersion: async () => undefined,
      onDoctor: async () => undefined,
      onDaemonAction: async () => undefined,
    });

    await program.parseAsync(['node', 'camou', 'presets', '--json'], { from: 'node' });

    expect(onPresets).toHaveBeenCalledWith(expect.objectContaining({ json: true }));
  });
});
