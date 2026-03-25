import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import type { CamoucliPaths } from '../state/paths.js';
import { isProcessAlive } from '../daemon/runtime.js';
import { getPlatformTarget, isWindows } from '../util/platform.js';
import { listInstalledBrowsers } from './registry.js';

const execFileAsync = promisify(execFile);

export interface CamoufoxProcessInfo {
  pid: number;
  command: string;
}

export interface CamoufoxProcessCleanupResult {
  matched: number;
  killed: number;
  processes: CamoufoxProcessInfo[];
}

function normalizeCommand(value: string): string {
  return value.trim().toLowerCase();
}

function shouldIgnoreKillError(error: unknown): boolean {
  return Boolean(error instanceof Error && 'code' in error && (error.code === 'ESRCH' || error.code === 'EPERM'));
}

async function listUnixCamoufoxProcesses(paths: CamoucliPaths): Promise<CamoufoxProcessInfo[]> {
  const installed = await listInstalledBrowsers(paths);
  const executablePaths = new Set(
    installed.installs
      .map((install) => normalizeCommand(path.resolve(install.executablePath)))
      .filter(Boolean),
  );
  const executableBasenames = new Set<string>([
    normalizeCommand(path.basename(getPlatformTarget().executableRelativePath)),
    ...installed.installs.map((install) => normalizeCommand(path.basename(install.executablePath))).filter(Boolean),
  ]);

  const { stdout } = await execFileAsync('ps', ['-axo', 'pid=,comm=']);
  const processes: CamoufoxProcessInfo[] = [];

  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const match = line.match(/^(\d+)\s+(.+)$/);
    if (!match) {
      continue;
    }

    const pid = Number.parseInt(match[1] ?? '', 10);
    const command = (match[2] ?? '').trim();
    if (!Number.isInteger(pid) || pid <= 0 || !command || pid === process.pid) {
      continue;
    }

    const normalizedCommand = normalizeCommand(command);
    const basename = normalizeCommand(path.basename(command));
    if (!executablePaths.has(normalizedCommand) && !executableBasenames.has(basename)) {
      continue;
    }

    processes.push({ pid, command });
  }

  return processes;
}

export async function listCamoufoxProcesses(paths: CamoucliPaths): Promise<CamoufoxProcessInfo[]> {
  if (isWindows()) {
    return [];
  }

  return listUnixCamoufoxProcesses(paths);
}

export async function killCamoufoxProcesses(
  paths: CamoucliPaths,
  timeoutMs = 2_000,
): Promise<CamoufoxProcessCleanupResult> {
  const processes = await listCamoufoxProcesses(paths);
  const pending = [...new Map(processes.map((processInfo) => [processInfo.pid, processInfo])).values()];

  for (const processInfo of pending) {
    try {
      process.kill(processInfo.pid, 'SIGTERM');
    } catch (error) {
      if (!shouldIgnoreKillError(error)) {
        throw error;
      }
    }
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const alive = pending.filter((processInfo) => isProcessAlive(processInfo.pid));
    if (alive.length === 0) {
      return {
        matched: pending.length,
        killed: pending.length,
        processes: pending,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  for (const processInfo of pending) {
    if (!isProcessAlive(processInfo.pid)) {
      continue;
    }
    try {
      process.kill(processInfo.pid, 'SIGKILL');
    } catch (error) {
      if (!shouldIgnoreKillError(error)) {
        throw error;
      }
    }
  }

  const killed = pending.filter((processInfo) => !isProcessAlive(processInfo.pid)).length;
  return {
    matched: pending.length,
    killed,
    processes: pending,
  };
}
