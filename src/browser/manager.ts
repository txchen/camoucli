import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

import type { Page } from 'playwright-core';

import { hasLaunchFingerprintHelpers, type LaunchInput } from '../camoufox/config.js';
import { launchPersistentCamoufox } from '../camoufox/launcher.js';
import type { CamoucliPaths } from '../state/paths.js';
import { inspectStoredSessionProfile, listStoredSessionProfiles, removeStoredSessionProfile } from '../state/session-profiles.js';
import { SessionError, ValidationError } from '../util/errors.js';
import type { Logger } from '../util/log.js';
import { locatorForTarget } from './actions.js';
import { clearSnapshotRefs, takeSnapshot } from './snapshot.js';
import { createTabRuntime, type SessionRuntime, type TabRuntime } from './tabs.js';

interface BrowserManagerOptions {
  paths: CamoucliPaths;
  logger: Logger;
}

export class BrowserManager {
  private readonly paths: CamoucliPaths;
  private readonly logger: Logger;
  private readonly sessions = new Map<string, SessionRuntime>();
  private readonly startingSessions = new Map<string, Promise<SessionRuntime>>();

  constructor(options: BrowserManagerOptions) {
    this.paths = options.paths;
    this.logger = options.logger;
  }

  async listSessions(): Promise<Array<Record<string, unknown>>> {
    return Array.from(this.sessions.values()).map((session) => ({
      sessionName: session.name,
      status: session.status,
      browserVersion: session.browserVersion,
      profileDir: session.paths.profileDir,
      downloadsDir: session.paths.downloadsDir,
      artifactsDir: session.paths.artifactsDir,
      headless: session.resolvedConfig.headless,
      tabs: Array.from(session.tabs.values()).map((tab) => ({
        tabName: tab.name,
        url: tab.page.url(),
      })),
    }));
  }

  async stopSession(sessionName: string): Promise<{ stopped: boolean; sessionName: string }> {
    const session = this.sessions.get(sessionName);
    if (!session) {
      return { stopped: false, sessionName };
    }

    await session.context.close();
    this.sessions.delete(sessionName);
    this.logger.info('Stopped browser session', { sessionName });
    return { stopped: true, sessionName };
  }

  async stopAllSessions(): Promise<{ stopped: number; sessionNames: string[] }> {
    const sessionNames = Array.from(this.sessions.keys());
    await Promise.all(sessionNames.map((sessionName) => this.stopSession(sessionName)));
    return { stopped: sessionNames.length, sessionNames };
  }

  async listStoredProfiles(): Promise<Array<Record<string, unknown>>> {
    const storedProfiles = await listStoredSessionProfiles(this.paths);
    const runningSessions = new Map(Array.from(this.sessions.values()).map((session) => [session.paths.safeSessionName, session]));

    return storedProfiles.map((profile) => {
      const runningSession = runningSessions.get(profile.profileName);
      return {
        ...profile,
        running: Boolean(runningSession),
        ...(runningSession
          ? {
              sessionName: runningSession.name,
              status: runningSession.status,
              browserVersion: runningSession.browserVersion,
              headless: runningSession.resolvedConfig.headless,
              tabs: Array.from(runningSession.tabs.values()).map((tab) => ({ tabName: tab.name, url: tab.page.url() })),
            }
          : {}),
      };
    });
  }

  async inspectStoredProfile(profileName: string): Promise<Record<string, unknown>> {
    const record = await inspectStoredSessionProfile(this.paths, profileName);
    if (!record.found) {
      return {
        profileName: record.profileName,
        found: false,
        running: false,
        rootDir: record.rootDir,
      };
    }

    const runningSession = this.findRunningSessionByProfileName(record.profileName);
    return {
      ...record,
      running: Boolean(runningSession),
      ...(runningSession
        ? {
            sessionName: runningSession.name,
            status: runningSession.status,
            browserVersion: runningSession.browserVersion,
            headless: runningSession.resolvedConfig.headless,
            tabs: Array.from(runningSession.tabs.values()).map((tab) => ({ tabName: tab.name, url: tab.page.url() })),
          }
        : {}),
    };
  }

  async removeStoredProfile(profileName: string): Promise<Record<string, unknown>> {
    const safeProfileName = this.findRunningSessionByProfileName(profileName)?.paths.safeSessionName;
    const runningSession = this.findRunningSessionByProfileName(profileName);
    const stopped = runningSession ? (await this.stopSession(runningSession.name)).stopped : false;
    const removed = await removeStoredSessionProfile(this.paths, safeProfileName ?? profileName);
    return {
      ...removed,
      stopped,
    };
  }

