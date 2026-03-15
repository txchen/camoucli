#!/usr/bin/env node
import { doctorCamoufox, inspectCamoufoxInstall, installCamoufox, removeCamoufox } from '../camoufox/installer.js';
import { listInstalledBrowsers, requireInstalledBrowser, resolveInstalledBrowser, setCurrentBrowser } from '../camoufox/registry.js';
import { ensureBasePaths, getCamoucliPaths } from '../state/paths.js';
import { BrowserNotInstalledError, getExitCode, type CamoucliError } from '../util/errors.js';
import { Logger } from '../util/log.js';
import { sendDaemonRequest } from '../ipc/client.js';
import { ensureDaemonRunning } from './daemon.js';
import { printOutput } from './output.js';
import { createProgram, type OutputOptions, type SharedOptions } from './program.js';

function getLogger(verbose = false): Logger {
  return new Logger({ name: 'cli', verbose, mirrorToStderr: verbose });
}

async function runDaemonAction(action: string, payload: Record<string, unknown>, options: SharedOptions): Promise<void> {
  const paths = getCamoucliPaths();
  await ensureBasePaths(paths);
  await ensureDaemonRunning(paths, options.verbose ?? false);
  const data = await sendDaemonRequest(paths, payload as never);
  printOutput(action, data, options.json ?? false);
}

async function main(): Promise<void> {
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
  });

  await program.parseAsync(process.argv);
}

main().catch((error: CamoucliError | Error | unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(getExitCode(error));
});
