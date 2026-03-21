#!/usr/bin/env node
import { CommanderError } from 'commander';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { doctorCamoufox, inspectCamoufoxInstall, installCamoufox, listRemoteCamoufoxReleases, removeCamoufox } from '../camoufox/installer.js';
import { describeFingerprintRegionProfiles, describeFingerprintScreenProfiles, describeFingerprintWindowProfiles } from '../camoufox/fingerprint.js';
import { listCamoufoxPresets } from '../camoufox/presets.js';
import { listInstalledBrowsers, requireInstalledBrowser, resolveInstalledBrowser, setCurrentBrowser } from '../camoufox/registry.js';
import { ensureBasePaths, getCamoucliPaths } from '../state/paths.js';
import { BrowserNotInstalledError, ValidationError, getExitCode, toErrorPayload, type CamoucliError } from '../util/errors.js';
import { Logger } from '../util/log.js';
import { sendDaemonRequest } from '../ipc/client.js';
import { ensureDaemonRunning, restartDaemon, stopDaemon } from './daemon.js';
import { applyCliDefaultsToPayload, resolveSharedOptions } from './defaults.js';
import { printOutput } from './output.js';
import { createProgram, type OutputOptions, type SharedOptions } from './program.js';

function getLogger(verbose = false): Logger {
  return new Logger({ name: 'cli', verbose, mirrorToStderr: verbose });
}

async function runDaemonAction(action: string, payload: Record<string, unknown>, options: SharedOptions): Promise<void> {
  const paths = getCamoucliPaths();
  await ensureBasePaths(paths);
  await ensureDaemonRunning(paths, options.verbose ?? false);
  const resolvedOptions = await resolveSharedOptions(options);
  const normalizedPayload = applyCliDefaultsToPayload(action, payload, resolvedOptions);
  const data = await sendDaemonRequest(paths, normalizedPayload as never);
  printOutput(action, data, options.json ?? false);
}

function wantsJsonOutput(argv: string[]): boolean {
  return argv.includes('--json');
}

function normalizeCliError(error: unknown): unknown {
  if (error instanceof CommanderError) {
    return new ValidationError(error.message.replace(/^error:\s*/i, '').trim() || 'Invalid command input.');
  }

  return error;
}

