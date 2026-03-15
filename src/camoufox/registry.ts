import path from 'node:path';
import { readFile, readdir, stat } from 'node:fs/promises';

import type { CamoucliPaths } from '../state/paths.js';
import { getPlatformTarget, type PlatformArch, type PlatformOs } from '../util/platform.js';
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

function createEmptyRegistry(): BrowserRegistry {
  return {
    installs: {},
  };
}

interface SharedCamoufoxConfig {
  active_version?: string | null;
}

interface SharedVersionMetadata {
  version?: string;
  build?: string;
  release?: string;
  tag?: string;
}

export async function loadBrowserRegistry(paths: CamoucliPaths): Promise<BrowserRegistry> {
  return readJsonFile(paths.browserRegistryFile, createEmptyRegistry());
}

async function saveSharedCamoufoxConfig(paths: CamoucliPaths, config: SharedCamoufoxConfig): Promise<void> {
  await writeJsonFile(paths.camoufoxConfigFile, config);
}

async function loadSharedCamoufoxConfig(paths: CamoucliPaths): Promise<SharedCamoufoxConfig> {
  return readJsonFile(paths.camoufoxConfigFile, {});
}

async function loadSharedBrowserInstalls(paths: CamoucliPaths): Promise<BrowserRegistry> {
  const target = getPlatformTarget();
  const installs: Record<string, BrowserInstallRecord> = {};

  try {
    const repoEntries = await readdir(paths.browsersDir, { withFileTypes: true });
    for (const repoEntry of repoEntries) {
      if (!repoEntry.isDirectory()) {
        continue;
      }

      const repoRoot = path.join(paths.browsersDir, repoEntry.name);
      const versionEntries = await readdir(repoRoot, { withFileTypes: true });
      for (const versionEntry of versionEntries) {
        if (!versionEntry.isDirectory()) {
          continue;
        }

        const rootDir = path.join(repoRoot, versionEntry.name);
        const versionJsonPath = path.join(rootDir, 'version.json');

        let metadata: SharedVersionMetadata;
        try {
          metadata = JSON.parse(await readFile(versionJsonPath, 'utf8')) as SharedVersionMetadata;
        } catch {
          continue;
        }

        const build = metadata.build ?? metadata.release ?? metadata.tag;
        const version = metadata.version && build ? `${metadata.version}-${build}` : versionEntry.name;
        const executablePath = path.join(rootDir, target.executableRelativePath);
        const rootStats = await stat(rootDir).catch(() => undefined);

        installs[version] = {
          version,
          tag: build ? `v${version}` : version,
          sourceRepo: repoEntry.name,
          assetName: '',
          assetUrl: '',
          rootDir,
          executablePath,
          installedAt: rootStats?.mtime.toISOString() ?? new Date(0).toISOString(),
          platform: target.os,
          arch: target.arch,
        };
      }
    }
  } catch {
    return { installs: {} };
  }

  const sharedConfig = await loadSharedCamoufoxConfig(paths);
  const activeVersion = sharedConfig.active_version ? path.basename(sharedConfig.active_version) : undefined;
  return {
    currentVersion: activeVersion && installs[activeVersion] ? activeVersion : pickLatestVersion(Object.keys(installs)),
    installs,
  };
}

async function loadEffectiveBrowserRegistry(paths: CamoucliPaths): Promise<BrowserRegistry> {
  const [localRegistry, sharedRegistry] = await Promise.all([
    loadBrowserRegistry(paths),
    loadSharedBrowserInstalls(paths),
  ]);

  const installs = {
    ...sharedRegistry.installs,
    ...localRegistry.installs,
  };

  const currentVersion = resolveCurrentVersion(localRegistry.currentVersion, sharedRegistry.currentVersion, installs);

  return {
    currentVersion,
    installs,
  };
}

function resolveCurrentVersion(
  localCurrentVersion: string | undefined,
  sharedCurrentVersion: string | undefined,
  installs: Record<string, BrowserInstallRecord>,
): string | undefined {
  if (localCurrentVersion && installs[localCurrentVersion]) {
    return localCurrentVersion;
  }

  if (sharedCurrentVersion && installs[sharedCurrentVersion]) {
    return sharedCurrentVersion;
  }

  return pickLatestVersion(Object.keys(installs));
}

function pickLatestVersion(versions: string[]): string | undefined {
  return versions.sort((left, right) => left.localeCompare(right, undefined, { numeric: true })).at(-1);
}

function toSharedActiveVersion(paths: CamoucliPaths, rootDir: string): string | undefined {
  const relativePath = path.relative(paths.camoufoxCacheDir, rootDir);
  if (!relativePath || relativePath.startsWith('..')) {
    return undefined;
  }

  return relativePath.split(path.sep).join('/');
}

async function updateSharedCurrentBrowser(
  paths: CamoucliPaths,
  record: BrowserInstallRecord | undefined,
): Promise<void> {
  const config = await loadSharedCamoufoxConfig(paths);
  config.active_version = record ? toSharedActiveVersion(paths, record.rootDir) ?? null : null;
  await saveSharedCamoufoxConfig(paths, config);
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
  if (registry.currentVersion === record.version) {
    await updateSharedCurrentBrowser(paths, record);
  }
  return registry;
}

export async function setCurrentBrowser(paths: CamoucliPaths, version: string): Promise<BrowserRegistry> {
  const [registry, effectiveRegistry] = await Promise.all([
    loadBrowserRegistry(paths),
    loadEffectiveBrowserRegistry(paths),
  ]);
  if (!effectiveRegistry.installs[version]) {
    throw new BrowserNotInstalledError(`Camoufox version ${version} is not installed.`);
  }
  registry.currentVersion = version;
  await saveBrowserRegistry(paths, registry);
  await updateSharedCurrentBrowser(paths, effectiveRegistry.installs[version]);
  return {
    currentVersion: version,
    installs: effectiveRegistry.installs,
  };
}

export async function removeInstalledBrowser(paths: CamoucliPaths, version: string): Promise<BrowserRegistry> {
  const [registry, sharedRegistry] = await Promise.all([
    loadBrowserRegistry(paths),
    loadSharedBrowserInstalls(paths),
  ]);
  delete registry.installs[version];

  const remaining = {
    ...sharedRegistry.installs,
    ...registry.installs,
  };
  delete remaining[version];

  if (registry.currentVersion === version) {
    registry.currentVersion = pickLatestVersion(Object.keys(remaining));
  }

  await saveBrowserRegistry(paths, registry);
  await updateSharedCurrentBrowser(paths, registry.currentVersion ? remaining[registry.currentVersion] : undefined);
  return {
    currentVersion: registry.currentVersion,
    installs: remaining,
  };
}

export async function resolveInstalledBrowser(
  paths: CamoucliPaths,
  version?: string,
): Promise<BrowserInstallRecord | undefined> {
  const registry = await loadEffectiveBrowserRegistry(paths);
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