  async open(input: LaunchInput & { session: string; tabName: string; url: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.goto(input.url, { waitUntil: 'domcontentloaded' });
    return {
      sessionName: input.session,
      tabName: tab.name,
      url: tab.page.url(),
      title: await tab.page.title(),
    };
  }

  async back(input: LaunchInput & { session: string; tabName: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => null);
    return {
      sessionName: input.session,
      tabName: tab.name,
      url: tab.page.url(),
      title: await tab.page.title(),
    };
  }

  async forward(input: LaunchInput & { session: string; tabName: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.goForward({ waitUntil: 'domcontentloaded' }).catch(() => null);
    return {
      sessionName: input.session,
      tabName: tab.name,
      url: tab.page.url(),
      title: await tab.page.title(),
    };
  }

  async reload(input: LaunchInput & { session: string; tabName: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.reload({ waitUntil: 'domcontentloaded' });
    return {
      sessionName: input.session,
      tabName: tab.name,
      url: tab.page.url(),
      title: await tab.page.title(),
    };
  }

  async snapshot(input: LaunchInput & { session: string; tabName: string; interactive: boolean }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const result = await takeSnapshot(tab.page, input.interactive);
    tab.lastSnapshot = result;
    tab.refMap = new Map(Object.entries(result.refs));
    return {
      sessionName: input.session,
      tabName: tab.name,
      interactive: input.interactive,
      count: result.entries.length,
      snapshot: result.text,
      entries: result.entries,
    };
  }

  async click(input: LaunchInput & { session: string; tabName: string; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).click();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      url: tab.page.url(),
    };
  }

  async hover(input: LaunchInput & { session: string; tabName: string; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).hover();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
    };
  }

  async fill(input: LaunchInput & { session: string; tabName: string; target: string; text: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).fill(input.text);
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      valueLength: input.text.length,
    };
  }

