import { UnsupportedPlatformError } from './errors.js';

export type PlatformOs = 'lin' | 'mac' | 'win';
export type PlatformArch = 'x86_64' | 'arm64' | 'i686';

export interface PlatformTarget {
  os: PlatformOs;
  arch: PlatformArch;
  assetSuffix: `${PlatformOs}.${PlatformArch}`;
  executableRelativePath: string;
}

const OS_MAP: Record<string, PlatformOs | undefined> = {
  linux: 'lin',
  darwin: 'mac',
  win32: 'win',
};

const ARCH_MAP: Record<string, PlatformArch | undefined> = {
  x64: 'x86_64',
  x86: 'x86_64',
  ia32: 'i686',
  arm64: 'arm64',
  arm: 'arm64',
};

const EXECUTABLE_RELATIVE_PATHS: Record<PlatformOs, string> = {
  lin: 'camoufox-bin',
  mac: 'Camoufox.app/Contents/MacOS/camoufox',
  win: 'camoufox.exe',
};

export function getPlatformTarget(
  platform: NodeJS.Platform = process.platform,
  architecture: string = process.arch,
): PlatformTarget {
  const os = OS_MAP[platform];
  if (!os) {
    throw new UnsupportedPlatformError(`Unsupported platform: ${platform}`);
  }

  const arch = ARCH_MAP[architecture];
  if (!arch) {
    throw new UnsupportedPlatformError(`Unsupported architecture: ${architecture}`);
  }

  return {
    os,
    arch,
    assetSuffix: `${os}.${arch}`,
    executableRelativePath: EXECUTABLE_RELATIVE_PATHS[os],
  };
}

export function isWindows(platform: NodeJS.Platform = process.platform): boolean {
  return platform === 'win32';
}

export function normalizeReleaseVersion(version: string): string {
  return version.startsWith('v') ? version.slice(1) : version;
}

export function buildExpectedAssetName(version: string, target = getPlatformTarget()): string {
  return `camoufox-${normalizeReleaseVersion(version)}-${target.assetSuffix}.zip`;
}
