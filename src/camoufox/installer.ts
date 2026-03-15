import { createWriteStream } from 'node:fs';
import { chmod, mkdtemp, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';

import extract from 'extract-zip';

import type { CamoucliPaths } from '../state/paths.js';
import { ensureDir } from '../state/store.js';
import { InstallError } from '../util/errors.js';
import { buildExpectedAssetName, getPlatformTarget, normalizeReleaseVersion } from '../util/platform.js';
import type { Logger } from '../util/log.js';
import { removeInstalledBrowser, resolveInstalledBrowser, setInstalledBrowser } from './registry.js';

const DEFAULT_RELEASE_REPOS = ['daijro/camoufox', 'camoufox/camoufox'] as const;

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  prerelease?: boolean;
  assets: GitHubAsset[];
}

export interface ResolvedRelease {
  repo: string;
  tag: string;
  version: string;
  assetName: string;
  assetUrl: string;
  prerelease: boolean;
}

interface CamoufoxVersionMetadata {
  version: string;
  build: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const headers: HeadersInit = {
    'user-agent': 'camoucli',
    accept: 'application/vnd.github+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new InstallError(`GitHub request failed with ${response.status} for ${url}.`);
  }
  return response.json() as Promise<T>;
}

export async function resolveRelease(version?: string): Promise<ResolvedRelease> {
  const target = getPlatformTarget();
  const normalizedVersion = version ? normalizeReleaseVersion(version) : undefined;
  const expectedAssetName = normalizedVersion
    ? buildExpectedAssetName(normalizedVersion, target)
    : undefined;

  for (const repo of DEFAULT_RELEASE_REPOS) {
    const apiUrl = version
      ? `https://api.github.com/repos/${repo}/releases`
      : `https://api.github.com/repos/${repo}/releases/latest`;
    const payload = await fetchJson<GitHubRelease | GitHubRelease[]>(apiUrl);
    const releases = Array.isArray(payload) ? payload : [payload];

    for (const release of releases) {
      const releaseVersion = normalizeReleaseVersion(release.tag_name);
      if (normalizedVersion && releaseVersion !== normalizedVersion) {
        continue;
      }

      const assetName = expectedAssetName ?? buildExpectedAssetName(releaseVersion, target);
      const asset = release.assets.find((candidate) => candidate.name === assetName);
      if (!asset) {
        continue;
      }

      return {
        repo,
        tag: release.tag_name,
        version: releaseVersion,
        assetName: asset.name,
        assetUrl: asset.browser_download_url,
        prerelease: release.prerelease ?? false,
      };
    }
  }

  throw new InstallError(
    version
      ? `Unable to find Camoufox release ${version} for this platform.`
      : 'Unable to find a compatible Camoufox release for this platform.',
  );
}

function splitReleaseVersion(version: string): CamoufoxVersionMetadata {
  const separatorIndex = version.lastIndexOf('-');
  if (separatorIndex <= 0 || separatorIndex === version.length - 1) {
    throw new InstallError(`Unable to split Camoufox release version: ${version}`);
  }

  return {
    version: version.slice(0, separatorIndex),
    build: version.slice(separatorIndex + 1),
  };
}

async function writeVersionMetadata(rootDir: string, release: ResolvedRelease): Promise<void> {
  const parsed = splitReleaseVersion(release.version);
  await writeFile(
    path.join(rootDir, 'version.json'),
    `${JSON.stringify({
      version: parsed.version,
      build: parsed.build,
      prerelease: release.prerelease,
    }, null, 2)}\n`,
    'utf8',
  );
}

async function downloadAsset(url: string, targetFile: string, logger?: Logger): Promise<void> {
  const headers: HeadersInit = { 'user-agent': 'camoucli' };
  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok || !response.body) {
    throw new InstallError(`Failed to download ${url}.`, { status: response.status });
  }

  logger?.info('Downloading Camoufox release', { url });
  const stream = createWriteStream(targetFile);
  await response.body.pipeTo(Writable.toWeb(stream));
}

async function findExecutablePath(rootDir: string, expectedRelativePath: string): Promise<string> {
  const directPath = path.join(rootDir, expectedRelativePath);
  try {
    await stat(directPath);
    return directPath;
  } catch {
    // Continue into recursive search.
  }

  const queue = [rootDir];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (path.basename(expectedRelativePath) === entry.name) {
        return fullPath;
      }
    }
  }

  throw new InstallError(`Unable to find extracted Camoufox executable inside ${rootDir}.`);
}

async function makeExecutable(filePath: string): Promise<void> {
  if (process.platform !== 'win32') {
    await chmod(filePath, 0o755);
  }
}

export async function installCamoufox(
  paths: CamoucliPaths,
  options?: { version?: string | undefined; force?: boolean | undefined; logger?: Logger | undefined },
): Promise<ResolvedRelease> {
  const target = getPlatformTarget();
  const logger = options?.logger;
  const release = await resolveRelease(options?.version);
  const existing = await resolveInstalledBrowser(paths, release.version);
  if (existing && !options?.force) {
    logger?.info('Camoufox version already installed', { version: release.version });
    return release;
  }

  await ensureDir(path.join(paths.browsersDir, 'official'));
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'camoucli-install-'));
  const archivePath = path.join(tempRoot, release.assetName);
  const extractDir = path.join(tempRoot, 'extract');
  const finalDir = path.join(paths.browsersDir, 'official', release.version);

  try {
    await downloadAsset(release.assetUrl, archivePath, logger);
    await ensureDir(extractDir);
    logger?.info('Extracting Camoufox release', { archivePath });
    await extract(archivePath, { dir: extractDir });

    const executablePath = await findExecutablePath(extractDir, target.executableRelativePath);

    if (options?.force) {
      await rm(finalDir, { recursive: true, force: true });
    }

    await rename(extractDir, finalDir);
    await writeVersionMetadata(finalDir, release);

    const finalExecutablePath = path.join(finalDir, path.relative(extractDir, executablePath));
    await makeExecutable(finalExecutablePath);

    await setInstalledBrowser(
      paths,
      {
        version: release.version,
        tag: release.tag,
        sourceRepo: release.repo,
        assetName: release.assetName,
        assetUrl: release.assetUrl,
        rootDir: finalDir,
        executablePath: finalExecutablePath,
        installedAt: new Date().toISOString(),
        platform: target.os,
        arch: target.arch,
      },
      true,
    );

    logger?.info('Installed Camoufox release', { version: release.version, executablePath: finalExecutablePath });
    return release;
  } catch (error) {
    throw error instanceof InstallError
      ? error
      : new InstallError('Failed to install Camoufox.', undefined, error);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export async function removeCamoufox(
  paths: CamoucliPaths,
  version: string,
  logger?: Logger | undefined,
): Promise<void> {
  const existing = await resolveInstalledBrowser(paths, version);
  if (!existing) {
    throw new InstallError(`Camoufox version ${version} is not installed.`);
  }

  await rm(existing.rootDir, { recursive: true, force: true });
  await removeInstalledBrowser(paths, version);
  logger?.info('Removed Camoufox release', { version });
}

export async function doctorCamoufox(paths: CamoucliPaths): Promise<Record<string, unknown>> {
  const registry = await resolveInstalledBrowser(paths);
  return {
    platform: getPlatformTarget(),
    camoufoxCacheDir: paths.camoufoxCacheDir,
    installed: Boolean(registry),
    currentVersion: registry?.version,
    executablePath: registry?.executablePath,
    runtimeDir: paths.runtimeDir,
    socketPath: paths.daemonSocketPath,
    host: paths.daemonHost,
    port: paths.daemonPort,
  };
}