  async type(input: LaunchInput & { session: string; tabName: string; target: string; text: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).type(input.text);
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      valueLength: input.text.length,
    };
  }

  async check(input: LaunchInput & { session: string; tabName: string; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).check();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      checked: true,
    };
  }

  async uncheck(input: LaunchInput & { session: string; tabName: string; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).uncheck();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      checked: false,
    };
  }

  async select(input: LaunchInput & { session: string; tabName: string; target: string; value: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).selectOption(input.value);
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      value: input.value,
    };
  }

  async press(input: LaunchInput & { session: string; tabName: string; key: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.keyboard.press(input.key);
    return {
      sessionName: input.session,
      tabName: tab.name,
      key: input.key,
    };
  }

  async scroll(
    input: LaunchInput & { session: string; tabName: string; direction: 'up' | 'down' | 'left' | 'right'; amount?: number | undefined },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const amount = input.amount ?? 500;
    const delta =
      input.direction === 'up'
        ? { x: 0, y: -amount }
        : input.direction === 'down'
          ? { x: 0, y: amount }
          : input.direction === 'left'
            ? { x: -amount, y: 0 }
            : { x: amount, y: 0 };

    await tab.page.mouse.wheel(delta.x, delta.y);
    return {
      sessionName: input.session,
      tabName: tab.name,
      direction: input.direction,
      amount,
      url: tab.page.url(),
    };
  }

  async scrollIntoView(input: LaunchInput & { session: string; tabName: string; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).scrollIntoViewIfNeeded();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
    };
  }

  async eval(input: LaunchInput & { session: string; tabName: string; expression: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    return {
      sessionName: input.session,
      tabName: tab.name,
      expression: input.expression,
      result: await tab.page.evaluate(() => undefined, input.expression),
    };
  }

  async screenshot(
    input: LaunchInput & { session: string; tabName: string; path?: string | undefined },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const session = await this.ensureSession(input.session, input);
    const filePath = input.path ?? path.join(session.paths.artifactsDir, `${tab.name}-${Date.now()}.png`);
    await tab.page.screenshot({ path: filePath, fullPage: true });
    return {
      sessionName: input.session,
      tabName: tab.name,
      path: filePath,
    };
  }

  async getUrl(input: LaunchInput & { session: string; tabName: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    return {
      sessionName: input.session,
      tabName: tab.name,
      url: tab.page.url(),
    };
  }

  async getTitle(input: LaunchInput & { session: string; tabName: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    return {
      sessionName: input.session,
      tabName: tab.name,
      title: await tab.page.title(),
    };
  }

  async getText(input: LaunchInput & { session: string; tabName: string; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const text = await locatorForTarget(tab.page, tab, input.target).innerText();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      text,
    };
  }

  async exportCookies(input: { session: string; path?: string | undefined }): Promise<Record<string, unknown>> {
    const session = await this.ensureSession(input.session, {});
    const cookies = await session.context.cookies();
    if (input.path) {
      await writeFile(input.path, `${JSON.stringify(cookies, null, 2)}
`, 'utf8');
      return { sessionName: session.name, count: cookies.length, path: input.path };
    }
    return { sessionName: session.name, count: cookies.length, cookies };
  }

  async importCookies(input: { session: string; path: string }): Promise<Record<string, unknown>> {
    const session = await this.ensureSession(input.session, {});
    const cookies = JSON.parse(await readFile(input.path, 'utf8')) as Array<Record<string, unknown>>;
    await session.context.addCookies(cookies as never);
    return { sessionName: session.name, imported: cookies.length, path: input.path };
  }

  async getValue(input: LaunchInput & { session: string; tabName: string; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const value = await locatorForTarget(tab.page, tab, input.target).inputValue();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      value,
    };
  }

  async wait(
    input: LaunchInput & { session: string; tabName: string; target?: string | undefined; text?: string | undefined; loadState?: 'domcontentloaded' | 'load' | 'networkidle' | undefined; timeoutMs?: number | undefined },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    if (!input.target && !input.text && !input.loadState) {
      throw new ValidationError('wait requires a target, --text value, or --load state.');
    }

    const waitOptions = input.timeoutMs ? { timeout: input.timeoutMs } : undefined;
    if (input.target) {
      await locatorForTarget(tab.page, tab, input.target).waitFor(waitOptions);
    }

    if (input.text) {
      await tab.page.getByText(input.text).first().waitFor(waitOptions);
    }

    if (input.loadState) {
      await tab.page.waitForLoadState(input.loadState, waitOptions);
    }

    return {
      sessionName: input.session,
      tabName: tab.name,
      ...(input.target ? { target: input.target } : {}),
      ...(input.text ? { text: input.text } : {}),
      ...(input.loadState ? { loadState: input.loadState } : {}),
      url: tab.page.url(),
    };
  }

  async listTabs(sessionName: string): Promise<Array<Record<string, unknown>>> {
    const session = await this.ensureSession(sessionName, { headless: false });
    return Promise.all(
      Array.from(session.tabs.values()).map(async (tab, index) => ({
        index,
        tabName: tab.name,
        url: tab.page.url(),
        title: tab.page.isClosed() ? '' : await tab.page.title(),
      })),
    );
  }

  async newTab(
    input: LaunchInput & { session: string; tabName: string; url?: string | undefined },
  ): Promise<Record<string, unknown>> {
    const session = await this.ensureSession(input.session, input);
    if (session.tabs.has(input.tabName)) {
      throw new SessionError(`Tab ${input.tabName} already exists in session ${input.session}.`);
    }

    const page = await session.context.newPage();
    const tab = this.trackPage(session, input.tabName, page);
    if (input.url) {
      await page.goto(input.url, { waitUntil: 'domcontentloaded' });
    }

    return {
      sessionName: input.session,
      tabName: tab.name,
      url: page.url(),
    };
  }

  async closeTab(sessionName: string, target: string): Promise<{ closed: boolean; tabName?: string; target: string }> {
    const session = this.sessions.get(sessionName);
    if (!session) {
      return { closed: false, target };
    }

    const tab = this.findTab(session, target);
    if (!tab) {
      return { closed: false, target };
    }

    await tab.page.close();
    session.tabs.delete(tab.name);
    return {
      closed: true,
      tabName: tab.name,
      target,
    };
  }

  private async ensureSession(sessionName: string, input: LaunchInput): Promise<SessionRuntime> {
    const existing = this.sessions.get(sessionName);
    if (existing) {
      this.assertSessionCompatible(existing, input);
      return existing;
    }

    const inFlight = this.startingSessions.get(sessionName);
    if (inFlight) {
      return inFlight;
    }

    const startPromise = (async () => {
      const launched = await launchPersistentCamoufox(this.paths, sessionName, input, this.logger);
      const session: SessionRuntime = {
        name: sessionName,
        status: 'running',
        context: launched.context,
        tabs: new Map<string, TabRuntime>(),
        browserVersion: launched.browserVersion,
        installPath: launched.installPath,
        paths: launched.sessionPaths,
        resolvedConfig: launched.resolvedConfig,
        launchInput: input,
        startedAt: new Date().toISOString(),
      };

      const pages = session.context.pages();
      if (pages.length === 0) {
        const page = await session.context.newPage();
        this.trackPage(session, 'main', page);
      } else {
        pages.forEach((page, index) => {
          this.trackPage(session, index === 0 ? 'main' : `restored-${index + 1}`, page);
        });
      }

      session.context.on('close', () => {
        session.status = 'stopped';
        this.sessions.delete(session.name);
      });

      this.sessions.set(sessionName, session);
      this.logger.info('Started browser session', { sessionName, browserVersion: session.browserVersion });
      return session;
    })();

    this.startingSessions.set(sessionName, startPromise);

    try {
      return await startPromise;
    } catch (error) {
      this.logger.error('Failed to start browser session', { sessionName, error: String(error) });
      throw error;
    } finally {
      this.startingSessions.delete(sessionName);
    }
  }

  private async ensureTab(sessionName: string, tabName: string, input: LaunchInput): Promise<TabRuntime> {
    const session = await this.ensureSession(sessionName, input);
    const existing = session.tabs.get(tabName);
    if (existing && !existing.page.isClosed()) {
      return existing;
    }

    if (existing?.page.isClosed()) {
      session.tabs.delete(tabName);
    }

    const page = await session.context.newPage();
    return this.trackPage(session, tabName, page);
  }

  private findRunningSessionByProfileName(profileName: string): SessionRuntime | undefined {
    const normalizedProfileName = profileName.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'default';
    return Array.from(this.sessions.values()).find((session) => session.paths.safeSessionName === normalizedProfileName);
  }

  private assertSessionCompatible(session: SessionRuntime, input: LaunchInput): void {
    if (input.configPath || input.configJson || input.prefsPath || input.prefsJson || input.preset?.length || hasLaunchFingerprintHelpers(input)) {
      throw new SessionError(
        `Session ${session.name} is already running. Stop it before changing config, prefs, presets, or fingerprint helpers for that session.`,
      );
    }

    if (input.browser && input.browser !== session.browserVersion) {
      throw new SessionError(
        `Session ${session.name} is already running with browser ${session.browserVersion}. Use a different session name or stop the existing session first.`,
      );
    }

    if (input.headless !== undefined && input.headless !== session.resolvedConfig.headless) {
      throw new SessionError(
        `Session ${session.name} is already running with headless=${String(session.resolvedConfig.headless)}. Use a different session name or stop the existing session first.`,
      );
    }

    if (input.proxy && input.proxy !== session.resolvedConfig.proxy?.server) {
      throw new SessionError(
        `Session ${session.name} is already running with proxy ${session.resolvedConfig.proxy?.server ?? 'none'}. Use a different session name or stop the existing session first.`,
      );
    }

    if (input.locale && input.locale !== session.resolvedConfig.locale) {
      throw new SessionError(
        `Session ${session.name} is already running with locale ${session.resolvedConfig.locale ?? 'default'}. Use a different session name or stop the existing session first.`,
      );
    }

    if (input.timezone && input.timezone !== session.resolvedConfig.timezoneId) {
      throw new SessionError(
        `Session ${session.name} is already running with timezone ${session.resolvedConfig.timezoneId ?? 'default'}. Use a different session name or stop the existing session first.`,
      );
    }

    if ((input.width || input.height) && (!session.resolvedConfig.viewport || session.resolvedConfig.viewport.width !== input.width || session.resolvedConfig.viewport.height !== input.height)) {
      throw new SessionError(
        `Session ${session.name} is already running with a different window size. Use a different session name or stop the existing session first.`,
      );
    }
  }

  private trackPage(session: SessionRuntime, tabName: string, page: Page): TabRuntime {
    const tab = createTabRuntime(tabName, page);

    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        void clearSnapshotRefs(page);
        tab.refMap.clear();
        delete tab.lastSnapshot;
      }
    });

    page.on('close', () => {
      session.tabs.delete(tab.name);
    });

    session.tabs.set(tabName, tab);
    return tab;
  }

  private findTab(session: SessionRuntime, target: string): TabRuntime | undefined {
    if (session.tabs.has(target)) {
      return session.tabs.get(target);
    }

    const numericIndex = Number(target);
    if (Number.isInteger(numericIndex)) {
      return Array.from(session.tabs.values())[numericIndex];
    }

    return undefined;
  }
}
