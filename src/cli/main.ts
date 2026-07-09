#!/usr/bin/env node
import { CommanderError } from 'commander';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { doctorCamoufox, inspectCamoufoxInstall, installCamoufox, listRemoteCamoufoxReleases, removeCamoufox } from '../camoufox/installer.js';
import { describeFingerprintRegionProfiles, describeFingerprintScreenProfiles, describeFingerprintWindowProfiles } from '../camoufox/fingerprint.js';
import { listCamoufoxPresets } from '../camoufox/presets.js';
import { listInstalledBrowsers, requireInstalledBrowser, resolveInstalledBrowser, setCurrentBrowser } from '../camoufox/registry.js';
import { inspectStoppedSessionInfo } from '../state/session-profiles.js';
import { ensureBasePaths, getCamoucliPaths } from '../state/paths.js';
import { BrowserNotInstalledError, ValidationError, getExitCode, toErrorPayload, type CamoucliError } from '../util/errors.js';
import { getLogger } from '../util/log.js';
import { getDaemonStatus, sendDaemonRequest } from '../ipc/client.js';
import { executeBatchCommands } from './batch.js';
import { cleanupDaemon, ensureDaemonRunning, restartDaemon, stopDaemon } from './daemon.js';
import { applyCliDefaultsToPayload, resolveSharedOptions } from './defaults.js';
import { printOutput } from './output.js';
import { createProgram, type BatchCommandSpec, type OutputOptions, type SharedOptions } from './program.js';
import { resolveSessionId, type SessionIdScope } from './session.js';
import { SkillsCommandError, executeSkillsCommand, formatSkillsError } from './skills.js';

async function runDaemonActionData(action: string, payload: Record<string, unknown>, options: SharedOptions): Promise<unknown> {
  const paths = getCamoucliPaths();
  await ensureBasePaths(paths);
  await ensureDaemonRunning(paths, options.verbose ?? false);
  const resolvedOptions = await resolveSharedOptions(options);
  const normalizedPayload = applyCliDefaultsToPayload(action, payload, resolvedOptions);
  return await sendDaemonRequest(paths, normalizedPayload as never);
}

async function runDaemonAction(action: string, payload: Record<string, unknown>, options: SharedOptions): Promise<void> {
  const data = await runDaemonActionData(action, payload, options);
  printOutput(action, data, options.json ?? false);
}

async function runBatch(commands: BatchCommandSpec[], options: SharedOptions): Promise<void> {
  const result = await executeBatchCommands(commands, options, runDaemonActionData);
  printOutput('batch', result, options.json ?? false);
}

async function runSessionCurrent(options: SharedOptions): Promise<void> {
  const resolvedOptions = await resolveSharedOptions(options);
  printOutput('session.current', { sessionName: resolvedOptions.session }, options.json ?? false);
}

async function runSessionId(options: OutputOptions & { scope?: SessionIdScope | undefined; prefix?: string | undefined }): Promise<void> {
  if (options.scope && !['worktree', 'cwd', 'git-root'].includes(options.scope)) {
    throw new ValidationError('session id --scope must be one of: worktree, cwd, git-root.');
  }
  const sessionName = await resolveSessionId({ scope: options.scope, prefix: options.prefix });
  printOutput('session.id', { sessionName }, options.json ?? false);
}

async function runSessionInfo(options: SharedOptions): Promise<void> {
  const paths = getCamoucliPaths();
  await ensureBasePaths(paths);
  const resolvedOptions = await resolveSharedOptions(options);
  const status = await getDaemonStatus(paths);
  if (status) {
    const data = await sendDaemonRequest(paths, { action: 'session.info', session: resolvedOptions.session } as never);
    printOutput('session.info', data, options.json ?? false);
    return;
  }

  printOutput(
    'session.info',
    {
      daemon: { running: false },
      ...(await inspectStoppedSessionInfo(paths, resolvedOptions.session)),
    },
    options.json ?? false,
  );
}

function wantsJsonOutput(argv: string[]): boolean {
  return argv.includes('--json');
}

