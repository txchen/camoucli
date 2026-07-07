import path from 'node:path';
import { readdir, readFile, rename, rm, stat } from 'node:fs/promises';

import type { CamoucliPaths } from './paths.js';
import { resolveStateSnapshotPath } from './states.js';
import { ensureDir, writeJsonFile } from './store.js';
import { ValidationError } from '../util/errors.js';

export interface StorageStateSnapshot {
  cookies: Array<Record<string, unknown>>;
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}

export interface StateSnapshotRecord {
  name: string;
  path: string;
  managed: boolean;
  size: number;
  modifiedAt: string;
}

export function normalizeStorageState(value: unknown): StorageStateSnapshot {
  if (!value || typeof value !== 'object') {
    throw new ValidationError('Storage state must be a JSON object.');
  }
  const record = value as Record<string, unknown>;
  const cookies = Array.isArray(record.cookies) ? record.cookies : [];
  const origins = Array.isArray(record.origins) ? record.origins : [];
  return {
    cookies: cookies.map((cookie) => {
      if (!cookie || typeof cookie !== 'object') {
        throw new ValidationError('Storage state contains an invalid cookie.');
      }
      return cookie as Record<string, unknown>;
    }),
    origins: origins.map((originRecord) => {
      if (!originRecord || typeof originRecord !== 'object') {
        throw new ValidationError('Storage state contains an invalid origin.');
      }
      const origin = (originRecord as Record<string, unknown>).origin;
      const localStorage = (originRecord as Record<string, unknown>).localStorage;
      if (typeof origin !== 'string' || !Array.isArray(localStorage)) {
        throw new ValidationError('Storage state contains an invalid origin.');
      }
      return {
        origin,
        localStorage: localStorage.map((item) => {
          if (!item || typeof item !== 'object') {
            throw new ValidationError('Storage state contains an invalid localStorage item.');
          }
          const name = (item as Record<string, unknown>).name;
          const value = (item as Record<string, unknown>).value;
          if (typeof name !== 'string' || typeof value !== 'string') {
            throw new ValidationError('Storage state contains an invalid localStorage item.');
          }
          return { name, value };
        }),
      };
    }),
  };
}

export async function readStateSnapshot(filePath: string): Promise<StorageStateSnapshot> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new ValidationError('Storage state snapshot could not be read or parsed.', { path: filePath }, error);
  }
  return normalizeStorageState(parsed);
}

export async function writeStateSnapshot(filePath: string, state: unknown): Promise<void> {
  await writeJsonFile(filePath, normalizeStorageState(state));
}

export async function listStateSnapshots(paths: CamoucliPaths): Promise<StateSnapshotRecord[]> {
  await ensureDir(paths.statesDir);
  const entries = await readdir(paths.statesDir, { withFileTypes: true });
  const records = await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map(async (entry) => {
      const filePath = path.join(paths.statesDir, entry.name);
      const stats = await stat(filePath);
      return {
        name: entry.name.slice(0, -'.json'.length),
        path: filePath,
        managed: true,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      };
    }));
  return records.sort((left, right) => left.name.localeCompare(right.name));
}

export async function removeStateSnapshot(paths: CamoucliPaths, pathOrName: string): Promise<{ name: string; path: string; removed: boolean }> {
  const filePath = resolveStateSnapshotPath(paths, pathOrName);
  const existed = await stat(filePath).then(() => true, () => false);
  await rm(filePath, { force: true });
  return { name: path.basename(filePath, '.json'), path: filePath, removed: existed };
}

export async function removeAllManagedStateSnapshots(paths: CamoucliPaths): Promise<{ removed: number; paths: string[] }> {
  const snapshots = await listStateSnapshots(paths);
  await Promise.all(snapshots.map((snapshot) => rm(snapshot.path, { force: true })));
  return { removed: snapshots.length, paths: snapshots.map((snapshot) => snapshot.path) };
}

export async function renameStateSnapshot(paths: CamoucliPaths, from: string, to: string): Promise<{ from: string; to: string; path: string }> {
  const fromPath = resolveStateSnapshotPath(paths, from);
  const toPath = resolveStateSnapshotPath(paths, to);
  if (fromPath === toPath) {
    return { from, to, path: toPath };
  }
  await ensureDir(path.dirname(toPath));
  await rename(fromPath, toPath);
  return { from, to, path: toPath };
}

export async function cleanStateSnapshots(paths: CamoucliPaths): Promise<{ removed: number; paths: string[] }> {
  const snapshots = await listStateSnapshots(paths);
  const removed: string[] = [];
  for (const snapshot of snapshots) {
    try {
      await readStateSnapshot(snapshot.path);
    } catch {
      await rm(snapshot.path, { force: true });
      removed.push(snapshot.path);
    }
  }
  return { removed: removed.length, paths: removed };
}
