import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { cleanupStaleDaemonArtifacts, readDaemonPid } from '../daemon/runtime.js';
import type { CamoucliPaths } from '../state/paths.js';
import { DaemonStartError } from '../util/errors.js';
import { pingDaemon } from '../ipc/client.js';

function getDaemonSpawnConfig(): { command: string; args: string[] } {
  const jsPath = fileURLToPath(new URL('../daemon/main.js', import.meta.url));
  if (existsSync(jsPath)) {
    return {
      command: process.execPath,
      args: [jsPath],
    };
  }

  const tsPath = fileURLToPath(new URL('../daemon/main.ts', import.meta.url));
  return {
    command: process.execPath,
    args: ['--import', 'tsx', tsPath],
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureDaemonRunning(paths: CamoucliPaths, verbose: boolean): Promise<void> {
  if (await pingDaemon(paths)) {
    return;
  }

  const artifactState = await cleanupStaleDaemonArtifacts(paths);
  if (artifactState.pidAlive) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await sleep(250);
      if (await pingDaemon(paths)) {
        return;
      }
    }

    throw new DaemonStartError(
      `Daemon process ${artifactState.pid} exists but is not responding. Remove ${paths.daemonPidFile} or stop the stale process before retrying.`,
    );
  }

  const spawnConfig = getDaemonSpawnConfig();
  const child = spawn(spawnConfig.command, spawnConfig.args, {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      CAMOUCLI_VERBOSE: verbose ? '1' : '0',
    },
  });
  child.unref();

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await sleep(250);
    if (await pingDaemon(paths)) {
      return;
    }
  }

  const pid = await readDaemonPid(paths);

  throw new DaemonStartError(
    pid
      ? `Failed to start the camoucli daemon. See ${paths.daemonLogFile} and stop process ${pid} if it is stuck.`
      : `Failed to start the camoucli daemon. See ${paths.daemonLogFile} for details.`,
  );
}
