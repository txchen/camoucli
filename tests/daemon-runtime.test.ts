import os from 'node:os';
import path from 'node:path';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { cleanupStaleDaemonArtifacts, readDaemonPid } from '../src/daemon/runtime.js';
import { createTestPaths } from './helpers/temp-paths.js';

describe('daemon runtime helpers', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'camoucli-daemon-runtime-'));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('removes stale pid and socket artifacts when the process is gone', async () => {
    const paths = createTestPaths(rootDir);
    await mkdir(path.dirname(paths.daemonPidFile), { recursive: true });
    await writeFile(paths.daemonPidFile, '999999\n', 'utf8');
    await writeFile(paths.daemonSocketPath!, '', 'utf8');

    const result = await cleanupStaleDaemonArtifacts(paths);

    expect(result.pid).toBe(999999);
    expect(result.pidAlive).toBe(false);
    expect(result.removedPidFile).toBe(true);
    expect(result.removedSocket).toBe(true);
    expect(await readDaemonPid(paths)).toBeUndefined();
  });
});
