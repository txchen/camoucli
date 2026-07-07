import path from 'node:path';
import { readdir, rm, stat } from 'node:fs/promises';

import type { CamoucliPaths } from './paths.js';
import { sanitizeName } from './paths.js';

export interface StoredSessionProfile {
  profileName: string;
  rootDir: string;
  profileDir: string;
  downloadsDir: string;
  artifactsDir: string;
  stored: true;
}

export interface RemovedStoredSessionProfile {
  profileName: string;
  rootDir: string;
  removed: boolean;
}

export interface StoppedSessionInfo {
  sessionName: string;
  profileName: string;
  active: false;
  found: boolean;
  rootDir: string;
  profileDir: string;
  downloadsDir: string;
  artifactsDir: string;
}

export function resolveStoredSessionProfile(paths: CamoucliPaths, profileName: string): StoredSessionProfile {
  const safeProfileName = sanitizeName(profileName);
  const rootDir = path.join(paths.profilesDir, safeProfileName);
  return {
    profileName: safeProfileName,
    rootDir,
    profileDir: path.join(rootDir, 'user-data'),
    downloadsDir: path.join(rootDir, 'downloads'),
    artifactsDir: path.join(rootDir, 'artifacts'),
    stored: true,
  };
}

export async function listStoredSessionProfiles(paths: CamoucliPaths): Promise<StoredSessionProfile[]> {
  const entries = await readdir(paths.profilesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolveStoredSessionProfile(paths, entry.name))
    .sort((left, right) => left.profileName.localeCompare(right.profileName));
}

export async function inspectStoredSessionProfile(
  paths: CamoucliPaths,
  profileName: string,
): Promise<(StoredSessionProfile & { found: true }) | { profileName: string; rootDir: string; found: false }> {
  const record = resolveStoredSessionProfile(paths, profileName);
  try {
    const details = await stat(record.rootDir);
    if (!details.isDirectory()) {
      return { profileName: record.profileName, rootDir: record.rootDir, found: false };
    }
  } catch {
    return { profileName: record.profileName, rootDir: record.rootDir, found: false };
  }

  return { ...record, found: true };
}

export async function inspectStoppedSessionInfo(paths: CamoucliPaths, sessionName: string): Promise<StoppedSessionInfo> {
  const record = resolveStoredSessionProfile(paths, sessionName);
  const inspected = await inspectStoredSessionProfile(paths, sessionName);
  return {
    sessionName,
    profileName: record.profileName,
    active: false,
    found: inspected.found,
    rootDir: record.rootDir,
    profileDir: record.profileDir,
    downloadsDir: record.downloadsDir,
    artifactsDir: record.artifactsDir,
  };
}

export async function removeStoredSessionProfile(
  paths: CamoucliPaths,
  profileName: string,
): Promise<RemovedStoredSessionProfile> {
  const record = resolveStoredSessionProfile(paths, profileName);
  try {
    const details = await stat(record.rootDir);
    if (!details.isDirectory()) {
      return { profileName: record.profileName, rootDir: record.rootDir, removed: false };
    }
  } catch {
    return { profileName: record.profileName, rootDir: record.rootDir, removed: false };
  }

  await rm(record.rootDir, { recursive: true, force: true });
  return { profileName: record.profileName, rootDir: record.rootDir, removed: true };
}
