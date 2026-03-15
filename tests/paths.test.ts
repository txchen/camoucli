import { describe, expect, it } from 'vitest';

import { getCamoucliPaths, sanitizeName } from '../src/state/paths.js';

describe('path resolution', () => {
  it('resolves Linux XDG paths', () => {
    const paths = getCamoucliPaths(
      {
        XDG_DATA_HOME: '/tmp/data-home',
        XDG_STATE_HOME: '/tmp/state-home',
        XDG_CACHE_HOME: '/tmp/cache-home',
        XDG_RUNTIME_DIR: '/tmp/runtime-home',
      },
      'linux',
    );

    expect(paths.dataDir).toBe('/tmp/data-home/camoucli');
    expect(paths.stateDir).toBe('/tmp/state-home/camoucli');
    expect(paths.cacheDir).toBe('/tmp/cache-home/camoucli');
    expect(paths.camoufoxCacheDir).toBe('/tmp/cache-home/camoufox');
    expect(paths.browsersDir).toBe('/tmp/cache-home/camoufox/browsers');
    expect(paths.runtimeDir).toBe('/tmp/runtime-home/camoucli');
    expect(paths.daemonSocketPath).toBe('/tmp/runtime-home/camoucli/daemon.sock');
  });

  it('resolves Windows runtime metadata', () => {
    const paths = getCamoucliPaths(
      {
        APPDATA: 'C:/Users/test/AppData/Roaming',
        LOCALAPPDATA: 'C:/Users/test/AppData/Local',
      },
      'win32',
    );

    expect(paths.daemonSocketPath).toBeUndefined();
    expect(paths.daemonHost).toBe('127.0.0.1');
    expect(paths.daemonPort).toBe(43133);
    expect(paths.camoufoxCacheDir).toBe('C:/Users/test/AppData/Local/camoufox/Cache');
    expect(paths.browsersDir).toBe('C:/Users/test/AppData/Local/camoufox/Cache/browsers');
  });

  it('sanitizes session names for filesystem use', () => {
    expect(sanitizeName('work/github bot')).toBe('work-github-bot');
    expect(sanitizeName('@@@')).toBe('default');
  });
});
