import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import type { Download, Frame, Locator, Page } from 'playwright-core';

import { hasLaunchFingerprintHelpers, parseExtraHTTPHeaders, parseProxyString, resolveInitScripts, type LaunchInput } from '../camoufox/config.js';
import { launchPersistentCamoufox } from '../camoufox/launcher.js';
import type { CamoucliPaths } from '../state/paths.js';
import { inspectStoppedSessionInfo, inspectStoredSessionProfile, listStoredSessionProfiles, removeStoredSessionProfile } from '../state/session-profiles.js';
import { cleanStateSnapshots, listStateSnapshots, readStateSnapshot, removeAllManagedStateSnapshots, removeStateSnapshot, renameStateSnapshot, writeStateSnapshot, type StorageStateSnapshot } from '../state/state-snapshots.js';
import { resolveStateSnapshotPath } from '../state/states.js';
import { SessionError, TimeoutError, ValidationError } from '../util/errors.js';
import type { Logger } from '../util/log.js';
import { frameLocatorForTarget, locatorForTarget, pageOrActiveFrame } from './actions.js';
import { parseCookieInput, parseCookieJsonArray, validateCookieScope, type CookieInput } from './cookie-input.js';
import { clearSnapshotRefs, takeSnapshot } from './snapshot.js';
import { createTabRuntime, type SessionRuntime, type TabRuntime } from './tabs.js';

interface BrowserManagerOptions {
  paths: CamoucliPaths;
  logger: Logger;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
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
      activeTabName: session.activeTabName,
      tabs: this.tabListSummaries(session),
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
              activeTabName: runningSession.activeTabName,
              tabs: this.tabListSummaries(runningSession),
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
            activeTabName: runningSession.activeTabName,
            tabs: this.tabListSummaries(runningSession),
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

  async sessionInfo(sessionName: string): Promise<Record<string, unknown>> {
    const session = this.sessions.get(sessionName);
    if (!session) {
      return {
        daemon: { running: true },
        ...(await inspectStoppedSessionInfo(this.paths, sessionName)),
      };
    }

    return {
      sessionName: session.name,
      profileName: session.paths.safeSessionName,
      active: true,
      daemon: { running: true, pid: process.pid },
      status: session.status,
      browserVersion: session.browserVersion,
      headless: session.resolvedConfig.headless,
      launch: this.launchSummary(session),
      activeTabName: session.activeTabName,
      rootDir: session.paths.rootDir,
      profileDir: session.paths.profileDir,
      downloadsDir: session.paths.downloadsDir,
      artifactsDir: session.paths.artifactsDir,
      tabs: await this.tabSummaries(session),
    };
  }

  async open(input: LaunchInput & { session: string; tabName?: string | undefined; url?: string | undefined }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    if (input.url) {
      await tab.page.goto(input.url, { waitUntil: 'domcontentloaded' });
    }
    return {
      sessionName: input.session,
      tabName: tab.name,
      url: tab.page.url(),
      title: await tab.page.title(),
    };
  }

