import type { BrowserContext, Page } from 'playwright-core';

import type { LaunchInput, ResolvedLaunchConfig } from './camoufox/config.js';
import { launchPersistentCamoufox, preparePersistentCamoufoxLaunch, type PreparedPersistentCamoufoxLaunch } from './camoufox/launcher.js';
import { ensureBasePaths, getCamoucliPaths, type CamoucliPaths } from './state/paths.js';
import { Logger } from './util/log.js';

export interface LaunchCamoufoxOptions extends LaunchInput {
  session?: string | undefined;
  paths?: CamoucliPaths | undefined;
  verbose?: boolean | undefined;
}

export interface ResolvedCamoufoxLaunchSpec {
  sessionName: string;
  browserVersion: string;
  executablePath: string;
  profileDir: string;
  downloadsDir: string;
  artifactsDir: string;
  resolvedConfig: ResolvedLaunchConfig;
  userDataDir: string;
  launchOptions: PreparedPersistentCamoufoxLaunch['launchOptions'];
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

  async newPage(url?: string): Promise<Page> {
    const page = await this.context.newPage();
    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    }
    return page;
  }

  pages(): Page[] {
    return this.context.pages();
  }

  firstPage(): Page | undefined {
    return this.pages()[0];
  }

  async ensurePage(): Promise<Page> {
    return this.firstPage() ?? this.context.newPage();
  }

  async open(url: string, page?: Page): Promise<Page> {
    const targetPage = page ?? await this.ensurePage();
    await targetPage.goto(url, { waitUntil: 'domcontentloaded' });
    return targetPage;
  }

  async close(): Promise<void> {
    await this.context.close();
  }
}

export class Camoufox extends CamoufoxSession {
  static async launch(options: LaunchCamoufoxOptions = {}): Promise<Camoufox> {
    const session = await launchCamoufox(options);
    return new Camoufox({
      context: session.context,
      sessionName: session.sessionName,
      browserVersion: session.browserVersion,
      executablePath: session.executablePath,
      profileDir: session.profileDir,
      downloadsDir: session.downloadsDir,
      artifactsDir: session.artifactsDir,
      resolvedConfig: session.resolvedConfig,
    });
  }

  static async launchContext(options: LaunchCamoufoxOptions = {}): Promise<BrowserContext> {
    return launchCamoufoxContext(options);
  }

  static async resolveLaunch(options: LaunchCamoufoxOptions = {}): Promise<ResolvedCamoufoxLaunchSpec> {
    return resolveCamoufoxLaunchSpec(options);
  }

  static async with<T>(
    options: LaunchCamoufoxOptions,
    callback: (browser: Camoufox) => Promise<T> | T,
  ): Promise<T> {
    const browser = await Camoufox.launch(options);

    try {
      return await callback(browser);
    } finally {
      await browser.close();
    }
  }
}

export class AsyncCamoufox extends Camoufox {}

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

export async function resolveCamoufoxLaunchSpec(options: LaunchCamoufoxOptions = {}): Promise<ResolvedCamoufoxLaunchSpec> {
  const sessionName = options.session ?? 'default';
  const paths = options.paths ?? getCamoucliPaths();
  await ensureBasePaths(paths);

  const logger = createApiLogger(options.verbose);
  const prepared = await preparePersistentCamoufoxLaunch(paths, sessionName, options, logger);

  return {
    sessionName,
    browserVersion: prepared.browserVersion,
    executablePath: prepared.installPath,
    profileDir: prepared.sessionPaths.profileDir,
    downloadsDir: prepared.sessionPaths.downloadsDir,
    artifactsDir: prepared.sessionPaths.artifactsDir,
    resolvedConfig: prepared.resolvedConfig,
    userDataDir: prepared.userDataDir,
    launchOptions: prepared.launchOptions,
  };
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
