import { readFile, rm, unlink } from 'node:fs/promises';

import type { CamoucliPaths } from '../state/paths.js';

export interface DaemonArtifactState {
  pid?: number | undefined;
  pidAlive: boolean;
  removedPidFile: boolean;
  removedSocket: boolean;
}

export async function readDaemonPid(paths: CamoucliPaths): Promise<number | undefined> {
  try {
    const raw = await readFile(paths.daemonPidFile, 'utf8');
    const value = Number.parseInt(raw.trim(), 10);
    return Number.isInteger(value) && value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return Boolean(error instanceof Error && 'code' in error && error.code === 'EPERM');
  }
}

async function removeFile(filePath: string): Promise<boolean> {
  try {
    await unlink(filePath);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export async function cleanupStaleDaemonArtifacts(paths: CamoucliPaths): Promise<DaemonArtifactState> {
  const pid = await readDaemonPid(paths);
  const pidAlive = pid ? isProcessAlive(pid) : false;

  const removedPidFile = pid && !pidAlive ? await removeFile(paths.daemonPidFile) : false;
  const removedSocket = (!pid || !pidAlive) && paths.daemonSocketPath ? await removeFile(paths.daemonSocketPath) : false;

  return {
    pid,
    pidAlive,
    removedPidFile,
    removedSocket,
  };
}

export async function removeDaemonArtifacts(paths: CamoucliPaths): Promise<void> {
  await removeFile(paths.daemonPidFile);
  if (paths.daemonSocketPath) {
    await removeFile(paths.daemonSocketPath);
  }
  if (!paths.daemonSocketPath && paths.runtimeDir) {
    await rm(paths.runtimeDir, { recursive: false, force: false }).catch(() => undefined);
  }
}
