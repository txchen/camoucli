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
      `${JSON.stringify({ session: 'workspace', tabname: 'assistant', browser: '135.0.1-beta.24', headless: true, preset: ['cache', 'low-bandwidth'] }, null, 2)}\n`,
      'utf8',
    );

    const resolved = await resolveSharedOptions({}, { cwd: nestedDir, env: {} });

    expect(resolved.session).toBe('workspace');
    expect(resolved.tabname).toBe('assistant');
    expect(resolved.browser).toBe('135.0.1-beta.24');
    expect(resolved.headless).toBe(true);
    expect(resolved.preset).toEqual(['cache', 'low-bandwidth']);
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
          CAMOU_PRESET: 'cache,low-bandwidth',
        },
      },
    );

    expect(resolved.session).toBe('env-session');
    expect(resolved.tabname).toBe('env-tab');
    expect(resolved.browser).toBe('135.0.1-beta.24');
    expect(resolved.headless).toBe(true);
    expect(resolved.preset).toEqual(['cache', 'low-bandwidth']);
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
        headless: false,
        preset: ['disable-coop'],
      },
      {
        cwd: rootDir,
        env: {
          CAMOU_SESSION: 'env-session',
          CAMOU_TAB: 'env-tab',
          CAMOU_BROWSER: '135.0.1-beta.24',
          CAMOU_HEADLESS: 'true',
          CAMOU_PRESET: 'cache',
        },
      },
    );

    expect(resolved.session).toBe('flag-session');
    expect(resolved.tabname).toBe('flag-tab');
    expect(resolved.browser).toBe('135.0.1-beta.25');
    expect(resolved.headless).toBe(false);
    expect(resolved.preset).toEqual(['disable-coop']);
  });

  it('falls back to built-in defaults when nothing is configured', async () => {
    const resolved = await resolveSharedOptions({}, { cwd: rootDir, env: {} });

    expect(resolved.session).toBe('default');
    expect(resolved.tabname).toBe('main');
    expect(resolved.defaultsFilePath).toBeUndefined();
  });

  it('applies resolved defaults to browser payloads only when values are absent', () => {
    const resolved = {
      session: 'workspace',
      tabname: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
      preset: ['cache'],
    };

    expect(
      applyCliDefaultsToPayload('open', { action: 'open', url: 'https://example.com' }, resolved),
    ).toMatchObject({
      session: 'workspace',
      tabName: 'assistant',
      browser: '135.0.1-beta.24',
      headless: true,
      preset: ['cache'],
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
          preset: ['disable-coop'],
        },
        resolved,
      ),
    ).toMatchObject({
      session: 'flag-session',
      tabName: 'flag-tab',
      browser: '135.0.1-beta.25',
      headless: false,
      preset: ['disable-coop'],
    });

    expect(
      applyCliDefaultsToPayload('session.stop', { action: 'session.stop' }, resolved),
    ).toMatchObject({
      session: 'workspace',
    });
    expect(applyCliDefaultsToPayload('session.stop', { action: 'session.stop' }, resolved)).not.toHaveProperty('browser');
  });

  it('rejects invalid boolean env defaults', async () => {
    await expect(
      resolveSharedOptions({}, { cwd: rootDir, env: { CAMOU_HEADLESS: 'sometimes' } }),
    ).rejects.toThrow('Invalid boolean value for CAMOU_HEADLESS');
  });
});
