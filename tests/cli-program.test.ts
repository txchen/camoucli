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
