import { EventEmitter } from 'node:events';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface FakeLaunchRecord {
  sessionName: string;
  profileDir: string;
  browserVersion: string;
}

interface FakeElement {
  id?: string;
  tag: string;
  text: string;
  href?: string;
  placeholder?: string;
  alt?: string;
  title?: string;
  testId?: string;
  inputType?: string;
  value?: string;
  checked?: boolean;
  options?: string[];
  files?: string[];
  attributes?: Record<string, string>;
}

interface StoredPageState {
  url: string;
  title: string;
  elements: FakeElement[];
}

interface FakeCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
}

interface StoredProfileState {
  pages: StoredPageState[];
  cookies: FakeCookie[];
}

const profileStore = new Map<string, StoredProfileState>();
const launchLog: FakeLaunchRecord[] = [];

function cloneState(state: StoredPageState): StoredPageState {
  return {
    url: state.url,
    title: state.title,
    elements: state.elements.map((element) => ({
      ...element,
      options: element.options ? [...element.options] : undefined,
      files: element.files ? [...element.files] : undefined,
      attributes: element.attributes ? { ...element.attributes } : undefined,
    })),
  };
}

function decodeDataUrl(url: string): string {
  const index = url.indexOf(',');
  if (!url.startsWith('data:') || index === -1) {
    return '';
  }
  return decodeURIComponent(url.slice(index + 1));
}

function parseElements(html: string): FakeElement[] {
  const elements: FakeElement[] = [];
  const patterns = [
    { regex: /<a([^>]*)>(.*?)<\/a>/gis, tag: 'a' },
    { regex: /<button([^>]*)>(.*?)<\/button>/gis, tag: 'button' },
    { regex: /<input([^>]*)>/gis, tag: 'input' },
    { regex: /<textarea([^>]*)>(.*?)<\/textarea>/gis, tag: 'textarea' },
    { regex: /<select([^>]*)>(.*?)<\/select>/gis, tag: 'select' },
    { regex: /<img([^>]*)>/gis, tag: 'img' },
    { regex: /<div([^>]*)>(.*?)<\/div>/gis, tag: 'div' },
    { regex: /<p([^>]*)>(.*?)<\/p>/gis, tag: 'p' },
  ] as const;

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(html)) !== null) {
      const attrs = match[1] ?? '';
      const body = (match[2] ?? '').replace(/<[^>]+>/g, '').trim();
      const id = /id=["']([^"']+)["']/i.exec(attrs)?.[1];
      const href = /href=["']([^"']+)["']/i.exec(attrs)?.[1];
      const placeholder = /placeholder=["']([^"']+)["']/i.exec(attrs)?.[1];
      const alt = /alt=["']([^"']+)["']/i.exec(attrs)?.[1];
      const title = /title=["']([^"']+)["']/i.exec(attrs)?.[1];
      const testId = /data-testid=["']([^"']+)["']/i.exec(attrs)?.[1];
      const inputType = /type=["']([^"']+)["']/i.exec(attrs)?.[1] ?? (pattern.tag === 'input' ? 'text' : undefined);
      const checked = /checked/i.test(attrs);
      const attributePairs = Array.from(attrs.matchAll(/([a-zA-Z_:][a-zA-Z0-9_:.-]*)=["']([^"']*)["']/g));
      const attributes = Object.fromEntries(attributePairs.map((attributeMatch) => [attributeMatch[1]!, attributeMatch[2]!]));
      const optionMatches = Array.from((match[2] ?? '').matchAll(/<option([^>]*)>(.*?)<\/option>/gis));
      const options = optionMatches.map((optionMatch) => {
        const optionAttrs = optionMatch[1] ?? '';
        const optionText = (optionMatch[2] ?? '').replace(/<[^>]+>/g, '').trim();
        return /value=["']([^"']+)["']/i.exec(optionAttrs)?.[1] ?? optionText;
      });
      const selectedOption =
        optionMatches.find((optionMatch) => /selected/i.test(optionMatch[1] ?? '')) ?? optionMatches[0];
      const selectedValue = selectedOption
        ? /value=["']([^"']+)["']/i.exec(selectedOption[1] ?? '')?.[1] ?? (selectedOption[2] ?? '').replace(/<[^>]+>/g, '').trim()
        : undefined;
      elements.push({
        id,
        tag: pattern.tag,
        text: body || placeholder || alt || title || pattern.tag,
        href,
        placeholder,
        alt,
        title,
        testId,
        inputType,
        value: pattern.tag === 'select' ? selectedValue ?? '' : body || '',
        checked: pattern.tag === 'input' ? checked : undefined,
        options: pattern.tag === 'select' ? options : undefined,
        attributes,
      });
    }
  }

  return elements;
}

