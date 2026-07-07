import { mkdtemp, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import { firefox, type BrowserContext } from 'playwright-core';

import type { CamoucliPaths, SessionPaths } from '../state/paths.js';
import { ensureSessionPaths, getSessionPaths } from '../state/paths.js';
import { resolveStateSnapshotPath } from '../state/states.js';
import { SessionError } from '../util/errors.js';
import type { Logger } from '../util/log.js';
import { requireInstalledBrowser, resolveInstalledBrowser } from './registry.js';
import { buildCamouConfigEnv } from './env.js';
import { resolveLaunchConfig, type LaunchInput, type ResolvedLaunchConfig } from './config.js';
import { validateCamouConfig } from './validation.js';

export interface LaunchedSession {
  context: BrowserContext;
  browserVersion: string;
  installPath: string;
  sessionPaths: SessionPaths;
  resolvedConfig: ResolvedLaunchConfig;
}

export interface PreparedPersistentCamoufoxLaunch {
  browserVersion: string;
  installPath: string;
  sessionPaths: SessionPaths;
  resolvedConfig: ResolvedLaunchConfig;
  userDataDir: string;
  launchOptions: Parameters<typeof firefox.launchPersistentContext>[1];
}

export interface BrowserLaunchProbe {
  attempted: boolean;
  success: boolean;
  version?: string | undefined;
  executablePath?: string | undefined;
  error?: {
    message: string;
  } | undefined;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function stripAnsi(input: string): string {
  return input.replace(/\u001B\[[0-9;]*m/g, '');
}

function summarizeLaunchError(error: unknown): string {
  const message = stripAnsi(error instanceof Error ? error.message : String(error));
  return (
    message
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) ?? 'Unknown launch error.'
  );
}

export async function launchPersistentCamoufox(
  paths: CamoucliPaths,
  sessionName: string,
  input: LaunchInput,
  logger?: Logger,
): Promise<LaunchedSession> {
  const prepared = await preparePersistentCamoufoxLaunch(paths, sessionName, input, logger);

  logger?.info('Launching persistent Camoufox session', {
    sessionName,
    executablePath: prepared.installPath,
    headless: prepared.resolvedConfig.headless,
  });

  try {
    const context = await firefox.launchPersistentContext(prepared.userDataDir, prepared.launchOptions);
    for (const initScript of prepared.resolvedConfig.initScripts) {
      await context.addInitScript(initScript);
    }

    return {
      context,
      browserVersion: prepared.browserVersion,
      installPath: prepared.installPath,
      sessionPaths: prepared.sessionPaths,
      resolvedConfig: prepared.resolvedConfig,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/profile|lock|in use|access denied/i.test(message)) {
      throw new SessionError(
        `Browser profile for session ${sessionName} appears to be locked by another process. Stop the other browser or use a different session name.`,
        { sessionName, profileDir: prepared.sessionPaths.profileDir },
        error,
      );
    }

    throw error;
  }
}

export async function preparePersistentCamoufoxLaunch(
  paths: CamoucliPaths,
  sessionName: string,
  input: LaunchInput,
  _logger?: Logger,
): Promise<PreparedPersistentCamoufoxLaunch> {
  const browser = await requireInstalledBrowser(paths, input.browser);
  const existingSessionPaths = getSessionPaths(paths, sessionName);
  if ((input.state !== undefined || input.storageState !== undefined) && await pathExists(existingSessionPaths.profileDir)) {
    throw new SessionError(
      `Launch-time state can only be applied to a new session profile. Remove profile ${existingSessionPaths.safeSessionName}, use a different session name, or omit state.`,
      { sessionName, profileDir: existingSessionPaths.profileDir },
    );
  }

  const sessionPaths = await ensureSessionPaths(paths, sessionName);
  const resolvedConfig = await resolveLaunchConfig(input);
  await validateCamouConfig(resolvedConfig.camouConfig, browser.rootDir);
  const storageState = input.state ? resolveStateSnapshotPath(paths, input.state) : resolvedConfig.storageState;

  const launchOptions: Parameters<typeof firefox.launchPersistentContext>[1] = {
    executablePath: browser.executablePath,
    headless: resolvedConfig.headless,
    env: buildCamouConfigEnv(resolvedConfig.camouConfig),
    firefoxUserPrefs: resolvedConfig.firefoxUserPrefs,
    downloadsPath: sessionPaths.downloadsDir,
    ...(resolvedConfig.proxy ? { proxy: resolvedConfig.proxy } : {}),
    ...(resolvedConfig.extraHTTPHeaders ? { extraHTTPHeaders: resolvedConfig.extraHTTPHeaders } : {}),
    ...(resolvedConfig.userAgent ? { userAgent: resolvedConfig.userAgent } : {}),
    ...(resolvedConfig.ignoreHTTPSErrors !== undefined ? { ignoreHTTPSErrors: resolvedConfig.ignoreHTTPSErrors } : {}),
    ...(resolvedConfig.colorScheme ? { colorScheme: resolvedConfig.colorScheme } : {}),
    ...(resolvedConfig.reducedMotion ? { reducedMotion: resolvedConfig.reducedMotion } : {}),
    ...(storageState !== undefined ? { storageState } : {}),
    ...(resolvedConfig.locale ? { locale: resolvedConfig.locale } : {}),
    ...(resolvedConfig.timezoneId ? { timezoneId: resolvedConfig.timezoneId } : {}),
    ...(resolvedConfig.viewport ? { viewport: resolvedConfig.viewport } : {}),
  };

  return {
    browserVersion: browser.version,
    installPath: browser.executablePath,
    sessionPaths,
    resolvedConfig,
    userDataDir: sessionPaths.profileDir,
    launchOptions,
  };
}

export async function probeCamoufoxLaunch(
  paths: CamoucliPaths,
  version?: string,
  logger?: Logger,
): Promise<BrowserLaunchProbe> {
  const browser = await resolveInstalledBrowser(paths, version);
  if (!browser) {
    return {
      attempted: false,
      success: false,
      error: {
        message: 'No installed Camoufox browser found.',
      },
    };
  }

  const profileDir = await mkdtemp(path.join(paths.camoufoxCacheDir, 'doctor-profile-'));

  try {
    logger?.info('Running Camoufox launch probe', {
      version: browser.version,
      executablePath: browser.executablePath,
    });

    const context = await firefox.launchPersistentContext(profileDir, {
      executablePath: browser.executablePath,
      headless: true,
      env: buildCamouConfigEnv({}),
      firefoxUserPrefs: {},
    });

    await context.close();

    return {
      attempted: true,
      success: true,
      version: browser.version,
      executablePath: browser.executablePath,
    };
  } catch (error) {
    return {
      attempted: true,
      success: false,
      version: browser.version,
      executablePath: browser.executablePath,
      error: {
        message: summarizeLaunchError(error),
      },
    };
  } finally {
    await rm(profileDir, { recursive: true, force: true });
  }
}
