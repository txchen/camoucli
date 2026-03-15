import { stat } from 'node:fs/promises';

import type { CamoucliPaths } from '../state/paths.js';
import type { PlatformArch, PlatformOs } from '../util/platform.js';
import { BrowserNotInstalledError } from '../util/errors.js';
import { readJsonFile, writeJsonFile } from '../state/store.js';

export interface BrowserInstallRecord {
  version: string;
  tag: string;
  sourceRepo: string;
  assetName: string;
  assetUrl: string;
  rootDir: string;
  executablePath: string;
  installedAt: string;
  platform: PlatformOs;
  arch: PlatformArch;
}

export interface BrowserRegistry {
  currentVersion?: string | undefined;
  installs: Record<string, BrowserInstallRecord>;
}

const EMPTY_REGISTRY: BrowserRegistry = {
  installs: {},
};

export async function loadBrowserRegistry(paths: CamoucliPaths): Promise<BrowserRegistry> {
  return readJsonFile(paths.browserRegistryFile, EMPTY_REGISTRY);
}

export async function saveBrowserRegistry(paths: CamoucliPaths, registry: BrowserRegistry): Promise<void> {
  await writeJsonFile(paths.browserRegistryFile, registry);
}

export async function setInstalledBrowser(
  paths: CamoucliPaths,
  record: BrowserInstallRecord,
  makeCurrent = true,
): Promise<BrowserRegistry> {
  const registry = await loadBrowserRegistry(paths);
  registry.installs[record.version] = record;
  if (makeCurrent || !registry.currentVersion) {
    registry.currentVersion = record.version;
  }
  await saveBrowserRegistry(paths, registry);
  return registry;
}

export async function setCurrentBrowser(paths: CamoucliPaths, version: string): Promise<BrowserRegistry> {
  const registry = await loadBrowserRegistry(paths);
  if (!registry.installs[version]) {
    throw new BrowserNotInstalledError(`Camoufox version ${version} is not installed.`);
  }
  registry.currentVersion = version;
  await saveBrowserRegistry(paths, registry);
  return registry;
}

export async function removeInstalledBrowser(paths: CamoucliPaths, version: string): Promise<BrowserRegistry> {
  const registry = await loadBrowserRegistry(paths);
  delete registry.installs[version];

  if (registry.currentVersion === version) {
    const remaining = Object.keys(registry.installs).sort();
    registry.currentVersion = remaining.at(-1);
  }

  await saveBrowserRegistry(paths, registry);
  return registry;
}

export async function resolveInstalledBrowser(
  paths: CamoucliPaths,
  version?: string,
): Promise<BrowserInstallRecord | undefined> {
  const registry = await loadBrowserRegistry(paths);
  const selectedVersion = version ?? registry.currentVersion;
  if (!selectedVersion) {
    return undefined;
  }
  return registry.installs[selectedVersion];
}

export async function requireInstalledBrowser(
  paths: CamoucliPaths,
  version?: string,
): Promise<BrowserInstallRecord> {
  const record = await resolveInstalledBrowser(paths, version);
  if (!record) {
    throw new BrowserNotInstalledError();
  }

  try {
    await stat(record.executablePath);
  } catch {
    throw new BrowserNotInstalledError(
      `Camoufox is registered at ${record.executablePath}, but the executable is missing. Run \`camoucli install ${record.version}\` again.`,
    );
  }

  return record;
}
