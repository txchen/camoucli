import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import type { BrowserInstallRecord } from '../camoufox/registry.js';
import type { BrowserLaunchProbe } from '../camoufox/launcher.js';
import type { PlatformTarget } from '../util/platform.js';

const execFileAsync = promisify(execFile);

export interface DoctorBundleCheck {
  checkedFiles: string[];
  missingRequiredFiles: string[];
  missingOptionalFiles: string[];
}

export interface DoctorSharedLibraryCheck {
  supported: boolean;
  command?: string | undefined;
  checkedFiles: string[];
  missingLibraries: string[];
  notes: string[];
}

export interface DoctorVersionCheck {
  version: string;
  current: boolean;
  sourceRepo: string;
  path: string;
  launchable: boolean;
  error?: string | undefined;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function getOptionalBundleFiles(record: BrowserInstallRecord, platform: PlatformTarget): string[] {
  if (platform.os === 'lin') {
    return [path.join(record.rootDir, 'glxtest')];
  }

  return [];
}

export async function inspectBrowserBundle(
  record: BrowserInstallRecord | undefined,
  platform: PlatformTarget,
): Promise<DoctorBundleCheck> {
  if (!record) {
    return {
      checkedFiles: [],
      missingRequiredFiles: [],
      missingOptionalFiles: [],
    };
  }

  const requiredFiles = [record.executablePath];
  const optionalFiles = getOptionalBundleFiles(record, platform);

  const missingRequiredFiles = (
    await Promise.all(requiredFiles.map(async (filePath) => ((await exists(filePath)) ? undefined : filePath)))
  ).filter((item): item is string => Boolean(item));
  const missingOptionalFiles = (
    await Promise.all(optionalFiles.map(async (filePath) => ((await exists(filePath)) ? undefined : filePath)))
  ).filter((item): item is string => Boolean(item));

  return {
    checkedFiles: [...requiredFiles, ...optionalFiles],
    missingRequiredFiles,
    missingOptionalFiles,
  };
}

function parseMissingLibraries(output: string): string[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('=> not found'))
    .map((line) => line.split('=>')[0]?.trim() ?? '')
    .filter(Boolean);
}

async function runDependencyCommand(command: string, filePath: string): Promise<{ missingLibraries: string[]; note?: string | undefined }> {
  try {
    const { stdout, stderr } = await execFileAsync(command, [filePath]);
    return {
      missingLibraries: parseMissingLibraries(`${stdout}\n${stderr}`),
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {
        missingLibraries: [],
        note: `${command} is not available on this system.`,
      };
    }

    const stdout = typeof error === 'object' && error && 'stdout' in error ? String(error.stdout ?? '') : '';
    const stderr = typeof error === 'object' && error && 'stderr' in error ? String(error.stderr ?? '') : '';
    const parsed = parseMissingLibraries(`${stdout}\n${stderr}`);
    return {
      missingLibraries: parsed,
      note: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function inspectSharedLibraries(
  record: BrowserInstallRecord | undefined,
  platform: PlatformTarget,
): Promise<DoctorSharedLibraryCheck> {
  if (!record) {
    return {
      supported: false,
      checkedFiles: [],
      missingLibraries: [],
      notes: ['No installed browser available for dependency inspection.'],
    };
  }

  if (platform.os !== 'lin') {
    return {
      supported: false,
      checkedFiles: [record.executablePath],
      missingLibraries: [],
      notes: ['Shared library inspection is currently implemented for Linux only.'],
    };
  }

  const checkedFiles = [record.executablePath];
  const glxTestPath = path.join(record.rootDir, 'glxtest');
  if (await exists(glxTestPath)) {
    checkedFiles.push(glxTestPath);
  }

  const missingLibraries = new Set<string>();
  const notes: string[] = [];
  for (const filePath of checkedFiles) {
    const result = await runDependencyCommand('ldd', filePath);
    result.missingLibraries.forEach((library) => missingLibraries.add(library));
    if (result.note) {
      notes.push(`${path.basename(filePath)}: ${result.note}`);
    }
  }

  return {
    supported: true,
    command: 'ldd',
    checkedFiles,
    missingLibraries: [...missingLibraries].sort(),
    notes,
  };
}

export function buildDoctorHints(input: {
  platform: PlatformTarget;
  installed: boolean;
  currentVersion?: string | undefined;
  launchCheck?: BrowserLaunchProbe | undefined;
  bundleCheck: DoctorBundleCheck;
  sharedLibraryCheck: DoctorSharedLibraryCheck;
}): string[] {
  const hints: string[] = [];

  if (!input.installed) {
    hints.push('Run `camou install` to download a compatible Camoufox build.');
    return hints;
  }

  if (input.bundleCheck.missingRequiredFiles.length > 0) {
    hints.push('The current browser bundle is incomplete. Reinstall the selected Camoufox version with `camou install --force`.');
  }

  if (input.sharedLibraryCheck.missingLibraries.length > 0) {
    hints.push(`Install the missing shared libraries: ${input.sharedLibraryCheck.missingLibraries.join(', ')}.`);
    if (input.platform.os === 'lin') {
      hints.push('On Linux, use your distro package manager to install GUI/runtime libraries before launching Camoufox.');
    }
  }

  const launchMessage = input.launchCheck?.error?.message ?? '';
  if (/Browser\.setContrast/i.test(launchMessage)) {
    hints.push(
      `The current Camoufox build (${input.currentVersion ?? 'unknown'}) is older than the installed Playwright runtime. Switch to a newer browser build or downgrade playwright-core.`,
    );
  }

  if (/locked by another process|profile/i.test(launchMessage)) {
    hints.push('The selected profile is locked by another browser process. Stop the other browser or use a different session name.');
  }

  if (input.bundleCheck.missingOptionalFiles.length > 0 && input.platform.os === 'lin') {
    hints.push('Some optional helper binaries are missing from the bundle. Headless launch may still work, but reinstalling can improve diagnostics.');
  }

  if (hints.length === 0 && input.launchCheck?.success) {
    hints.push('The active Camoufox version looks healthy with the current Playwright runtime.');
  }

  return hints;
}

export function buildDoctorVersionChecks(input: {
  installedVersions: BrowserInstallRecord[];
  currentVersion?: string | undefined;
  probes: Map<string, BrowserLaunchProbe>;
}): DoctorVersionCheck[] {
  return input.installedVersions.map((install) => {
    const probe = input.probes.get(install.version);
    return {
      version: install.version,
      current: install.version === input.currentVersion,
      sourceRepo: install.sourceRepo,
      path: install.executablePath,
      launchable: probe?.success ?? false,
      error: probe?.error?.message,
    };
  });
}