function parsePageState(url: string): StoredPageState {
  if (url.startsWith('data:')) {
    const html = decodeDataUrl(url);
    const title = /<title>(.*?)<\/title>/is.exec(html)?.[1]?.trim() ?? 'Data Page';
    return {
      url,
      title,
      elements: parseElements(html),
    };
  }

  if (url.startsWith('https://example.com')) {
    return {
      url: 'https://example.com/',
      title: 'Example Domain',
      elements: [{ tag: 'a', text: 'Learn more', href: 'https://www.iana.org/domains/example' }],
    };
  }

  return {
    url,
    title: url,
    elements: [],
  };
}

class FakeLocator {
  constructor(
    private readonly page: FakePage,
    private readonly selector: string,
    private readonly index?: number | 'last',
  ) {}

  private resolveElement(): FakeElement | undefined {
    return this.page.resolveElement(this.selector, this.index);
  }

  async click(): Promise<void> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }

    if (element.href && element.href !== '#') {
      if (element.attributes?.target === '_blank') {
        await this.page.openPopup(element.href);
        return;
      }
      await this.page.goto(element.href);
    }
  }

  async dblclick(): Promise<void> {
    await this.click();
  }

  async hover(): Promise<void> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }
  }

  async focus(): Promise<void> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }
  }

  async fill(value: string): Promise<void> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }

    element.value = value;
    element.text = value;
  }

  async type(value: string): Promise<void> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }

    const nextValue = `${element.value ?? ''}${value}`;
    element.value = nextValue;
    element.text = nextValue;
  }

  async check(): Promise<void> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }

    element.checked = true;
  }

  async uncheck(): Promise<void> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }

    element.checked = false;
  }

  async selectOption(value: string | string[]): Promise<void> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }

    const values = Array.isArray(value) ? value : [value];
    element.value = values.join(',');
    if (values.every((item) => element.options?.includes(item))) {
      element.text = values.join(',');
    }
  }

  async innerText(): Promise<string> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }

    return element.text;
  }

  async innerHTML(): Promise<string> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }

    return element.text;
  }

  async inputValue(): Promise<string> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }

    return element.value ?? '';
  }

  async getAttribute(attribute: string): Promise<string | null> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }

    return element.attributes?.[attribute] ?? null;
  }

  async count(): Promise<number> {
    return this.page.resolveElements(this.selector).length;
  }

  async boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null> {
    const element = this.resolveElement();
    if (!element) {
      return null;
    }

    return { x: 10, y: 20, width: 100, height: 30 };
  }

  async isVisible(): Promise<boolean> {
    return Boolean(this.resolveElement());
  }

  async isEnabled(): Promise<boolean> {
    return Boolean(this.resolveElement());
  }

  async isChecked(): Promise<boolean> {
    return Boolean(this.resolveElement()?.checked);
  }

  async setInputFiles(files: string[]): Promise<void> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }

    element.files = [...files];
  }

  async dragTo(target: FakeLocator): Promise<void> {
    const sourceElement = this.resolveElement();
    const targetElement = target.resolveElement();
    if (!sourceElement || !targetElement) {
      throw new Error('Drag source or target was not found');
    }
  }

  async evaluate(pageFunction: unknown): Promise<unknown> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }

    const source = String(pageFunction);
    if (source.includes('getComputedStyle')) {
      return { display: 'block', visibility: 'visible' };
    }

    return undefined;
  }

  async screenshot(options?: { path?: string }): Promise<void> {
    if (!this.resolveElement()) {
      throw new Error(`No element matches ${this.selector}`);
    }
    if (options?.path) {
      await writeFile(options.path, `fake element screenshot for ${this.selector}\n`, 'utf8');
    }
  }

  async scrollIntoViewIfNeeded(): Promise<void> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }
  }

  first(): FakeLocator {
    return new FakeLocator(this.page, this.selector, 0);
  }

  last(): FakeLocator {
    return new FakeLocator(this.page, this.selector, 'last');
  }

  nth(index: number): FakeLocator {
    return new FakeLocator(this.page, this.selector, index);
  }

  async waitFor(): Promise<void> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }
  }
}

