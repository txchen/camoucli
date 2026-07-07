import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import type { Locator, Page } from 'playwright-core';

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

  async dblclick(input: LaunchInput & { session: string; tabName: string; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).dblclick();
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

  async focus(input: LaunchInput & { session: string; tabName: string; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).focus();
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

  async type(
    input: LaunchInput & { session: string; tabName: string; target: string; text: string; clear?: boolean | undefined; delayMs?: number | undefined },
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

  async select(input: LaunchInput & { session: string; tabName: string; target: string; value: string | string[] }): Promise<Record<string, unknown>> {
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

  async keyboardDown(input: LaunchInput & { session: string; tabName: string; key: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.keyboard.down(input.key);
    return {
      sessionName: input.session,
      tabName: tab.name,
      key: input.key,
    };
  }

  async keyboardUp(input: LaunchInput & { session: string; tabName: string; key: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.keyboard.up(input.key);
    return {
      sessionName: input.session,
      tabName: tab.name,
      key: input.key,
    };
  }

  async keyboardType(
    input: LaunchInput & { session: string; tabName: string; text: string; delayMs?: number | undefined },
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

  async keyboardInsertText(input: LaunchInput & { session: string; tabName: string; text: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.keyboard.insertText(input.text);
    return {
      sessionName: input.session,
      tabName: tab.name,
      valueLength: input.text.length,
    };
  }

  async mouseMove(input: LaunchInput & { session: string; tabName: string; x: number; y: number }): Promise<Record<string, unknown>> {
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
    input: LaunchInput & { session: string; tabName: string; button?: 'left' | 'right' | 'middle' | undefined },
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
    input: LaunchInput & { session: string; tabName: string; button?: 'left' | 'right' | 'middle' | undefined },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await tab.page.mouse.up(input.button ? { button: input.button } : undefined);
    return {
      sessionName: input.session,
      tabName: tab.name,
      button: input.button ?? 'left',
    };
  }

  async mouseWheel(input: LaunchInput & { session: string; tabName: string; deltaX: number; deltaY: number }): Promise<Record<string, unknown>> {
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
    input: LaunchInput & { session: string; tabName: string; direction?: 'up' | 'down' | 'left' | 'right' | undefined; amount?: number | undefined; target?: string | undefined },
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

  async scrollIntoView(input: LaunchInput & { session: string; tabName: string; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.target).scrollIntoViewIfNeeded();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
    };
  }

  async upload(input: LaunchInput & { session: string; tabName: string; target: string; files: string[] }): Promise<Record<string, unknown>> {
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

  async drag(input: LaunchInput & { session: string; tabName: string; source: string; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    await locatorForTarget(tab.page, tab, input.source).dragTo(locatorForTarget(tab.page, tab, input.target));
    return {
      sessionName: input.session,
      tabName: tab.name,
      source: input.source,
      target: input.target,
    };
  }

  async eval(input: LaunchInput & { session: string; tabName: string; expression: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    return {
      sessionName: input.session,
      tabName: tab.name,
      expression: input.expression,
      result: await tab.page.evaluate((expression) => globalThis.eval(expression), input.expression),
    };
  }

  async screenshot(
    input: LaunchInput & {
      session: string;
      tabName: string;
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

  async getHtml(input: LaunchInput & { session: string; tabName: string; target: string }): Promise<Record<string, unknown>> {
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
    input: LaunchInput & { session: string; tabName: string; target: string; attribute: string },
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

  async getCount(input: LaunchInput & { session: string; tabName: string; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const count = await locatorForTarget(tab.page, tab, input.target).count();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      count,
    };
  }

  async getBox(input: LaunchInput & { session: string; tabName: string; target: string }): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    const box = await locatorForTarget(tab.page, tab, input.target).boundingBox();
    return {
      sessionName: input.session,
      tabName: tab.name,
      target: input.target,
      box,
    };
  }

  async getStyles(input: LaunchInput & { session: string; tabName: string; target: string }): Promise<Record<string, unknown>> {
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
    input: LaunchInput & { action: 'is.visible' | 'is.enabled' | 'is.checked'; session: string; tabName: string; target: string },
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
      tabName: string;
      ms?: number | undefined;
      target?: string | undefined;
      text?: string | undefined;
      loadState?: 'domcontentloaded' | 'load' | 'networkidle' | undefined;
      url?: string | undefined;
      fn?: string | undefined;
      timeoutMs?: number | undefined;
    },
  ): Promise<Record<string, unknown>> {
    const tab = await this.ensureTab(input.session, input.tabName, input);
    if (input.ms === undefined && !input.target && !input.text && !input.loadState && !input.url && !input.fn) {
      throw new ValidationError('wait requires milliseconds, a target, --text value, --load state, --url pattern, or --fn predicate.');
    }

    const waitOptions = input.timeoutMs ? { timeout: input.timeoutMs } : undefined;
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
      url: tab.page.url(),
    };
  }

  async find(
    input: LaunchInput & {
      session: string;
      tabName: string;
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
    const locator = this.locatorForFind(tab.page, tab, input);
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

  private locatorForFind(
    page: Page,
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

    const locator = locatorForTarget(page, tab, input.target);
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
