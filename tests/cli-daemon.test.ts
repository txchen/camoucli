import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getDaemonSpawnConfig } from '../src/cli/daemon.js';

describe('daemon spawn config', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'camou-daemon-spawn-'));
    await mkdir(path.join(rootDir, 'src', 'cli'), { recursive: true });
    await mkdir(path.join(rootDir, 'src', 'daemon'), { recursive: true });
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('prefers the TypeScript daemon when the CLI is running from TypeScript sources', async () => {
    const cliModuleUrl = pathToFileURL(path.join(rootDir, 'src', 'cli', 'daemon.ts')).href;
    await writeFile(path.join(rootDir, 'src', 'daemon', 'main.js'), '// built daemon', 'utf8');
    await writeFile(path.join(rootDir, 'src', 'daemon', 'main.ts'), '// source daemon', 'utf8');

    const spawnConfig = getDaemonSpawnConfig(cliModuleUrl);

    expect(spawnConfig.command).toBe(process.execPath);
    expect(spawnConfig.args).toEqual(['--import', 'tsx', path.join(rootDir, 'src', 'daemon', 'main.ts')]);
  });

  it('prefers the built JavaScript daemon when the CLI is running from JavaScript', async () => {
    const cliModuleUrl = pathToFileURL(path.join(rootDir, 'dist', 'cli', 'daemon.js')).href;
    await mkdir(path.join(rootDir, 'dist', 'cli'), { recursive: true });
    await mkdir(path.join(rootDir, 'dist', 'daemon'), { recursive: true });
    await writeFile(path.join(rootDir, 'dist', 'daemon', 'main.js'), '// built daemon', 'utf8');
    await writeFile(path.join(rootDir, 'dist', 'daemon', 'main.ts'), '// source daemon', 'utf8');

    const spawnConfig = getDaemonSpawnConfig(cliModuleUrl);

    expect(spawnConfig.command).toBe(process.execPath);
    expect(spawnConfig.args).toEqual([path.join(rootDir, 'dist', 'daemon', 'main.js')]);
  });
});