  async back(input: LaunchInput & { session: string; tabName?: string | undefined }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => null);
    return {
      sessionName: input.session,
      tabName: tab.name,
      url: tab.page.url(),
      title: await tab.page.title(),
    };
  }

  async forward(input: LaunchInput & { session: string; tabName?: string | undefined }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.goForward({ waitUntil: 'domcontentloaded' }).catch(() => null);
    return {
      sessionName: input.session,
      tabName: tab.name,
      url: tab.page.url(),
      title: await tab.page.title(),
    };
  }

  async reload(input: LaunchInput & { session: string; tabName?: string | undefined }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.reload({ waitUntil: 'domcontentloaded' });
    return {
      sessionName: input.session,
      tabName: tab.name,
      url: tab.page.url(),
      title: await tab.page.title(),
    };
  }

  async snapshot(input: LaunchInput & { session: string; tabName?: string | undefined; interactive: boolean }): Promise<Record<string, unknown>> {
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

  async click(input: LaunchInput & { session: string; tabName?: string | undefined; target: string; newTab?: boolean | undefined; label?: string | undefined; timeoutMs?: number | undefined }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    if (input.newTab) {
      const session = await this.ensureSession(input.session, input);
      const timeoutMs = input.timeoutMs ?? 5_000;
      const popupPromise = tab.page.waitForEvent('popup', { timeout: timeoutMs }).catch((error: unknown) => {
        throw new TimeoutError(`Timed out waiting for a new tab after clicking ${input.target}.`, { timeoutMs, target: input.target }, error);
      });
      const [popup] = await Promise.all([
        popupPromise,
        locatorForTarget(tab.page, tab, input.target).click().then(() => undefined),
      ]);
      const newTabName = input.label ?? this.nextGeneratedTabName(session);
      if (session.tabs.has(newTabName)) {
        throw new SessionError(`Tab ${newTabName} already exists in session ${input.session}.`);
      }
      const tracked = this.trackPage(session, newTabName, popup);
      return {
        sessionName: input.session,
        oldTabName: tab.name,
        tabName: tab.name,
        newTabName: tracked.name,
        newTabId: tracked.tabId,
        target: input.target,
        url: tracked.page.url(),
        title: await tracked.page.title(),
      };
    }

    const dialogTriggered = await this.runActionReturningOnDialog(tab, () => locatorForTarget(tab.page, tab, input.target).click());
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      url: tab.page.url(),
      ...(dialogTriggered ? { dialog: true } : {}),
    };
  }

  async download(
    input: LaunchInput & { session: string; tabName?: string | undefined; target: string; path: string; timeoutMs?: number | undefined },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const session = await this.ensureSession(input.session, input);
    const downloadPromise = this.waitForDownload(tab, input.timeoutMs);
    const [download] = await Promise.all([
      downloadPromise,
      locatorForTarget(tab.page, tab, input.target).click().then(() => undefined),
    ]);
    const savedPath = await this.saveDownload(session, download, input.path);
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      path: savedPath,
      suggestedFilename: download.suggestedFilename(),
      url: download.url(),
      failure: await download.failure(),
    };
  }

  async dblclick(input: LaunchInput & { session: string; tabName?: string | undefined; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const dialogTriggered = await this.runActionReturningOnDialog(tab, () => locatorForTarget(tab.page, tab, input.target).dblclick());
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      url: tab.page.url(),
      ...(dialogTriggered ? { dialog: true } : {}),
    };
  }

  async hover(input: LaunchInput & { session: string; tabName?: string | undefined; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).hover();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
    };
  }

  async focus(input: LaunchInput & { session: string; tabName?: string | undefined; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).focus();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
    };
  }

  async fill(input: LaunchInput & { session: string; tabName?: string | undefined; target: string; text: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).fill(input.text);
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      valueLength: input.text.length,
    };
  }

  async type(
    input: LaunchInput & { session: string; tabName?: string | undefined; target: string; text: string; clear?: boolean | undefined; delayMs?: number | undefined },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const locator = locatorForTarget(tab.page, tab, input.target);
    if (input.clear) {
      await locator.fill('');
    }
    await locator.type(input.text, input.delayMs !== undefined ? { delay: input.delayMs } : undefined);
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      valueLength: input.text.length,
      clear: input.clear ?? false,
      ...(input.delayMs !== undefined ? { delayMs: input.delayMs } : {}),
    };
  }

  async check(input: LaunchInput & { session: string; tabName?: string | undefined; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).check();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      checked: true,
    };
  }

  async uncheck(input: LaunchInput & { session: string; tabName?: string | undefined; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).uncheck();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      checked: false,
    };
  }

  async select(input: LaunchInput & { session: string; tabName?: string | undefined; target: string; value: string | string[] }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).selectOption(input.value);
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      value: input.value,
    };
  }

  async press(input: LaunchInput & { session: string; tabName?: string | undefined; key: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.keyboard.press(input.key);
    return {
      sessionName: input.session,
      tabName: tab.name,
      key: input.key,
    };
  }

  async keyboardDown(input: LaunchInput & { session: string; tabName?: string | undefined; key: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.keyboard.down(input.key);
    return {
      sessionName: input.session,
      tabName: tab.name,
      key: input.key,
    };
  }

  async keyboardUp(input: LaunchInput & { session: string; tabName?: string | undefined; key: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.keyboard.up(input.key);
    return {
      sessionName: input.session,
      tabName: tab.name,
      key: input.key,
    };
  }

  async keyboardType(
    input: LaunchInput & { session: string; tabName?: string | undefined; text: string; delayMs?: number | undefined },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.keyboard.type(input.text, input.delayMs !== undefined ? { delay: input.delayMs } : undefined);
    return {
      sessionName: input.session,
      tabName: tab.name,
      valueLength: input.text.length,
      ...(input.delayMs !== undefined ? { delayMs: input.delayMs } : {}),
    };
  }

  async keyboardInsertText(input: LaunchInput & { session: string; tabName?: string | undefined; text: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.keyboard.insertText(input.text);
    return {
      sessionName: input.session,
      tabName: tab.name,
      valueLength: input.text.length,
    };
  }

  async mouseMove(input: LaunchInput & { session: string; tabName?: string | undefined; x: number; y: number }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.mouse.move(input.x, input.y);
    return {
      sessionName: input.session,
      tabName: tab.name,
      x: input.x,
      y: input.y,
    };
  }

  async mouseDown(
    input: LaunchInput & { session: string; tabName?: string | undefined; button?: 'left' | 'right' | 'middle' | undefined },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.mouse.down(input.button ? { button: input.button } : undefined);
    return {
      sessionName: input.session,
      tabName: tab.name,
      button: input.button ?? 'left',
    };
  }

  async mouseUp(
    input: LaunchInput & { session: string; tabName?: string | undefined; button?: 'left' | 'right' | 'middle' | undefined },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.mouse.up(input.button ? { button: input.button } : undefined);
    return {
      sessionName: input.session,
      tabName: tab.name,
      button: input.button ?? 'left',
    };
  }

  async mouseWheel(input: LaunchInput & { session: string; tabName?: string | undefined; deltaX: number; deltaY: number }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.mouse.wheel(input.deltaX, input.deltaY);
    return {
      sessionName: input.session,
      tabName: tab.name,
      deltaX: input.deltaX,
      deltaY: input.deltaY,
      url: tab.page.url(),
    };
  }

  async scroll(
    input: LaunchInput & { session: string; tabName?: string | undefined; direction?: 'up' | 'down' | 'left' | 'right' | undefined; amount?: number | undefined; target?: string | undefined },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const direction = input.direction ?? 'down';
    const amount = input.amount ?? 300;
    const delta =
      direction === 'up'
        ? { x: 0, y: -amount }
        : direction === 'down'
          ? { x: 0, y: amount }
          : direction === 'left'
            ? { x: -amount, y: 0 }
            : { x: amount, y: 0 };

    if (input.target) {
      await locatorForTarget(tab.page, tab, input.target).evaluate((element, scrollDelta) => {
        element.scrollBy(scrollDelta.x, scrollDelta.y);
      }, delta);
    } else {
      await tab.page.mouse.wheel(delta.x, delta.y);
    }

    return {
      sessionName: input.session,
      tabName: tab.name,
      direction,
      amount,
      ...(input.target ? { target: input.target } : {}),
      url: tab.page.url(),
    };
  }

  async scrollIntoView(input: LaunchInput & { session: string; tabName?: string | undefined; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).scrollIntoViewIfNeeded();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
    };
  }

  async upload(input: LaunchInput & { session: string; tabName?: string | undefined; target: string; files: string[] }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).setInputFiles(input.files);
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      files: input.files,
      count: input.files.length,
    };
  }

  async drag(input: LaunchInput & { session: string; tabName?: string | undefined; source: string; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.source).dragTo(locatorForTarget(tab.page, tab, input.target));
    return {
      sessionName: input.session,
      tabName: tab.name,
      source: input.source,
      target: input.target,
    };
  }

  async eval(input: LaunchInput & { session: string; tabName?: string | undefined; expression: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    return {
      sessionName: input.session,
      tabName: tab.name,
      expression: input.expression,
      result: await tab.page.evaluate((expression) => globalThis.eval(expression), input.expression),
    };
  }

  async getCookies(input: { session: string; urls?: string[] | undefined }): Promise<Record<string, unknown>> {
    const session = await this.ensureSession(input.session, {});
    const cookies = input.urls && input.urls.length > 0
      ? await session.context.cookies(input.urls)
      : await session.context.cookies();
    return { sessionName: session.name, count: cookies.length, cookies };
  }

  async setCookie(
    input: LaunchInput & {
      session: string;
      tabName?: string | undefined;
      name?: string | undefined;
      value?: string | undefined;
      url?: string | undefined;
      domain?: string | undefined;
      path?: string | undefined;
      expires?: number | undefined;
      httpOnly?: boolean | undefined;
      secure?: boolean | undefined;
      sameSite?: 'Strict' | 'Lax' | 'None' | undefined;
      curlPath?: string | undefined;
    },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const session = await this.ensureSession(input.session, input);
    const cookies = input.curlPath
      ? parseCookieInput(await readFile(input.curlPath, 'utf8'))
      : [this.cookieFromSetInput(input)];
    const scopedCookies = cookies.map((cookie) => this.applyCookieDefaults(cookie, tab));
    await session.context.addCookies(scopedCookies as never);
    return {
      sessionName: session.name,
      tabName: tab.name,
      count: scopedCookies.length,
      names: scopedCookies.map((cookie) => cookie.name),
      source: input.curlPath ? 'curl' : 'args',
    };
  }

  async clearCookies(input: { session: string }): Promise<Record<string, unknown>> {
    const session = await this.ensureSession(input.session, {});
    const context = session.context as typeof session.context & { clearCookies?: () => Promise<void> };
    const before = await session.context.cookies();
    if (typeof context.clearCookies === 'function') {
      await context.clearCookies();
    } else {
      await session.context.addCookies([] as never);
    }
    return { sessionName: session.name, cleared: before.length };
  }

  async screenshot(
    input: LaunchInput & {
      session: string;
      tabName?: string | undefined;
      target?: string | undefined;
      path?: string | undefined;
      fullPage?: boolean | undefined;
      format?: 'png' | 'jpeg' | undefined;
      quality?: number | undefined;
    },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const session = await this.ensureSession(input.session, input);
    const format = input.format ?? (input.path?.toLowerCase().endsWith('.jpg') || input.path?.toLowerCase().endsWith('.jpeg') ? 'jpeg' : 'png');
    const filePath = input.path ?? path.join(session.paths.artifactsDir, `${tab.name}-${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`);
    await mkdir(path.dirname(filePath), { recursive: true });
    const screenshotOptions = {
      path: filePath,
      type: format,
      ...(format === 'jpeg' && input.quality !== undefined ? { quality: input.quality } : {}),
    } as const;
    if (input.target) {
      await locatorForTarget(tab.page, tab, input.target).screenshot(screenshotOptions);
    } else {
      await tab.page.screenshot({
        ...screenshotOptions,
        fullPage: input.fullPage ?? true,
      });
    }
    return {
      sessionName: input.session,
      tabName: tab.name,
      path: filePath,
      format,
      ...(input.target ? { target: input.target } : {}),
      ...(input.target ? {} : { fullPage: input.fullPage ?? true }),
      ...(format === 'jpeg' && input.quality !== undefined ? { quality: input.quality } : {}),
    };
  }

  async getUrl(input: LaunchInput & { session: string; tabName?: string | undefined }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    return {
      sessionName: input.session,
      tabName: tab.name,
      url: tab.page.url(),
    };
  }

  async getTitle(input: LaunchInput & { session: string; tabName?: string | undefined }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    return {
      sessionName: input.session,
      tabName: tab.name,
      title: await tab.page.title(),
    };
  }

  async getText(input: LaunchInput & { session: string; tabName?: string | undefined; target: string }): Promise<Record<string, unknown>> {
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
    const cookies = parseCookieJsonArray(await readFile(input.path, 'utf8'));
    await session.context.addCookies(cookies as never);
    return { sessionName: session.name, imported: cookies.length, path: input.path };
  }

  async storage(
    input: LaunchInput & {
      action: 'storage.local' | 'storage.session';
      session: string;
      tabName?: string | undefined;
      operation: 'get' | 'set' | 'clear';
      key?: string | undefined;
      value?: string | undefined;
    },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const origin = this.currentHttpOrigin(tab);
    const storageKind = input.action === 'storage.local' ? 'localStorage' : 'sessionStorage';
    if (input.operation === 'set') {
      if (!input.key) {
        throw new ValidationError('storage set requires a key.');
      }
      if (input.value === undefined) {
        throw new ValidationError('storage set requires a string value.');
      }
      await tab.page.evaluate(({ kind, key, value }) => {
        const storage = kind === 'localStorage' ? localStorage : sessionStorage;
        storage.setItem(key, value);
      }, { kind: storageKind, key: input.key, value: input.value });
      return { sessionName: input.session, tabName: tab.name, storage: storageKind, operation: 'set', origin, key: input.key, valueLength: input.value.length };
    }

    if (input.operation === 'clear') {
      if (input.key) {
        await tab.page.evaluate(({ kind, key }) => {
          const storage = kind === 'localStorage' ? localStorage : sessionStorage;
          storage.removeItem(key);
        }, { kind: storageKind, key: input.key });
      } else {
        await tab.page.evaluate((kind) => {
          const storage = kind === 'localStorage' ? localStorage : sessionStorage;
          storage.clear();
        }, storageKind);
      }
      return { sessionName: input.session, tabName: tab.name, storage: storageKind, operation: 'clear', origin, ...(input.key ? { key: input.key } : {}) };
    }

    const result = await tab.page.evaluate(({ kind, key }) => {
      const storage = kind === 'localStorage' ? localStorage : sessionStorage;
      if (key !== undefined) {
        return { [key]: storage.getItem(key) };
      }
      return Object.fromEntries(Array.from({ length: storage.length }, (_item, index) => {
        const itemKey = storage.key(index) ?? '';
        return [itemKey, storage.getItem(itemKey)];
      }));
    }, { kind: storageKind, key: input.key });
    return { sessionName: input.session, tabName: tab.name, storage: storageKind, operation: 'get', origin, values: result };
  }

  async saveState(input: { session: string; path: string }): Promise<Record<string, unknown>> {
    const session = await this.ensureSession(input.session, {});
    const filePath = resolveStateSnapshotPath(this.paths, input.path);
    const context = session.context as typeof session.context & { storageState?: (options?: { path?: string }) => Promise<StorageStateSnapshot> };
    if (typeof context.storageState !== 'function') {
      throw new ValidationError('Storage state snapshots are not supported by the installed Playwright context.');
    }
    const state = await context.storageState();
    await writeStateSnapshot(filePath, state);
    return { sessionName: session.name, path: filePath, cookies: state.cookies.length, origins: state.origins.length };
  }

  async loadState(input: { session: string; path: string }): Promise<Record<string, unknown>> {
    const session = await this.ensureSession(input.session, {});
    const filePath = resolveStateSnapshotPath(this.paths, input.path);
    const state = await readStateSnapshot(filePath);
    await session.context.addCookies(state.cookies as never);
    let localStorageItems = 0;
    for (const originRecord of state.origins) {
      localStorageItems += originRecord.localStorage.length;
      if (originRecord.localStorage.length === 0) {
        continue;
      }
      const page = await session.context.newPage();
      try {
        await page.goto(originRecord.origin, { waitUntil: 'domcontentloaded' });
        await page.evaluate((items) => {
          for (const item of items) {
            localStorage.setItem(item.name, item.value);
          }
        }, originRecord.localStorage);
      } finally {
        await page.close();
      }
    }
    return {
      sessionName: session.name,
      path: filePath,
      mode: 'merge',
      cookies: state.cookies.length,
      origins: state.origins.length,
      localStorageItems,
    };
  }

  async listStates(): Promise<Record<string, unknown>> {
    return { states: await listStateSnapshots(this.paths) };
  }

  async showState(pathOrName: string): Promise<Record<string, unknown>> {
    const filePath = resolveStateSnapshotPath(this.paths, pathOrName);
    const state = await readStateSnapshot(filePath);
    return { path: filePath, cookies: state.cookies.length, origins: state.origins.length, state };
  }

  async clearState(input: { path?: string | undefined; all?: boolean | undefined }): Promise<Record<string, unknown>> {
    if (input.all) {
      return { all: true, ...(await removeAllManagedStateSnapshots(this.paths)) };
    }
    if (!input.path) {
      throw new ValidationError('state clear requires a name/path or --all.');
    }
    return removeStateSnapshot(this.paths, input.path);
  }

  async cleanStates(): Promise<Record<string, unknown>> {
    return cleanStateSnapshots(this.paths);
  }

  async renameState(from: string, to: string): Promise<Record<string, unknown>> {
    return renameStateSnapshot(this.paths, from, to);
  }

  async getValue(input: LaunchInput & { session: string; tabName?: string | undefined; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const value = await locatorForTarget(tab.page, tab, input.target).inputValue();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      value,
    };
  }

  async getHtml(input: LaunchInput & { session: string; tabName?: string | undefined; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const html = await locatorForTarget(tab.page, tab, input.target).innerHTML();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      html,
    };
  }

  async getAttribute(
    input: LaunchInput & { session: string; tabName?: string | undefined; target: string; attribute: string },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const value = await locatorForTarget(tab.page, tab, input.target).getAttribute(input.attribute);
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      attribute: input.attribute,
      value,
    };
  }

  async getCount(input: LaunchInput & { session: string; tabName?: string | undefined; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const count = await locatorForTarget(tab.page, tab, input.target).count();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      count,
    };
  }

  async getBox(input: LaunchInput & { session: string; tabName?: string | undefined; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const box = await locatorForTarget(tab.page, tab, input.target).boundingBox();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      box,
    };
  }

  async getStyles(input: LaunchInput & { session: string; tabName?: string | undefined; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const styles = await locatorForTarget(tab.page, tab, input.target).evaluate((element) => {
      const computed = window.getComputedStyle(element);
      return Object.fromEntries(Array.from(computed).map((property) => [property, computed.getPropertyValue(property)]));
    });
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      styles,
    };
  }

  async elementPredicate(
    input: LaunchInput & { action: 'is.visible' | 'is.enabled' | 'is.checked'; session: string; tabName?: string | undefined; target: string },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const locator = locatorForTarget(tab.page, tab, input.target);
    const value =
      input.action === 'is.visible'
        ? await locator.isVisible()
        : input.action === 'is.enabled'
          ? await locator.isEnabled()
          : await locator.isChecked();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      predicate: input.action.slice('is.'.length),
      value,
    };
  }

  async wait(
    input: LaunchInput & {
      session: string;
      tabName?: string | undefined;
      ms?: number | undefined;
      target?: string | undefined;
      text?: string | undefined;
      loadState?: 'domcontentloaded' | 'load' | 'networkidle' | undefined;
      url?: string | undefined;
      fn?: string | undefined;
      download?: boolean | undefined;
      path?: string | undefined;
      timeoutMs?: number | undefined;
    },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    if (input.ms === undefined && !input.target && !input.text && !input.loadState && !input.url && !input.fn && !input.download) {
      throw new ValidationError('wait requires milliseconds, a target, --text value, --load state, --url pattern, --fn predicate, or --download.');
    }
    if (input.path && !input.download) {
      throw new ValidationError('wait path can only be used with --download.');
    }

    const waitOptions = input.timeoutMs ? { timeout: input.timeoutMs } : undefined;
    let downloadResult: Record<string, unknown> | undefined;
    if (input.download) {
      const session = await this.ensureSession(input.session, input);
      const download = await this.waitForDownload(tab, input.timeoutMs);
      const savedPath = input.path ? await this.saveDownload(session, download, input.path) : undefined;
      downloadResult = {
        download: true,
        ...(savedPath ? { path: savedPath } : {}),
        suggestedFilename: download.suggestedFilename(),
        url: download.url(),
        failure: await download.failure(),
      };
    }

    if (input.ms !== undefined) {
      await new Promise((resolve) => setTimeout(resolve, input.ms));
    }

    if (input.target) {
      await locatorForTarget(tab.page, tab, input.target).waitFor(waitOptions);
    }

    if (input.text) {
      await tab.page.getByText(input.text).first().waitFor(waitOptions);
    }

    if (input.loadState) {
      await tab.page.waitForLoadState(input.loadState, waitOptions);
    }

    if (input.url) {
      await tab.page.waitForURL(input.url, waitOptions);
    }

    if (input.fn) {
      await tab.page.waitForFunction(input.fn, undefined, waitOptions);
    }

    return {
      sessionName: input.session,
      tabName: tab.name,
      ...(input.ms !== undefined ? { ms: input.ms } : {}),
      ...(input.target ? { target: input.target } : {}),
      ...(input.text ? { text: input.text } : {}),
      ...(input.loadState ? { loadState: input.loadState } : {}),
      ...(input.url ? { urlPattern: input.url } : {}),
      ...(input.fn ? { fn: input.fn } : {}),
      ...downloadResult,
      url: tab.page.url(),
    };
  }

  async setRuntime(
    input: LaunchInput & {
      session: string;
      tabName?: string | undefined;
      runtime:
        | { setting: 'viewport'; width: number; height: number }
        | { setting: 'geolocation'; latitude: number; longitude: number; accuracy?: number | undefined }
        | { setting: 'offline'; value: boolean }
        | { setting: 'headers'; headers: Record<string, string> }
        | { setting: 'credentials'; origin: string; username: string; password: string }
        | { setting: 'media'; colorScheme?: 'dark' | 'light' | 'no-preference' | undefined; reducedMotion?: 'reduce' | 'no-preference' | undefined };
    },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const session = await this.ensureSession(input.session, input);
    const runtime = input.runtime;

    if (runtime.setting === 'viewport') {
      await tab.page.setViewportSize({ width: runtime.width, height: runtime.height });
      return { sessionName: input.session, tabName: tab.name, setting: runtime.setting, lifetime: 'tab', viewport: { width: runtime.width, height: runtime.height } };
    }

    if (runtime.setting === 'geolocation') {
      await session.context.setGeolocation({
        latitude: runtime.latitude,
        longitude: runtime.longitude,
        ...(runtime.accuracy !== undefined ? { accuracy: runtime.accuracy } : {}),
      });
      return { sessionName: input.session, setting: runtime.setting, lifetime: 'session', geolocation: { ...runtime } };
    }

    if (runtime.setting === 'offline') {
      await session.context.setOffline(runtime.value);
      return { sessionName: input.session, setting: runtime.setting, lifetime: 'session', offline: runtime.value };
    }

    if (runtime.setting === 'headers') {
      await session.context.setExtraHTTPHeaders(runtime.headers);
      return { sessionName: input.session, setting: runtime.setting, lifetime: 'session', headers: runtime.headers };
    }

    if (runtime.setting === 'credentials') {
      const context = session.context as typeof session.context & {
        setHTTPCredentials?: (credentials: { username: string; password: string; origin?: string }) => Promise<void>;
      };
      if (typeof context.setHTTPCredentials !== 'function') {
        throw new ValidationError('Runtime credentials are not supported by the installed Playwright context.');
      }
      await context.setHTTPCredentials({ origin: runtime.origin, username: runtime.username, password: runtime.password });
      return { sessionName: input.session, setting: runtime.setting, lifetime: 'session', origin: runtime.origin, username: runtime.username };
    }

    if (runtime.setting === 'media') {
      if (runtime.colorScheme === undefined && runtime.reducedMotion === undefined) {
        throw new ValidationError('Runtime media setting requires colorScheme or reducedMotion.');
      }
      await tab.page.emulateMedia({
        ...(runtime.colorScheme !== undefined ? { colorScheme: runtime.colorScheme } : {}),
        ...(runtime.reducedMotion !== undefined ? { reducedMotion: runtime.reducedMotion } : {}),
      });
      return {
        sessionName: input.session,
        tabName: tab.name,
        setting: runtime.setting,
        lifetime: 'tab',
        ...(runtime.colorScheme !== undefined ? { colorScheme: runtime.colorScheme } : {}),
        ...(runtime.reducedMotion !== undefined ? { reducedMotion: runtime.reducedMotion } : {}),
      };
    }

    throw new ValidationError(`Unsupported runtime setting ${(runtime as { setting?: string }).setting ?? 'unknown'}.`);
  }

  async setFrame(input: LaunchInput & { session: string; tabName?: string | undefined; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    if (input.target === 'main') {
      delete tab.activeFrame;
      delete tab.activeFrameTarget;
      return { sessionName: input.session, tabName: tab.name, frame: 'main', active: false };
    }

    const locator = frameLocatorForTarget(tab.page, tab, input.target);
    const frame = await this.resolveFrameFromLocator(locator, input.target);
    tab.activeFrame = frame;
    tab.activeFrameTarget = input.target;
    return {
      sessionName: input.session,
      tabName: tab.name,
      frame: input.target,
      active: true,
      url: frame.url(),
      name: frame.name(),
    };
  }

  async dialogStatus(input: LaunchInput & { session: string; tabName?: string | undefined }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    return {
      sessionName: input.session,
      tabName: tab.name,
      pending: Boolean(tab.pendingDialog),
      ...(tab.pendingDialog
        ? {
            dialog: {
              id: tab.pendingDialog.id,
              type: tab.pendingDialog.type,
              message: tab.pendingDialog.message,
              defaultValue: tab.pendingDialog.defaultValue,
              openedAt: tab.pendingDialog.openedAt,
            },
          }
        : {}),
    };
  }

  async resolveDialog(
    input: LaunchInput & { action: 'dialog.accept' | 'dialog.dismiss'; session: string; tabName?: string | undefined; text?: string | undefined },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const pending = tab.pendingDialog;
    if (!pending) {
      throw new ValidationError(`No pending dialog in ${input.session}/${tab.name}.`);
    }
    if (input.action === 'dialog.dismiss' && input.text !== undefined) {
      throw new ValidationError('dialog dismiss does not accept text.');
    }

    if (input.action === 'dialog.accept') {
      await pending.dialog.accept(input.text);
    } else {
      await pending.dialog.dismiss();
    }
    delete tab.pendingDialog;
    return {
      sessionName: input.session,
      tabName: tab.name,
      action: input.action,
      dialog: {
        id: pending.id,
        type: pending.type,
        message: pending.message,
        defaultValue: pending.defaultValue,
      },
      ...(input.text !== undefined ? { text: input.text } : {}),
    };
  }

  async read(
    input: LaunchInput & { session: string; tabName?: string | undefined; url?: string | undefined; mode?: 'text' | 'raw' | 'outline' | undefined; filter?: string | undefined; timeoutMs?: number | undefined },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    if (input.url) {
      await tab.page.goto(input.url, { waitUntil: 'domcontentloaded', ...(input.timeoutMs ? { timeout: input.timeoutMs } : {}) });
    }
    const mode = input.mode ?? 'text';
    const context = pageOrActiveFrame(tab.page, tab);
    const result = await context.evaluate(
      ({ mode: readMode, filter }) => {
        const matchesFilter = (value: string): boolean => !filter || value.toLowerCase().includes(filter.toLowerCase());
        if (readMode === 'raw') {
          return {
            content: document.documentElement.outerHTML,
            items: [],
          };
        }

        if (readMode === 'outline') {
          const selector = 'h1,h2,h3,h4,h5,h6,a,button,input,textarea,select';
          const items = Array.from(document.querySelectorAll(selector)).map((element) => {
            const tag = element.tagName.toLowerCase();
            const text = tag === 'input'
              ? ((element as HTMLInputElement).value || (element as HTMLInputElement).placeholder || '')
              : (element.textContent ?? '').trim();
            const href = element instanceof HTMLAnchorElement ? element.href : undefined;
            const label = [tag, text, href].filter(Boolean).join(' ');
            return { tag, text, href, label };
          }).filter((item) => matchesFilter(item.label));
          return {
            content: items.map((item) => `${item.tag}${item.text ? ` ${item.text}` : ''}${item.href ? ` ${item.href}` : ''}`).join('\n'),
            items,
          };
        }

        const text = (document.body?.innerText ?? document.documentElement.textContent ?? '').trim();
        const lines = text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
        const filtered = filter ? lines.filter(matchesFilter) : lines;
        return {
          content: filtered.join('\n'),
          items: filtered.map((line) => ({ text: line })),
        };
      },
      { mode, filter: input.filter },
    );
    const data = result as { content: string; items: Array<Record<string, unknown>> };
    return {
      sessionName: input.session,
      tabName: tab.name,
      mode,
      url: tab.page.url(),
      title: await tab.page.title(),
      ...(input.filter ? { filter: input.filter } : {}),
      content: data.content,
      items: data.items,
    };
  }

  async find(
    input: LaunchInput & {
      session: string;
      tabName?: string | undefined;
      locatorType: 'role' | 'text' | 'label' | 'placeholder' | 'alt' | 'title' | 'testid' | 'first' | 'last' | 'nth';
      value?: string | undefined;
      target?: string | undefined;
      index?: number | undefined;
      name?: string | undefined;
      exact?: boolean | undefined;
      subaction?: 'click' | 'fill' | 'check' | 'hover' | 'text' | undefined;
      text?: string | undefined;
    },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const locator = this.locatorForFind(pageOrActiveFrame(tab.page, tab), tab, input);
    const subaction = input.subaction ?? 'click';
    let text: string | undefined;

    if (subaction === 'click') {
      await locator.click();
    } else if (subaction === 'fill') {
      if (input.text === undefined) {
        throw new ValidationError('find --action fill requires --value.');
      }
      await locator.fill(input.text);
    } else if (subaction === 'check') {
      await locator.check();
    } else if (subaction === 'hover') {
      await locator.hover();
    } else {
      text = await locator.innerText();
    }

    return {
      sessionName: input.session,
      tabName: tab.name,
      locatorType: input.locatorType,
      ...(input.value !== undefined ? { value: input.value } : {}),
      ...(input.target !== undefined ? { target: input.target } : {}),
      ...(input.index !== undefined ? { index: input.index } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.exact !== undefined ? { exact: input.exact } : {}),
      subaction,
      ...(text !== undefined ? { text } : {}),
      url: tab.page.url(),
    };
  }

  async listTabs(sessionName: string): Promise<Array<Record<string, unknown>>> {
    const session = await this.ensureSession(sessionName, {});
    return this.tabSummaries(session);
  }

  async newTab(
    input: LaunchInput & { session: string; tabName?: string | undefined; url?: string | undefined; label?: string | undefined },
  ): Promise<Record<string, unknown>> {
    const session = await this.ensureSession(input.session, input);
    const tabName = input.label ?? input.tabName ?? this.nextGeneratedTabName(session);
    if (session.tabs.has(tabName)) {
      throw new SessionError(`Tab ${tabName} already exists in session ${input.session}.`);
    }

    const page = await session.context.newPage();
    const tab = this.trackPage(session, tabName, page);
    if (input.url) {
      await page.goto(input.url, { waitUntil: 'domcontentloaded' });
    }

    return {
      sessionName: input.session,
      tabName: tab.name,
      tabId: tab.tabId,
      url: page.url(),
      title: await page.title(),
    };
  }

  async newWindow(input: LaunchInput & { session: string; tabName?: string | undefined; url?: string | undefined; label?: string | undefined }): Promise<Record<string, unknown>> {
    const result = await this.newTab(input);
    return {
      ...result,
      page: true,
      window: false,
    };
  }

  async activateTab(sessionName: string, target: string): Promise<Record<string, unknown>> {
    const session = await this.ensureSession(sessionName, {});
    const tab = this.findTab(session, target);
    if (!tab || tab.page.isClosed()) {
      throw new SessionError(`Tab ${target} was not found in session ${sessionName}.`);
    }

    session.activeTabName = tab.name;
    return this.tabSummary(session, tab, Array.from(session.tabs.values()).indexOf(tab));
  }

  async closeTab(sessionName: string, target?: string | undefined): Promise<{ closed: boolean; tabName?: string; target?: string | undefined; activeTabName?: string | undefined }> {
    const session = this.sessions.get(sessionName);
    if (!session) {
      return { closed: false, target };
    }

    const tab = target ? this.findTab(session, target) : this.resolveExistingTab(session, undefined);
    if (!tab) {
      return { closed: false, target };
    }

    await tab.page.close();
    session.tabs.delete(tab.name);
    this.ensureActiveTabAfterClose(session, tab.name);
    return {
      closed: true,
      tabName: tab.name,
      target,
      activeTabName: session.activeTabName,
    };
  }

  private async waitForDownload(tab: TabRuntime, timeoutMs?: number | undefined): Promise<Download> {
    const timeout = timeoutMs ?? 30_000;
    return tab.page.waitForEvent('download', { timeout }).catch((error: unknown) => {
      throw new TimeoutError(`Timed out waiting for a download in tab ${tab.name}.`, { timeoutMs: timeout, tabName: tab.name }, error);
    });
  }

  private async runActionReturningOnDialog(tab: TabRuntime, action: () => Promise<unknown>): Promise<boolean> {
    let onDialog: () => void = () => undefined;
    const dialogPromise = new Promise<boolean>((resolve) => {
      onDialog = (): void => {
        resolve(true);
      };
      tab.page.once('dialog', onDialog);
    });
    const actionPromise = action().then(() => false);
    try {
      const result = await Promise.race([actionPromise, dialogPromise]);
      if (result) {
        actionPromise.catch((error: unknown) => {
          this.logger.debug('Dialog-triggering page action settled after response with an error', { tabName: tab.name, error: String(error) });
        });
      }
      return result || Boolean(tab.pendingDialog);
    } finally {
      tab.page.off('dialog', onDialog);
    }
  }

  private async saveDownload(session: SessionRuntime, download: Download, filePath: string): Promise<string> {
    const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(session.paths.downloadsDir, filePath);
    await mkdir(path.dirname(resolvedPath), { recursive: true });
    await download.saveAs(resolvedPath);
    return resolvedPath;
  }

  private async resolveFrameFromLocator(locator: Locator, target: string): Promise<Frame> {
    const handle = await locator.elementHandle();
    if (!handle) {
      throw new ValidationError(`Frame target ${target} was not found.`);
    }

    const frame = await handle.contentFrame();
    if (!frame) {
      throw new ValidationError(`Frame target ${target} is not an iframe or frame element.`);
    }

    return frame;
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
        nextTabSequence: 1,
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
        this.trackPage(session, 'main', page, false);
      } else {
        pages.forEach((page, index) => {
          this.trackPage(session, index === 0 ? 'main' : `restored-${index + 1}`, page, false);
        });
      }
      session.activeTabName = session.tabs.has('main') ? 'main' : Array.from(session.tabs.keys())[0];

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

  private async ensureTab(sessionName: string, tabName: string | undefined, input: LaunchInput): Promise<TabRuntime> {
    const session = await this.ensureSession(sessionName, input);
    const resolvedExisting = this.resolveExistingTab(session, tabName);
    if (resolvedExisting) {
      if (tabName) {
        session.activeTabName = resolvedExisting.name;
      }
      return resolvedExisting;
    }

    const resolvedName = tabName ?? session.activeTabName ?? 'main';
    const existing = session.tabs.get(resolvedName);
    if (existing && !existing.page.isClosed()) {
      return existing;
    }

    if (existing?.page.isClosed()) {
      session.tabs.delete(existing.name);
    }

    const page = await session.context.newPage();
    return this.trackPage(session, resolvedName, page);
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

    const proxy = input.proxy !== undefined || input.proxyBypass !== undefined
      ? parseProxyString(input.proxy, input.proxyBypass)
      : undefined;
    if (proxy && stableJson(proxy) !== stableJson(session.resolvedConfig.proxy)) {
      throw new SessionError(
        `Session ${session.name} is already running with proxy ${session.resolvedConfig.proxy?.server ?? 'none'}. Use a different session name or stop the existing session first.`,
      );
    }

    if (!proxy && input.proxyBypass !== undefined && input.proxyBypass !== session.resolvedConfig.proxy?.bypass) {
      throw new SessionError(
        `Session ${session.name} is already running with proxy bypass ${session.resolvedConfig.proxy?.bypass ?? 'none'}. Use a different session name or stop the existing session first.`,
      );
    }

    const headers = parseExtraHTTPHeaders(input.headers, input.extraHTTPHeaders);
    if (headers !== undefined && stableJson(headers) !== stableJson(session.resolvedConfig.extraHTTPHeaders ?? {})) {
      throw new SessionError(
        `Session ${session.name} is already running with different extra HTTP headers. Use a different session name or stop the existing session first.`,
      );
    }

    if (input.userAgent !== undefined && input.userAgent !== session.resolvedConfig.userAgent) {
      throw new SessionError(
        `Session ${session.name} is already running with userAgent ${session.resolvedConfig.userAgent ?? 'default'}. Use a different session name or stop the existing session first.`,
      );
    }

    if (input.ignoreHTTPSErrors !== undefined && input.ignoreHTTPSErrors !== session.resolvedConfig.ignoreHTTPSErrors) {
      throw new SessionError(
        `Session ${session.name} is already running with ignoreHTTPSErrors=${String(session.resolvedConfig.ignoreHTTPSErrors ?? false)}. Use a different session name or stop the existing session first.`,
      );
    }

    if (input.colorScheme !== undefined && input.colorScheme !== session.resolvedConfig.colorScheme) {
      throw new SessionError(
        `Session ${session.name} is already running with colorScheme ${session.resolvedConfig.colorScheme ?? 'default'}. Use a different session name or stop the existing session first.`,
      );
    }

    if (input.reducedMotion !== undefined && input.reducedMotion !== session.resolvedConfig.reducedMotion) {
      throw new SessionError(
        `Session ${session.name} is already running with reducedMotion ${session.resolvedConfig.reducedMotion ?? 'default'}. Use a different session name or stop the existing session first.`,
      );
    }

    const initScripts = resolveInitScripts(input);
    if (initScripts.length > 0 && stableJson(initScripts) !== stableJson(session.resolvedConfig.initScripts)) {
      throw new SessionError(
        `Session ${session.name} is already running with different launch init scripts. Use a different session name or stop the existing session first.`,
      );
    }

    if (input.state !== undefined || input.storageState !== undefined) {
      throw new SessionError(
        `Session ${session.name} is already running. Launch-time state can only be applied when starting a new session; use a different session name or stop the existing session first.`,
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

  private trackPage(session: SessionRuntime, tabName: string, page: Page, activate = true): TabRuntime {
    const tab = createTabRuntime(tabName, `t${session.nextTabSequence++}`, page);

    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        void clearSnapshotRefs(page);
        tab.refMap.clear();
        delete tab.lastSnapshot;
        delete tab.activeFrame;
        delete tab.activeFrameTarget;
      }
    });

    page.on('dialog', (dialog) => {
      tab.pendingDialog = {
        id: `dialog_${randomUUID()}`,
        dialog,
        type: dialog.type(),
        message: dialog.message(),
        defaultValue: dialog.defaultValue(),
        openedAt: new Date().toISOString(),
      };
    });

    page.on('close', () => {
      delete tab.activeFrame;
      delete tab.activeFrameTarget;
      delete tab.pendingDialog;
      session.tabs.delete(tab.name);
      this.ensureActiveTabAfterClose(session, tab.name);
    });

    session.tabs.set(tabName, tab);
    if (activate) {
      session.activeTabName = tab.name;
    }
    return tab;
  }

  private findTab(session: SessionRuntime, target: string): TabRuntime | undefined {
    if (session.tabs.has(target)) {
      return session.tabs.get(target);
    }

    const byId = Array.from(session.tabs.values()).find((tab) => tab.tabId === target);
    if (byId) {
      return byId;
    }

    const numericIndex = Number(target);
    if (Number.isInteger(numericIndex)) {
      return Array.from(session.tabs.values())[numericIndex];
    }

    return undefined;
  }

  private resolveExistingTab(session: SessionRuntime, tabName: string | undefined): TabRuntime | undefined {
    if (tabName) {
      const tab = session.tabs.get(tabName);
      if (tab && !tab.page.isClosed()) {
        return tab;
      }
      if (tab?.page.isClosed()) {
        session.tabs.delete(tab.name);
      }
      return undefined;
    }

    const activeTab = session.activeTabName ? session.tabs.get(session.activeTabName) : undefined;
    if (activeTab && !activeTab.page.isClosed()) {
      return activeTab;
    }

    const mainTab = session.tabs.get('main');
    if (mainTab && !mainTab.page.isClosed()) {
      session.activeTabName = mainTab.name;
      return mainTab;
    }

    const firstOpenTab = Array.from(session.tabs.values()).find((tab) => !tab.page.isClosed());
    if (firstOpenTab) {
      session.activeTabName = firstOpenTab.name;
      return firstOpenTab;
    }

    return undefined;
  }

  private ensureActiveTabAfterClose(session: SessionRuntime, closedTabName: string): void {
    if (session.activeTabName && session.activeTabName !== closedTabName && session.tabs.has(session.activeTabName)) {
      return;
    }

    const mainTab = session.tabs.get('main');
    if (mainTab && !mainTab.page.isClosed()) {
      session.activeTabName = mainTab.name;
      return;
    }

    const remainingTabs = Array.from(session.tabs.values()).filter((tab) => !tab.page.isClosed());
    session.activeTabName = remainingTabs.at(-1)?.name;
  }

  private nextGeneratedTabName(session: SessionRuntime): string {
    let index = session.nextTabSequence;
    while (session.tabs.has(`t${index}`)) {
      index += 1;
    }
    return `t${index}`;
  }

  private async tabSummary(session: SessionRuntime, tab: TabRuntime, index: number): Promise<Record<string, unknown>> {
    return {
      index,
      tabId: tab.tabId,
      tabName: tab.name,
      active: tab.name === session.activeTabName,
      url: tab.page.url(),
      title: tab.page.isClosed() ? '' : await tab.page.title(),
      ...(tab.activeFrameTarget ? { activeFrame: tab.activeFrameTarget } : {}),
      pendingDialog: Boolean(tab.pendingDialog),
    };
  }

  private async tabSummaries(session: SessionRuntime): Promise<Array<Record<string, unknown>>> {
    return Promise.all(Array.from(session.tabs.values()).map((tab, index) => this.tabSummary(session, tab, index)));
  }

  private tabListSummary(session: SessionRuntime, tab: TabRuntime): Record<string, unknown> {
    return {
      tabId: tab.tabId,
      tabName: tab.name,
      active: tab.name === session.activeTabName,
      url: tab.page.url(),
      ...(tab.activeFrameTarget ? { activeFrame: tab.activeFrameTarget } : {}),
      pendingDialog: Boolean(tab.pendingDialog),
    };
  }

  private tabListSummaries(session: SessionRuntime): Array<Record<string, unknown>> {
    return Array.from(session.tabs.values()).map((tab) => this.tabListSummary(session, tab));
  }

  private cookieFromSetInput(input: {
    name?: string | undefined;
    value?: string | undefined;
    url?: string | undefined;
    domain?: string | undefined;
    path?: string | undefined;
    expires?: number | undefined;
    httpOnly?: boolean | undefined;
    secure?: boolean | undefined;
    sameSite?: 'Strict' | 'Lax' | 'None' | undefined;
  }): CookieInput {
    if (!input.name) {
      throw new ValidationError('cookies set requires a cookie name, or --curl <file>.');
    }
    if (input.value === undefined) {
      throw new ValidationError('cookies set requires a cookie value, or --curl <file>.');
    }
    return {
      name: input.name,
      value: input.value,
      ...(input.url ? { url: input.url } : {}),
      ...(input.domain ? { domain: input.domain } : {}),
      ...(input.path ? { path: input.path } : {}),
      ...(input.expires !== undefined ? { expires: input.expires } : {}),
      ...(input.httpOnly !== undefined ? { httpOnly: input.httpOnly } : {}),
      ...(input.secure !== undefined ? { secure: input.secure } : {}),
      ...(input.sameSite !== undefined ? { sameSite: input.sameSite } : {}),
    };
  }

  private applyCookieDefaults(cookie: CookieInput, tab: TabRuntime): CookieInput {
    const defaulted = {
      ...cookie,
      ...(cookie.path ? {} : { path: '/' }),
    };
    if (!defaulted.url && !defaulted.domain) {
      defaulted.url = this.currentHttpUrl(tab, 'Cookie defaulting');
    }
    validateCookieScope(defaulted);
    return defaulted;
  }

  private currentHttpUrl(tab: TabRuntime, operation: string): string {
    const url = tab.page.url();
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new ValidationError(`${operation} requires the active page to have an HTTP(S) URL.`);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new ValidationError(`${operation} requires the active page to have an HTTP(S) URL.`);
    }
    return url;
  }

  private currentHttpOrigin(tab: TabRuntime): string {
    const url = this.currentHttpUrl(tab, 'Storage access');
    return new URL(url).origin;
  }

  private launchSummary(session: SessionRuntime): Record<string, unknown> {
    const viewport = session.resolvedConfig.viewport;
    return {
      browser: session.browserVersion,
      headless: session.resolvedConfig.headless,
      ...(session.launchInput.configPath ? { configPath: session.launchInput.configPath } : {}),
      ...(session.launchInput.prefsPath ? { prefsPath: session.launchInput.prefsPath } : {}),
      ...(session.launchInput.preset?.length ? { preset: session.launchInput.preset } : {}),
      ...(session.resolvedConfig.proxy ? { proxy: session.resolvedConfig.proxy.server } : {}),
      ...(session.resolvedConfig.proxy?.bypass ? { proxyBypass: session.resolvedConfig.proxy.bypass } : {}),
      ...(session.resolvedConfig.extraHTTPHeaders ? { extraHTTPHeaders: session.resolvedConfig.extraHTTPHeaders } : {}),
      ...(session.resolvedConfig.userAgent ? { userAgent: session.resolvedConfig.userAgent } : {}),
      ...(session.resolvedConfig.ignoreHTTPSErrors !== undefined ? { ignoreHTTPSErrors: session.resolvedConfig.ignoreHTTPSErrors } : {}),
      ...(session.resolvedConfig.colorScheme ? { colorScheme: session.resolvedConfig.colorScheme } : {}),
      ...(session.resolvedConfig.reducedMotion ? { reducedMotion: session.resolvedConfig.reducedMotion } : {}),
      ...(session.resolvedConfig.initScripts.length > 0 ? { initScripts: session.resolvedConfig.initScripts } : {}),
      ...(session.launchInput.state ? { state: session.launchInput.state } : {}),
      ...(session.resolvedConfig.locale ? { locale: session.resolvedConfig.locale } : {}),
      ...(session.resolvedConfig.timezoneId ? { timezone: session.resolvedConfig.timezoneId } : {}),
      ...(viewport ? { viewport: { width: viewport.width, height: viewport.height } } : {}),
      ...(session.launchInput.region ? { region: session.launchInput.region } : {}),
      ...(session.launchInput.screenProfile ? { screenProfile: session.launchInput.screenProfile } : {}),
      ...(session.launchInput.windowProfile ? { windowProfile: session.launchInput.windowProfile } : {}),
      ...(session.launchInput.blockImages !== undefined ? { blockImages: session.launchInput.blockImages } : {}),
      ...(session.launchInput.blockWebRtc !== undefined ? { blockWebRtc: session.launchInput.blockWebRtc } : {}),
      ...(session.launchInput.blockWebGl !== undefined ? { blockWebGl: session.launchInput.blockWebGl } : {}),
      ...(session.launchInput.disableCoop !== undefined ? { disableCoop: session.launchInput.disableCoop } : {}),
    };
  }

  private locatorForFind(
    page: Page | Frame,
    tab: TabRuntime,
    input: {
      locatorType: 'role' | 'text' | 'label' | 'placeholder' | 'alt' | 'title' | 'testid' | 'first' | 'last' | 'nth';
      value?: string | undefined;
      target?: string | undefined;
      index?: number | undefined;
      name?: string | undefined;
      exact?: boolean | undefined;
    },
  ): Locator {
    if (input.locatorType === 'role') {
      if (!input.value) {
        throw new ValidationError('find role requires a role value.');
      }
      return page.getByRole(input.value as never, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.exact !== undefined ? { exact: input.exact } : {}),
      });
    }

    if (input.locatorType === 'text') {
      if (!input.value) {
        throw new ValidationError('find text requires a text value.');
      }
      return page.getByText(input.value, input.exact !== undefined ? { exact: input.exact } : undefined);
    }

    if (input.locatorType === 'label') {
      if (!input.value) {
        throw new ValidationError('find label requires a label value.');
      }
      return page.getByLabel(input.value, input.exact !== undefined ? { exact: input.exact } : undefined);
    }

    if (input.locatorType === 'placeholder') {
      if (!input.value) {
        throw new ValidationError('find placeholder requires a placeholder value.');
      }
      return page.getByPlaceholder(input.value, input.exact !== undefined ? { exact: input.exact } : undefined);
    }

    if (input.locatorType === 'alt') {
      if (!input.value) {
        throw new ValidationError('find alt requires an alt text value.');
      }
      return page.getByAltText(input.value, input.exact !== undefined ? { exact: input.exact } : undefined);
    }

    if (input.locatorType === 'title') {
      if (!input.value) {
        throw new ValidationError('find title requires a title value.');
      }
      return page.getByTitle(input.value, input.exact !== undefined ? { exact: input.exact } : undefined);
    }

    if (input.locatorType === 'testid') {
      if (!input.value) {
        throw new ValidationError('find testid requires a test id value.');
      }
      return page.getByTestId(input.value);
    }

    if (!input.target) {
      throw new ValidationError(`find ${input.locatorType} requires a selector or @ref target.`);
    }

    const selector = input.target.startsWith('@') ? tab.refMap.get(input.target) : input.target;
    if (!selector) {
      throw new ValidationError(`Ref ${input.target} was not found.`);
    }
    const locator = page.locator(selector);
    if (input.locatorType === 'first') {
      return locator.first();
    }
    if (input.locatorType === 'last') {
      return locator.last();
    }
    if (input.index === undefined) {
      throw new ValidationError('find nth requires an index.');
    }
    return locator.nth(input.index);
  }
}
