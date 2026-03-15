import { firefox, type BrowserContext } from 'playwright-core';

import type { CamoucliPaths, SessionPaths } from '../state/paths.js';
import { ensureSessionPaths } from '../state/paths.js';
import type { Logger } from '../util/log.js';
import { requireInstalledBrowser } from './registry.js';
import { buildCamouConfigEnv } from './env.js';
import { resolveLaunchConfig, type LaunchInput, type ResolvedLaunchConfig } from './config.js';

export interface LaunchedSession {
  context: BrowserContext;
  browserVersion: string;
  installPath: string;
  sessionPaths: SessionPaths;
  resolvedConfig: ResolvedLaunchConfig;
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