function normalizeSkillsJsonArgv(argv: string[]): string[] {
  if (argv[2] === '--json' && argv[3] === 'skills') {
    return [argv[0] ?? 'node', argv[1] ?? 'camou', 'skills', '--json', ...argv.slice(4)];
  }

  return argv;
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

function printSkillsCommandError(error: SkillsCommandError): void {
  const result = formatSkillsError(error);
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

export async function main(argv: string[] = process.argv): Promise<number> {
  const asJson = wantsJsonOutput(argv);
  const normalizedArgv = normalizeSkillsJsonArgv(argv);
  const program = createProgram({
    onInstall: async (version: string | undefined, options: OutputOptions) => {
        const paths = getCamoucliPaths();
        const logger = getLogger({ name: 'cli', verbose: options.verbose ?? false });
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
            releaseVersion: release.releaseVersion,
            assetVersion: release.assetVersion,
            playwrightCoreVersion: inspection.playwrightCoreVersion,
            launchCheck: inspection.launchCheck,
          },
          options.json ?? false,
        );
    },
    onRemove: async (version: string | undefined, options: OutputOptions) => {
        const paths = getCamoucliPaths();
        const logger = getLogger({ name: 'cli', verbose: options.verbose ?? false });
        const installed = version ? await resolveInstalledBrowser(paths, version) : await resolveInstalledBrowser(paths);
        if (!installed) {
          throw new BrowserNotInstalledError('No installed Camoufox version found to remove.');
        }
        await removeCamoufox(paths, installed.version, logger);
        printOutput('remove', { removed: installed.version }, options.json ?? false);
    },
    onUse: async (version: string, options: OutputOptions) => {
        const paths = getCamoucliPaths();
        const logger = getLogger({ name: 'cli', verbose: options.verbose ?? false });
        await ensureBasePaths(paths);
        const registry = await setCurrentBrowser(paths, version);
        const selectedVersion = registry.currentVersion ?? version;
        const selected = await requireInstalledBrowser(paths, selectedVersion);
        const inspection = await inspectCamoufoxInstall(paths, selected.version, logger);
        printOutput(
          'use',
          {
            version: selected.version,
            releaseVersion: selected.releaseVersion,
            assetVersion: selected.assetVersion,
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
              releaseVersion: install.releaseVersion,
              assetVersion: install.assetVersion,
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
              releaseVersion: release.releaseVersion,
              assetVersion: release.assetVersion,
              repo: release.repo,
              prerelease: release.prerelease,
              installed: installedVersions.has(release.version) || installedVersions.has(release.assetVersion),
              current:
                release.version === installedBrowsers.currentVersion ||
                release.assetVersion === installedBrowsers.currentVersion,
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
        const logger = getLogger({ name: 'cli', verbose: options.verbose ?? false });
        await ensureBasePaths(paths);
        const data = await doctorCamoufox(paths, logger);
        printOutput('doctor', data, options.json ?? false);
    },
    onDaemonAction: runDaemonAction,
    onBatch: runBatch,
    onSessionCurrent: runSessionCurrent,
    onSessionId: runSessionId,
    onSessionInfo: runSessionInfo,
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
    onDaemonCleanup: async (options: OutputOptions) => {
        const paths = getCamoucliPaths();
        await ensureBasePaths(paths);
        const data = await cleanupDaemon(paths);
        printOutput('daemon.cleanup', data, options.json ?? false);
    },
    onSkills: async (args, options) => {
        const result = executeSkillsCommand(args, options);
        if (result.stdout) {
          process.stdout.write(result.stdout);
        }
        if (result.stderr) {
          process.stderr.write(result.stderr);
        }
    },
  }, { quietErrors: asJson });

  try {
    await program.parseAsync(normalizedArgv);
    return 0;
  } catch (error) {
    if (
      error instanceof CommanderError &&
      (error.code === 'commander.helpDisplayed' || error.code === 'commander.help' || error.code === 'commander.version')
    ) {
      return 0;
    }

    if (error instanceof SkillsCommandError) {
      printSkillsCommandError(error);
      return 1;
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
    if (error instanceof SkillsCommandError) {
      printSkillsCommandError(error);
      process.exit(1);
    }
    printCliError(error, wantsJsonOutput(process.argv));
    process.exit(getExitCode(normalizeCliError(error)));
  });
}
