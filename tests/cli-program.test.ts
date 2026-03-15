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
        'camoucli',
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

    await program.parseAsync(['node', 'camoucli', 'wait', '#app', '--timeout', '2500'], { from: 'node' });

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

    await program.parseAsync(['node', 'camoucli', 'session', 'stop'], { from: 'node' });

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

    await program.parseAsync(['node', 'camoucli', 'use', '135.0.1-beta.24', '--json'], { from: 'node' });

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

    await program.parseAsync(['node', 'camoucli', 'versions', '--json'], { from: 'node' });

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

    await program.parseAsync(['node', 'camoucli', 'presets', '--json'], { from: 'node' });

    expect(onPresets).toHaveBeenCalledWith(expect.objectContaining({ json: true }));
  });
});