class FakePage extends EventEmitter {
  private state: StoredPageState;
  private history: StoredPageState[];
  private historyIndex: number;
  private readonly mainFrameRef = {};
  private closed = false;
  private refs = new Map<string, FakeElement>();

  readonly keyboard = {
    press: async (_key: string) => undefined,
    down: async (_key: string) => undefined,
    up: async (_key: string) => undefined,
    type: async (_text: string) => undefined,
    insertText: async (_text: string) => undefined,
  };

  readonly mouse = {
    move: async (_x: number, _y: number) => undefined,
    down: async (_options?: { button?: string }) => undefined,
    up: async (_options?: { button?: string }) => undefined,
    wheel: async (_deltaX: number, _deltaY: number) => undefined,
  };

  constructor(initialState: StoredPageState, private readonly context?: FakeBrowserContext | undefined) {
    super();
    this.state = cloneState(initialState);
    this.history = [cloneState(initialState)];
    this.historyIndex = 0;
  }

  mainFrame(): object {
    return this.mainFrameRef;
  }

  async goto(url: string): Promise<void> {
    const nextState = parsePageState(url);
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(cloneState(nextState));
    this.historyIndex = this.history.length - 1;
    this.state = cloneState(nextState);
    this.refs.clear();
    this.emit('framenavigated', this.mainFrameRef);
  }

