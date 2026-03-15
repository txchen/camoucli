import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';

import { firefox, type BrowserContext } from 'playwright-core';

import type { CamoucliPaths, SessionPaths } from '../state/paths.js';
import { ensureSessionPaths } from '../state/paths.js';
import type { Logger } from '../util/log.js';
import { requireInstalledBrowser, resolveInstalledBrowser } from './registry.js';
import { buildCamouConfigEnv } from './env.js';
import { resolveLaunchConfig, type LaunchInput, type ResolvedLaunchConfig } from './config.js';

export interface LaunchedSession {
  context: BrowserContext;
  browserVersion: string;
  installPath: string;
  sessionPaths: SessionPaths;
  resolvedConfig: ResolvedLaunchConfig;
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
  const browser = await requireInstalledBrowser(paths);
  const sessionPaths = await ensureSessionPaths(paths, sessionName);
  const resolvedConfig = await resolveLaunchConfig(input);

  const options: Parameters<typeof firefox.launchPersistentContext>[1] = {
    executablePath: browser.executablePath,
    headless: resolvedConfig.headless,
    env: buildCamouConfigEnv(resolvedConfig.camouConfig),
    firefoxUserPrefs: resolvedConfig.firefoxUserPrefs,
    downloadsPath: sessionPaths.downloadsDir,
    ...(resolvedConfig.proxy ? { proxy: resolvedConfig.proxy } : {}),
    ...(resolvedConfig.locale ? { locale: resolvedConfig.locale } : {}),
    ...(resolvedConfig.timezoneId ? { timezoneId: resolvedConfig.timezoneId } : {}),
    ...(resolvedConfig.viewport ? { viewport: resolvedConfig.viewport } : {}),
  };

  logger?.info('Launching persistent Camoufox session', {
    sessionName,
    executablePath: browser.executablePath,
    headless: resolvedConfig.headless,
  });

  const context = await firefox.launchPersistentContext(sessionPaths.profileDir, options);

  return {
    context,
    browserVersion: browser.version,
    installPath: browser.executablePath,
    sessionPaths,
    resolvedConfig,
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
