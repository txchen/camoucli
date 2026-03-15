import type { BrowserContext, Page } from 'playwright-core';

import type { LaunchInput, ResolvedLaunchConfig } from './camoufox/config.js';
import { launchPersistentCamoufox } from './camoufox/launcher.js';
import { ensureBasePaths, getCamoucliPaths, type CamoucliPaths } from './state/paths.js';
import { Logger } from './util/log.js';

export interface LaunchCamoufoxOptions extends LaunchInput {
  session?: string | undefined;
  paths?: CamoucliPaths | undefined;
  verbose?: boolean | undefined;
}

export class CamoufoxSession {
  readonly context: BrowserContext;
  readonly sessionName: string;
  readonly browserVersion: string;
  readonly executablePath: string;
  readonly profileDir: string;
  readonly downloadsDir: string;
  readonly artifactsDir: string;
  readonly resolvedConfig: ResolvedLaunchConfig;

  constructor(input: {
    context: BrowserContext;
    sessionName: string;
    browserVersion: string;
    executablePath: string;
    profileDir: string;
    downloadsDir: string;
    artifactsDir: string;
    resolvedConfig: ResolvedLaunchConfig;
  }) {
    this.context = input.context;
    this.sessionName = input.sessionName;
    this.browserVersion = input.browserVersion;
    this.executablePath = input.executablePath;
    this.profileDir = input.profileDir;
    this.downloadsDir = input.downloadsDir;
    this.artifactsDir = input.artifactsDir;
    this.resolvedConfig = input.resolvedConfig;
  }

  async newPage(): Promise<Page> {
    return this.context.newPage();
  }

  pages(): Page[] {
    return this.context.pages();
  }

  async close(): Promise<void> {
    await this.context.close();
  }
}

function createApiLogger(verbose = false): Logger | undefined {
  if (!verbose) {
    return undefined;
  }

  return new Logger({
    name: 'api',
    verbose: true,
    mirrorToStderr: true,
  });
}

export async function launchCamoufox(options: LaunchCamoufoxOptions = {}): Promise<CamoufoxSession> {
  const sessionName = options.session ?? 'default';
  const paths = options.paths ?? getCamoucliPaths();
  await ensureBasePaths(paths);

  const logger = createApiLogger(options.verbose);
  const launched = await launchPersistentCamoufox(paths, sessionName, options, logger);

  return new CamoufoxSession({
    context: launched.context,
    sessionName,
    browserVersion: launched.browserVersion,
    executablePath: launched.installPath,
    profileDir: launched.sessionPaths.profileDir,
    downloadsDir: launched.sessionPaths.downloadsDir,
    artifactsDir: launched.sessionPaths.artifactsDir,
    resolvedConfig: launched.resolvedConfig,
  });
}

export async function launchCamoufoxContext(options: LaunchCamoufoxOptions = {}): Promise<BrowserContext> {
  const session = await launchCamoufox(options);
  return session.context;
}

export async function withCamoufox<T>(
  options: LaunchCamoufoxOptions,
  callback: (session: CamoufoxSession) => Promise<T> | T,
): Promise<T> {
  const session = await launchCamoufox(options);

  try {
    return await callback(session);
  } finally {
    await session.close();
  }
}