  async waitForEvent(eventName: 'popup', options?: { timeout?: number }): Promise<FakePage> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off(eventName, onEvent);
        reject(new Error(`Timed out waiting for ${eventName}`));
      }, options?.timeout ?? 30_000);
      const onEvent = (page: FakePage) => {
        clearTimeout(timeout);
        resolve(page);
      };
      this.once(eventName, onEvent);
    });
  }

  async openPopup(url: string): Promise<FakePage> {
    const popup = await this.context?.newPage(url);
    if (!popup) {
      throw new Error('Fake page is not attached to a context');
    }
    this.emit('popup', popup);
    return popup;
  }

  async goBack(): Promise<FakePage | null> {
    if (this.historyIndex === 0) {
      return null;
    }

    this.historyIndex -= 1;
    this.state = cloneState(this.history[this.historyIndex]!);
    this.refs.clear();
    this.emit('framenavigated', this.mainFrameRef);
    return this;
  }

  async goForward(): Promise<FakePage | null> {
    if (this.historyIndex >= this.history.length - 1) {
      return null;
    }

    this.historyIndex += 1;
    this.state = cloneState(this.history[this.historyIndex]!);
    this.refs.clear();
    this.emit('framenavigated', this.mainFrameRef);
    return this;
  }

  async reload(): Promise<FakePage> {
    this.state = cloneState(this.history[this.historyIndex]!);
    this.refs.clear();
    this.emit('framenavigated', this.mainFrameRef);
    return this;
  }

  async waitForLoadState(): Promise<void> {
    return undefined;
  }

  async waitForURL(_url: string): Promise<void> {
    return undefined;
  }

  async waitForFunction(expression: string): Promise<void> {
    const location = { href: this.state.url };
    const document = { title: this.state.title };
    const result = Function('document', 'location', `return (${expression});`)(document, location);
    if (!result) {
      throw new Error(`Function predicate did not match: ${expression}`);
    }
  }

  url(): string {
    return this.state.url;
  }

  async title(): Promise<string> {
    return this.state.title;
  }

  locator(selector: string): FakeLocator {
    return new FakeLocator(this, selector);
  }

  getByText(text: string): FakeLocator {
    return new FakeLocator(this, `text=${text}`);
  }

  getByRole(role: string, options?: { name?: string; exact?: boolean }): FakeLocator {
    return new FakeLocator(this, `role=${role}${options?.name ? `[name=${options.name}]` : ''}${options?.exact ? '[exact]' : ''}`);
  }

  getByLabel(label: string): FakeLocator {
    return new FakeLocator(this, `label=${label}`);
  }

  getByPlaceholder(placeholder: string): FakeLocator {
    return new FakeLocator(this, `placeholder=${placeholder}`);
  }

  getByAltText(alt: string): FakeLocator {
    return new FakeLocator(this, `alt=${alt}`);
  }

  getByTitle(title: string): FakeLocator {
    return new FakeLocator(this, `title=${title}`);
  }

  getByTestId(testId: string): FakeLocator {
    return new FakeLocator(this, `testid=${testId}`);
  }

  async screenshot(options: { path: string }): Promise<void> {
    await writeFile(options.path, `fake screenshot for ${this.state.url}\n`, 'utf8');
  }

  isClosed(): boolean {
    return this.closed;
  }

  async close(): Promise<void> {
    this.closed = true;
    this.emit('close');
  }

  async evaluate(_pageFunction: unknown, arg?: unknown): Promise<unknown> {
    if (typeof arg === 'string') {
      const location = { href: this.state.url };
      const document = { title: this.state.title };
      const window = { location, document };

      try {
        return Function('document', 'location', 'window', `return (${arg});`)(document, location, window);
      } catch {
        if (arg === 'document.title') {
          return this.state.title;
        }
        if (arg === 'location.href' || arg === 'window.location.href') {
          return this.state.url;
        }
        return undefined;
      }
    }

    if (!arg || typeof arg !== 'object') {
      this.refs.clear();
      return undefined;
    }

    if ('interactiveOnly' in arg) {
      const interactiveOnly = Boolean((arg as { interactiveOnly?: boolean }).interactiveOnly);
      const elements = this.state.elements.filter((element) =>
        interactiveOnly ? ['a', 'button', 'input', 'textarea', 'select'].includes(element.tag) : true,
      );

      this.refs.clear();
      return elements.map((element, index) => {
        const refId = `e${index + 1}`;
        const selector = `[data-camoucli-ref="${refId}"]`;
        this.refs.set(selector, element);
        return {
          ref: `@${refId}`,
          selector,
          tag: element.tag,
          inputType: element.inputType,
          text: element.value || element.text,
        };
      });
    }

    this.refs.clear();
    return undefined;
  }

  resolveElement(selector: string, index?: number | 'last'): FakeElement | undefined {
    const elements = this.resolveElements(selector);
    if (index === 'last') {
      return elements.at(-1);
    }
    return elements[index ?? 0];
  }

  resolveElements(selector: string): FakeElement[] {
    if (selector.startsWith('[data-camoucli-ref=')) {
      const element = this.refs.get(selector);
      return element ? [element] : [];
    }

    if (selector.startsWith('text=')) {
      const text = selector.slice('text='.length);
      return this.state.elements.filter((element) => element.text.includes(text));
    }

    if (selector.startsWith('role=')) {
      const role = /^role=([^\[]+)/u.exec(selector)?.[1] ?? '';
      const name = /\[name=([^\]]+)\]/u.exec(selector)?.[1];
      return this.state.elements.filter((element) => {
        const elementRole =
          element.tag === 'a'
            ? 'link'
            : element.tag === 'button'
              ? 'button'
              : element.tag === 'select'
                ? 'combobox'
                : element.tag === 'textarea' || (element.tag === 'input' && element.inputType !== 'checkbox')
                  ? 'textbox'
                  : element.tag === 'input' && element.inputType === 'checkbox'
                    ? 'checkbox'
                    : element.tag;
        return elementRole === role && (!name || element.text.includes(name));
      });
    }

    if (selector.startsWith('label=')) {
      const label = selector.slice('label='.length);
      return this.state.elements.filter((element) => element.text.includes(label) || element.id === label);
    }

    if (selector.startsWith('placeholder=')) {
      const placeholder = selector.slice('placeholder='.length);
      return this.state.elements.filter((element) => element.placeholder?.includes(placeholder));
    }

    if (selector.startsWith('alt=')) {
      const alt = selector.slice('alt='.length);
      return this.state.elements.filter((element) => element.alt?.includes(alt));
    }

    if (selector.startsWith('title=')) {
      const title = selector.slice('title='.length);
      return this.state.elements.filter((element) => element.title?.includes(title));
    }

    if (selector.startsWith('testid=')) {
      const testId = selector.slice('testid='.length);
      return this.state.elements.filter((element) => element.testId === testId);
    }

    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return this.state.elements.filter((element) => element.id === id);
    }

    return this.state.elements.filter((element) => element.tag === selector);
  }

  serialize(): StoredPageState {
    return cloneState(this.state);
  }
}

