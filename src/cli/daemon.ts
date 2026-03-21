import { existsSync } from 'node:fs';
import { extname } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import packageJson from '../../package.json' with { type: 'json' };

import { cleanupStaleDaemonArtifacts, readDaemonPid, stopDaemonProcess } from '../daemon/runtime.js';
import { getDaemonStatus } from '../ipc/client.js';
import type { CamoucliPaths } from '../state/paths.js';
import { DaemonStartError } from '../util/errors.js';

export function getDaemonSpawnConfig(moduleUrl: string = import.meta.url): { command: string; args: string[] } {
  const currentPath = fileURLToPath(moduleUrl);
  const tsPath = fileURLToPath(new URL('../daemon/main.ts', moduleUrl));

  if (['.ts', '.tsx', '.mts', '.cts'].includes(extname(currentPath))) {
    return {
      command: process.execPath,
      args: ['--import', 'tsx', tsPath],
    };
  }

  const jsPath = fileURLToPath(new URL('../daemon/main.js', moduleUrl));
  if (existsSync(jsPath)) {
    return {
      command: process.execPath,
      args: [jsPath],
    };
  }

  return {
    command: process.execPath,
    args: ['--import', 'tsx', tsPath],
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCompatibleDaemonVersion(version: string | undefined, expectedVersion: string = packageJson.version): boolean {
  return version === expectedVersion;
}

async function spawnDaemon(verbose: boolean): Promise<void> {
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
}

export async function ensureDaemonRunning(paths: CamoucliPaths, verbose: boolean): Promise<void> {
  const daemonStatus = await getDaemonStatus(paths);
  if (daemonStatus && isCompatibleDaemonVersion(daemonStatus.version)) {
    return;
  }

  if (daemonStatus?.pid) {
    await stopDaemonProcess(daemonStatus.pid);
    await cleanupStaleDaemonArtifacts(paths);
  }

  const artifactState = await cleanupStaleDaemonArtifacts(paths);
  if (artifactState.pidAlive) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await sleep(250);
      const status = await getDaemonStatus(paths);
      if (status && isCompatibleDaemonVersion(status.version)) {
        return;
      }
    }

    throw new DaemonStartError(
      `Daemon process ${artifactState.pid} exists but is not responding. Remove ${paths.daemonPidFile} or stop the stale process before retrying.`,
    );
  }

  await spawnDaemon(verbose);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await sleep(250);
    const status = await getDaemonStatus(paths);
    if (status && isCompatibleDaemonVersion(status.version)) {
      return;
    }
  }

  const pid = await readDaemonPid(paths);

  throw new DaemonStartError(
    pid
      ? `Failed to start the camou daemon. See ${paths.daemonLogFile} and stop process ${pid} if it is stuck.`
      : `Failed to start the camou daemon. See ${paths.daemonLogFile} for details.`,
  );
}

export async function stopDaemon(paths: CamoucliPaths): Promise<{ stopped: boolean; pid?: number | undefined }> {
  const daemonStatus = await getDaemonStatus(paths);
  if (daemonStatus?.pid) {
    await stopDaemonProcess(daemonStatus.pid);
    await cleanupStaleDaemonArtifacts(paths);
    return { stopped: true, pid: daemonStatus.pid };
  }

  const artifactState = await cleanupStaleDaemonArtifacts(paths);
  if (artifactState.pidAlive && artifactState.pid) {
    await stopDaemonProcess(artifactState.pid);
    await cleanupStaleDaemonArtifacts(paths);
    return { stopped: true, pid: artifactState.pid };
  }

  return { stopped: false };
}

export async function restartDaemon(
  paths: CamoucliPaths,
  verbose: boolean,
): Promise<{ restarted: true; stopped: boolean; pid?: number | undefined; version?: string | undefined }> {
  const stopped = await stopDaemon(paths);
  await ensureDaemonRunning(paths, verbose);
  const daemonStatus = await getDaemonStatus(paths);
  return {
    restarted: true,
    stopped: stopped.stopped,
    pid: daemonStatus?.pid,
    version: daemonStatus?.version,
  };
}