function printCliError(error: unknown, asJson: boolean): void {
  const normalized = normalizeCliError(error);
  if (asJson) {
    process.stderr.write(
      `${JSON.stringify(
        {
          success: false,
          error: toErrorPayload(normalized),
          exitCode: getExitCode(normalized),
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  process.stderr.write(`${normalized instanceof Error ? normalized.message : String(normalized)}\n`);
}

export async function main(argv: string[] = process.argv): Promise<number> {
  const asJson = wantsJsonOutput(argv);
  const program = createProgram({
    onInstall: async (version: string | undefined, options: OutputOptions) => {
        const paths = getCamoucliPaths();
        const logger = getLogger(options.verbose);
        await ensureBasePaths(paths);
        const installOptions = {
          ...(version ? { version } : {}),
          ...(options.force !== undefined ? { force: options.force } : {}),
          logger,
        };
        const release = await installCamoufox(paths, installOptions);
        const inspection = await inspectCamoufoxInstall(paths, release.version, logger);
        printOutput(
          'install',
          {
            version: release.version,
            tag: release.tag,
            playwrightCoreVersion: inspection.playwrightCoreVersion,
            launchCheck: inspection.launchCheck,
          },
          options.json ?? false,
        );
    },
    onRemove: async (version: string | undefined, options: OutputOptions) => {
        const paths = getCamoucliPaths();
        const logger = getLogger(options.verbose);
        const installed = version ? await resolveInstalledBrowser(paths, version) : await resolveInstalledBrowser(paths);
        if (!installed) {
          throw new BrowserNotInstalledError('No installed Camoufox version found to remove.');
        }
        await removeCamoufox(paths, installed.version, logger);
        printOutput('remove', { removed: installed.version }, options.json ?? false);
    },
    onUse: async (version: string, options: OutputOptions) => {
        const paths = getCamoucliPaths();
        const logger = getLogger(options.verbose);
        await ensureBasePaths(paths);
        const registry = await setCurrentBrowser(paths, version);
        const selectedVersion = registry.currentVersion ?? version;
        const selected = await requireInstalledBrowser(paths, selectedVersion);
        const inspection = await inspectCamoufoxInstall(paths, selected.version, logger);
        printOutput(
          'use',
          {
            version: selected.version,
            path: selected.executablePath,
            playwrightCoreVersion: inspection.playwrightCoreVersion,
            launchCheck: inspection.launchCheck,
          },
          options.json ?? false,
        );
    },
    onVersions: async (options: OutputOptions) => {
        const paths = getCamoucliPaths();
        await ensureBasePaths(paths);
        const installedBrowsers = await listInstalledBrowsers(paths);
        printOutput(
          'versions',
          {
            currentVersion: installedBrowsers.currentVersion,
            installedVersions: installedBrowsers.installs.map((install) => ({
              version: install.version,
              current: install.version === installedBrowsers.currentVersion,
              sourceRepo: install.sourceRepo,
              path: install.executablePath,
            })),
          },
          options.json ?? false,
        );
    },
    onRemoteVersions: async (options: OutputOptions) => {
        const paths = getCamoucliPaths();
        await ensureBasePaths(paths);
        const [installedBrowsers, remoteVersions] = await Promise.all([
          listInstalledBrowsers(paths),
          listRemoteCamoufoxReleases(),
        ]);
        const installedVersions = new Set(installedBrowsers.installs.map((install) => install.version));
        printOutput(
          'remote-versions',
          {
            remoteVersions: remoteVersions.map((release) => ({
              version: release.version,
              tag: release.tag,
              repo: release.repo,
              prerelease: release.prerelease,
              installed: installedVersions.has(release.version),
              current: release.version === installedBrowsers.currentVersion,
            })),
          },
          options.json ?? false,
        );
    },
    onPresets: async (options: OutputOptions) => {
        printOutput(
          'presets',
          {
            presets: listCamoufoxPresets().map((preset) => ({
              name: preset.name,
              description: preset.description,
            })),
          },
          options.json ?? false,
        );
    },
    onFingerprintProfiles: async (options: OutputOptions) => {
        printOutput(
          'fingerprint-profiles',
          {
            screenProfiles: describeFingerprintScreenProfiles(),
            windowProfiles: describeFingerprintWindowProfiles(),
            regionProfiles: describeFingerprintRegionProfiles(),
          },
          options.json ?? false,
        );
    },
    onPath: async (options: OutputOptions) => {
        const browser = await requireInstalledBrowser(getCamoucliPaths());
        printOutput('path', { path: browser.executablePath }, options.json ?? false);
    },
    onVersion: async (options: OutputOptions) => {
        const browser = await requireInstalledBrowser(getCamoucliPaths());
        printOutput('version', { version: browser.version }, options.json ?? false);
    },
    onDoctor: async (options: OutputOptions) => {
        const paths = getCamoucliPaths();
        const logger = getLogger(options.verbose);
        await ensureBasePaths(paths);
        const data = await doctorCamoufox(paths, logger);
        printOutput('doctor', data, options.json ?? false);
    },
    onDaemonAction: runDaemonAction,
    onDaemonStop: async (options: OutputOptions) => {
        const paths = getCamoucliPaths();
        await ensureBasePaths(paths);
        const data = await stopDaemon(paths);
        printOutput('daemon.stop', data, options.json ?? false);
    },
    onDaemonRestart: async (options: OutputOptions) => {
        const paths = getCamoucliPaths();
        await ensureBasePaths(paths);
        const data = await restartDaemon(paths, options.verbose ?? false);
        printOutput('daemon.restart', data, options.json ?? false);
    },
  }, { quietErrors: asJson });

  try {
    await program.parseAsync(argv);
    return 0;
  } catch (error) {
    if (
      error instanceof CommanderError &&
      (error.code === 'commander.helpDisplayed' || error.code === 'commander.help' || error.code === 'commander.version')
    ) {
      return 0;
    }

    printCliError(error, asJson);
    return getExitCode(normalizeCliError(error));
  }
}

function isEntrypoint(): boolean {
  const entryPath = process.argv[1];
  if (!entryPath) {
    return false;
  }

  try {
    const currentFilePath = realpathSync(new URL(import.meta.url));
    const entryFilePath = realpathSync(entryPath);
    return currentFilePath === entryFilePath;
  } catch {
    return import.meta.url === pathToFileURL(entryPath).href;
  }
}

if (isEntrypoint()) {
  main().then((exitCode) => {
    process.exit(exitCode);
  }).catch((error: CamoucliError | Error | unknown) => {
    printCliError(error, wantsJsonOutput(process.argv));
    process.exit(getExitCode(normalizeCliError(error)));
  });
}