export class FakeBrowserContext extends EventEmitter {
  private pagesList: FakePage[];
  private cookiesList: FakeCookie[];
  private closed = false;

  constructor(private readonly profileDir: string, initialPages: StoredPageState[], initialCookies: FakeCookie[]) {
    super();
    this.pagesList = initialPages.map((state) => new FakePage(state, this));
    this.cookiesList = initialCookies.map((cookie) => ({ ...cookie }));
  }

  pages(): FakePage[] {
    return this.pagesList.filter((page) => !page.isClosed());
  }

  async newPage(url = 'about:blank'): Promise<FakePage> {
    const page = new FakePage(parsePageState(url), this);
    this.pagesList.push(page);
    return page;
  }

  async cookies(): Promise<FakeCookie[]> {
    return this.cookiesList.map((cookie) => ({ ...cookie }));
  }

  async addCookies(cookies: FakeCookie[]): Promise<void> {
    this.cookiesList = cookies.map((cookie) => ({ ...cookie }));
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;
    profileStore.set(this.profileDir, {
      pages: this.pages()
        .map((page) => page.serialize())
        .filter((page) => page.url !== 'about:blank'),
      cookies: this.cookiesList.map((cookie) => ({ ...cookie })),
    });
    this.emit('close');
  }
}

export function createFakeBrowserContext(profileDir: string): FakeBrowserContext {
  const stored = profileStore.get(profileDir);
  const initialPages = stored?.pages ?? [parsePageState('about:blank')];
  const initialCookies = stored?.cookies ?? [];
  return new FakeBrowserContext(profileDir, initialPages, initialCookies);
}

export function resetFakeBrowserState(): void {
  profileStore.clear();
  launchLog.length = 0;
}

export function recordFakeLaunch(record: FakeLaunchRecord): void {
  launchLog.push(record);
}

export function getFakeLaunchLog(): FakeLaunchRecord[] {
  return [...launchLog];
}

export function getProfileState(profileDir: string): StoredPageState[] | undefined {
  return profileStore.get(profileDir)?.pages.map((page) => ({
    url: page.url,
    title: page.title,
    elements: page.elements.map((element) => ({ ...element })),
  }));
}

export function getFakeArtifactPath(rootDir: string, version: string): string {
  return path.join(rootDir, 'camoufox-cache', 'browsers', 'official', version, 'camoufox-bin');
}
