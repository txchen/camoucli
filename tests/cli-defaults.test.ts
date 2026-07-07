import os from 'node:os';
import path from 'node:path';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyCliDefaultsToPayload, findCamouConfigFile, resolveSharedOptions } from '../src/cli/defaults.js';

describe('CLI defaults resolution', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'camou-defaults-'));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('loads session and tab defaults from the nearest project config file', async () => {
    const projectRoot = path.join(rootDir, 'project');
    const nestedDir = path.join(projectRoot, 'src', 'feature');
    await mkdir(nestedDir, { recursive: true });
    await writeFile(
      path.join(projectRoot, '.camou.json'),
      `${JSON.stringify({
        session: 'workspace',
        tabname: 'assistant',
        browser: '135.0.1-beta.24',
        headless: true,
        proxy: 'http://127.0.0.1:8080',
        proxyBypass: 'localhost',
        headers: { 'x-config': 'yes' },
        userAgent: 'ConfigUA/1.0',
        ignoreHttpsErrors: true,
        colorScheme: 'dark',
        reducedMotion: 'reduce',
        initScript: ['config-init.js'],
        state: 'config-state',
        preset: ['cache', 'low-bandwidth'],
        locales: ['en-US', 'fr-FR'],
        region: 'US',
        screenProfile: 'desktop-fhd',
        windowProfile: 'desktop',
        blockImages: true,
      }, null, 2)}\n`,
      'utf8',
    );

    const resolved = await resolveSharedOptions({}, { cwd: nestedDir, env: {} });

    expect(resolved.session).toBe('workspace');
    expect(resolved.tabname).toBe('assistant');
    expect(resolved.browser).toBe('135.0.1-beta.24');
    expect(resolved.headless).toBe(true);
    expect(resolved.proxy).toBe('http://127.0.0.1:8080');
    expect(resolved.proxyBypass).toBe('localhost');
    expect(resolved.headers).toBe('{"x-config":"yes"}');
    expect(resolved.userAgent).toBe('ConfigUA/1.0');
    expect(resolved.ignoreHttpsErrors).toBe(true);
    expect(resolved.colorScheme).toBe('dark');
    expect(resolved.reducedMotion).toBe('reduce');
    expect(resolved.initScript).toEqual(['config-init.js']);
    expect(resolved.state).toBe('config-state');
    expect(resolved.preset).toEqual(['cache', 'low-bandwidth']);
    expect(resolved.locales).toEqual(['en-US', 'fr-FR']);
    expect(resolved.region).toBe('US');
    expect(resolved.screenProfile).toBe('desktop-fhd');
    expect(resolved.windowProfile).toBe('desktop');
    expect(resolved.blockImages).toBe(true);
    expect(resolved.defaultsFilePath).toBe(path.join(projectRoot, '.camou.json'));
    await expect(findCamouConfigFile(nestedDir)).resolves.toBe(path.join(projectRoot, '.camou.json'));
  });

  it('lets env vars override project defaults', async () => {
    await writeFile(
      path.join(rootDir, 'camou.json'),
      `${JSON.stringify({ defaults: { session: 'workspace', tab: 'assistant' } }, null, 2)}\n`,
      'utf8',
    );

    const resolved = await resolveSharedOptions(
      {},
      {
        cwd: rootDir,
        env: {
          CAMOU_SESSION: 'env-session',
          CAMOU_TABNAME: 'env-tab',
          CAMOU_BROWSER: '135.0.1-beta.24',
          CAMOU_HEADLESS: 'true',
          CAMOU_PROXY: 'http://127.0.0.1:8080',
          CAMOU_PROXY_BYPASS: 'localhost',
          CAMOU_HEADERS: '{"x-env":"yes"}',
          CAMOU_USER_AGENT: 'EnvUA/1.0',
          CAMOU_IGNORE_HTTPS_ERRORS: 'true',
          CAMOU_COLOR_SCHEME: 'light',
          CAMOU_REDUCED_MOTION: 'no-preference',
          CAMOU_INIT_SCRIPTS: 'env-a.js,env-b.js',
          CAMOU_STATE: 'env-state',
          CAMOU_PRESET: 'cache,low-bandwidth',
          CAMOU_LOCALES: 'en-US,fr-FR',
          CAMOU_REGION: 'CA',
          CAMOU_SCREEN_PROFILE: 'desktop-fhd',
          CAMOU_WINDOW_PROFILE: 'desktop',
          CAMOU_BLOCK_IMAGES: 'true',
        },
      },
    );

    expect(resolved.session).toBe('env-session');
    expect(resolved.tabname).toBe('env-tab');
    expect(resolved.browser).toBe('135.0.1-beta.24');
    expect(resolved.headless).toBe(true);
    expect(resolved.proxy).toBe('http://127.0.0.1:8080');
    expect(resolved.proxyBypass).toBe('localhost');
    expect(resolved.headers).toBe('{"x-env":"yes"}');
    expect(resolved.userAgent).toBe('EnvUA/1.0');
    expect(resolved.ignoreHttpsErrors).toBe(true);
    expect(resolved.colorScheme).toBe('light');
    expect(resolved.reducedMotion).toBe('no-preference');
    expect(resolved.initScript).toEqual(['env-a.js', 'env-b.js']);
    expect(resolved.state).toBe('env-state');
    expect(resolved.preset).toEqual(['cache', 'low-bandwidth']);
    expect(resolved.locales).toEqual(['en-US', 'fr-FR']);
    expect(resolved.region).toBe('CA');
    expect(resolved.screenProfile).toBe('desktop-fhd');
    expect(resolved.windowProfile).toBe('desktop');
    expect(resolved.blockImages).toBe(true);
  });

  it('lets explicit CLI options override env vars and config files', async () => {
    await writeFile(
      path.join(rootDir, '.camou.json'),
      `${JSON.stringify({ session: 'workspace', tabname: 'assistant' }, null, 2)}\n`,
      'utf8',
    );

    const resolved = await resolveSharedOptions(
      {
        session: 'flag-session',
        tabname: 'flag-tab',
        browser: '135.0.1-beta.25',
        headed: true,
        headless: false,
        proxy: 'http://127.0.0.2:8080',
        proxyBypass: '127.0.0.1',
        headers: '{"x-cli":"yes"}',
        userAgent: 'CliUA/1.0',
        ignoreHttpsErrors: false,
        colorScheme: 'no-preference',
        reducedMotion: 'reduce',
        initScript: ['cli-init.js'],
        state: 'cli-state',
        preset: ['disable-coop'],
        locales: ['de-DE'],
        region: 'DE',
        screenProfile: 'retina-mac',
        blockImages: false,
      },
      {
        cwd: rootDir,
        env: {
          CAMOU_SESSION: 'env-session',
          CAMOU_TAB: 'env-tab',
          CAMOU_BROWSER: '135.0.1-beta.24',
          CAMOU_HEADLESS: 'true',
          CAMOU_PROXY: 'http://127.0.0.1:8080',
          CAMOU_HEADERS: '{"x-env":"yes"}',
          CAMOU_PRESET: 'cache',
          CAMOU_LOCALES: 'en-US,fr-FR',
          CAMOU_REGION: 'US',
          CAMOU_SCREEN_PROFILE: 'desktop-fhd',
          CAMOU_BLOCK_IMAGES: 'true',
        },
      },
    );

    expect(resolved.session).toBe('flag-session');
    expect(resolved.tabname).toBe('flag-tab');
    expect(resolved.browser).toBe('135.0.1-beta.25');
    expect(resolved.headless).toBe(false);
    expect(resolved.proxy).toBe('http://127.0.0.2:8080');
    expect(resolved.proxyBypass).toBe('127.0.0.1');
    expect(resolved.headers).toBe('{"x-cli":"yes"}');
    expect(resolved.userAgent).toBe('CliUA/1.0');
    expect(resolved.ignoreHttpsErrors).toBe(false);
    expect(resolved.colorScheme).toBe('no-preference');
    expect(resolved.reducedMotion).toBe('reduce');
    expect(resolved.initScript).toEqual(['cli-init.js']);
    expect(resolved.state).toBe('cli-state');
    expect(resolved.preset).toEqual(['disable-coop']);
    expect(resolved.locales).toEqual(['de-DE']);
    expect(resolved.region).toBe('DE');
    expect(resolved.screenProfile).toBe('retina-mac');
    expect(resolved.blockImages).toBe(false);
  });

  it('falls back to built-in defaults when nothing is configured', async () => {
    const resolved = await resolveSharedOptions({}, { cwd: rootDir, env: {} });

    expect(resolved.session).toBe('default');
    expect(resolved.tabname).toBe('main');
    expect(resolved.tabnameSource).toBe('builtin');
    expect(resolved.defaultsFilePath).toBeUndefined();
  });

  it('leaves browser tab selection to the daemon when only the built-in tab default applies', async () => {
    const resolved = await resolveSharedOptions({}, { cwd: rootDir, env: {} });

    expect(
      applyCliDefaultsToPayload('get.title', { action: 'get.title' }, resolved),
    ).toMatchObject({
      session: 'default',
    });
    expect(applyCliDefaultsToPayload('get.title', { action: 'get.title' }, resolved)).not.toHaveProperty('tabName');
  });

  it('keeps configured tab defaults ahead of daemon active-tab fallback', async () => {
    await writeFile(path.join(rootDir, '.camou.json'), `${JSON.stringify({ tabname: 'docs' })}\n`, 'utf8');
    const resolved = await resolveSharedOptions({}, { cwd: rootDir, env: {} });

    expect(resolved.tabnameSource).toBe('config');
    expect(
      applyCliDefaultsToPayload('get.title', { action: 'get.title' }, resolved),
    ).toMatchObject({
      session: 'default',
      tabName: 'docs',
    });
  });

  it('applies resolved defaults to browser payloads only when values are absent', () => {
    const resolved = {
      session: 'workspace',
      tabname: 'assistant',
      tabnameSource: 'config' as const,
      browser: '135.0.1-beta.24',
      headless: true,
      proxy: 'http://127.0.0.1:8080',
      proxyBypass: 'localhost',
      headers: '{"x-default":"yes"}',
      userAgent: 'DefaultUA/1.0',
      ignoreHttpsErrors: true,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      initScript: ['init.js'],
      state: 'auth',
      preset: ['cache'],
      locales: ['en-US', 'fr-FR'],
      region: 'US',
      screenProfile: 'desktop-fhd',
      windowProfile: 'desktop',
      blockImages: true,
    };

    expect(
      applyCliDefaultsToPayload('open', { action: 'open', url: 'https://example.com' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
      proxy: 'http://127.0.0.1:8080',
      proxyBypass: 'localhost',
      headers: '{"x-default":"yes"}',
      userAgent: 'DefaultUA/1.0',
      ignoreHTTPSErrors: true,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      initScripts: ['init.js'],
      state: 'auth',
      preset: ['cache'],
      locales: ['en-US', 'fr-FR'],
      region: 'US',
      screenProfile: 'desktop-fhd',
      windowProfile: 'desktop',
      blockImages: true,
    });

    expect(
      applyCliDefaultsToPayload(
        'open',
        {
          action: 'open',
          url: 'https://example.com',
          session: 'flag-session',
          tabName: 'flag-tab',
          browser: '135.0.1-beta.25',
          headless: false,
          proxy: 'http://127.0.0.2:8080',
          proxyBypass: '127.0.0.1',
          headers: '{"x-flag":"yes"}',
          userAgent: 'FlagUA/1.0',
          ignoreHTTPSErrors: false,
          colorScheme: 'light',
          reducedMotion: 'no-preference',
          initScripts: ['flag-init.js'],
          state: 'flag-auth',
          preset: ['disable-coop'],
          locales: ['de-DE'],
          region: 'DE',
          screenProfile: 'retina-mac',
          blockImages: false,
        },
        resolved,
      ),
    ).toMatchObject({
      session: 'flag-session',
      tabName: 'flag-tab',
      browser: '135.0.1-beta.25',
      headless: false,
      proxy: 'http://127.0.0.2:8080',
      proxyBypass: '127.0.0.1',
      headers: '{"x-flag":"yes"}',
      userAgent: 'FlagUA/1.0',
      ignoreHTTPSErrors: false,
      colorScheme: 'light',
      reducedMotion: 'no-preference',
      initScripts: ['flag-init.js'],
      state: 'flag-auth',
      preset: ['disable-coop'],
      locales: ['de-DE'],
      region: 'DE',
      screenProfile: 'retina-mac',
      blockImages: false,
    });

    expect(
      applyCliDefaultsToPayload('session.stop', { action: 'session.stop' }, resolved),
    ).toMatchObject({
      session: 'workspace',
    });
    expect(applyCliDefaultsToPayload('session.stop', { action: 'session.stop' }, resolved)).not.toHaveProperty('browser');
  });

  it('applies resolved defaults to canonical actions used by command aliases', () => {
    const resolved = {
      session: 'workspace',
      tabname: 'assistant',
      tabnameSource: 'config' as const,
      browser: '135.0.1-beta.24',
      headless: true,
    };

    expect(
      applyCliDefaultsToPayload('open', { action: 'open', url: 'https://example.com' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('press', { action: 'press', key: 'Enter' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('scroll.intoView', { action: 'scroll.intoView', target: '@e1' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('download', { action: 'download', target: '#export', path: 'out.csv' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('read', { action: 'read' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('network.route', { action: 'network.route', url: '**/api', abort: true }, resolved),
    ).toMatchObject({
      session: 'workspace',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('network.requests', { action: 'network.requests' }, resolved),
    ).toMatchObject({
      session: 'workspace',
    });
    expect(applyCliDefaultsToPayload('network.requests', { action: 'network.requests' }, resolved)).not.toHaveProperty('browser');
    expect(
      applyCliDefaultsToPayload('console', { action: 'console' }, resolved),
    ).toMatchObject({
      session: 'workspace',
    });
    expect(applyCliDefaultsToPayload('console', { action: 'console' }, resolved)).not.toHaveProperty('browser');
    expect(
      applyCliDefaultsToPayload('errors', { action: 'errors' }, resolved),
    ).toMatchObject({
      session: 'workspace',
    });
    expect(
      applyCliDefaultsToPayload('highlight', { action: 'highlight', target: '@e1' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('clipboard.read', { action: 'clipboard.read' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('trace.start', { action: 'trace.start' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('trace.stop', { action: 'trace.stop' }, resolved),
    ).toMatchObject({
      session: 'workspace',
    });
    expect(applyCliDefaultsToPayload('trace.stop', { action: 'trace.stop' }, resolved)).not.toHaveProperty('browser');
    expect(
      applyCliDefaultsToPayload('diff.snapshot', { action: 'diff.snapshot', baselineText: 'old' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('diff.screenshot', { action: 'diff.screenshot', baselinePath: '/tmp/base.png' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('diff.url', { action: 'diff.url', leftUrl: 'https://a.test', rightUrl: 'https://b.test' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('vitals', { action: 'vitals' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('pushstate', { action: 'pushstate', url: '/next' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('addinitscript', { action: 'addinitscript', source: 'window.ready = true;' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('cookies.set', { action: 'cookies.set', name: 'sid', value: 'secret', domain: 'example.com', path: '/' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('storage.local', { action: 'storage.local', operation: 'get' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('removeinitscript', { action: 'removeinitscript', scriptId: 'init_1' }, resolved),
    ).toMatchObject({
      session: 'workspace',
    });
    expect(applyCliDefaultsToPayload('removeinitscript', { action: 'removeinitscript', scriptId: 'init_1' }, resolved)).not.toHaveProperty('browser');
    expect(
      applyCliDefaultsToPayload('frame', { action: 'frame', target: '#child' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('dialog.status', { action: 'dialog.status' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
    });
    expect(
      applyCliDefaultsToPayload('runtime.set', { action: 'runtime.set', runtime: { setting: 'viewport', width: 800, height: 600 } }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
    });
    expect(
      applyCliDefaultsToPayload('runtime.set', { action: 'runtime.set', runtime: { setting: 'viewport', width: 800, height: 600 } }, resolved),
    ).not.toHaveProperty('browser');
  });

  it('rejects invalid boolean env defaults', async () => {
    await expect(
      resolveSharedOptions({}, { cwd: rootDir, env: { CAMOU_HEADLESS: 'sometimes' } }),
    ).rejects.toThrow('Invalid boolean value for CAMOU_HEADLESS');
  });

  it('rejects invalid media env defaults', async () => {
    await expect(
      resolveSharedOptions({}, { cwd: rootDir, env: { CAMOU_COLOR_SCHEME: 'sepia' } }),
    ).rejects.toThrow('Invalid value for CAMOU_COLOR_SCHEME');
  });
});
