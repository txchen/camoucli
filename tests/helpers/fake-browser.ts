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
  frameState?: StoredPageState;
}

interface StoredPageState {
  url: string;
  title: string;
  html: string;
  elements: FakeElement[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

interface FakeCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
}

interface FakeRouteRegistration {
  url: string;
  handler: (route: FakeRoute, request: FakeRequest) => Promise<void>;
}

interface FakeRouteResult {
  action: 'continue' | 'abort' | 'fulfill';
  status?: number;
  body?: string;
  contentType?: string;
}

class FakeConsoleMessage {
  constructor(
    private readonly messageType: string,
    private readonly messageText: string,
    private readonly messageArgs: unknown[] = [],
  ) {}

  type(): string {
    return this.messageType;
  }

  text(): string {
    return this.messageText;
  }

  args(): unknown[] {
    return this.messageArgs;
  }

  location(): { url: string; lineNumber: number; columnNumber: number } {
    return { url: 'fake://console', lineNumber: 1, columnNumber: 1 };
  }
}

interface StoredProfileState {
  pages: StoredPageState[];
  cookies: FakeCookie[];
  origins: Array<{ origin: string; localStorage: Record<string, string> }>;
}

const profileStore = new Map<string, StoredProfileState>();
const launchLog: FakeLaunchRecord[] = [];
const contextLog: FakeBrowserContext[] = [];

function cloneState(state: StoredPageState): StoredPageState {
  return {
    url: state.url,
    title: state.title,
    html: state.html,
    localStorage: { ...state.localStorage },
    sessionStorage: { ...state.sessionStorage },
    elements: state.elements.map((element) => ({
      ...element,
      options: element.options ? [...element.options] : undefined,
      files: element.files ? [...element.files] : undefined,
      attributes: element.attributes ? { ...element.attributes } : undefined,
      frameState: element.frameState ? cloneState(element.frameState) : undefined,
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
    { regex: /<iframe([^>]*)>(.*?)<\/iframe>/gis, tag: 'iframe' },
    { regex: /<iframe([^>]*)>/gis, tag: 'iframe' },
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
      const srcdoc = /srcdoc=["']([^"']*)["']/i.exec(attrs)?.[1];
      const frameText = /data-frame-text=["']([^"']*)["']/i.exec(attrs)?.[1];
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
        frameState: pattern.tag === 'iframe' && (srcdoc || frameText) ? {
          url: `about:srcdoc#${id ?? elements.length + 1}`,
          title: /<title>(.*?)<\/title>/is.exec(srcdoc)?.[1]?.trim() ?? 'Frame',
          html: srcdoc ?? `<button id="inside">${frameText}</button>`,
          localStorage: {},
          sessionStorage: {},
          elements: parseElements(srcdoc ?? `<button id="inside">${frameText}</button>`),
        } : undefined,
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
      html,
      localStorage: {},
      sessionStorage: {},
      elements: parseElements(html),
    };
  }

  if (url.startsWith('https://example.com')) {
    const html = '<a href="https://www.iana.org/domains/example">Learn more</a>';
    return {
      url: 'https://example.com/',
      title: 'Example Domain',
      html,
      localStorage: {},
      sessionStorage: {},
      elements: [{ tag: 'a', text: 'Learn more', href: 'https://www.iana.org/domains/example' }],
    };
  }

  return {
    url,
    title: url,
    html: '',
    localStorage: {},
    sessionStorage: {},
    elements: [],
  };
}

class FakeDialog {
  accepted = false;
  dismissed = false;
  promptText?: string | undefined;

  constructor(
    private readonly dialogType: string,
    private readonly dialogMessage: string,
    private readonly dialogDefaultValue = '',
  ) {}

  type(): string {
    return this.dialogType;
  }

  message(): string {
    return this.dialogMessage;
  }

  defaultValue(): string {
    return this.dialogDefaultValue;
  }

  async accept(text?: string): Promise<void> {
    this.accepted = true;
    this.promptText = text;
  }

  async dismiss(): Promise<void> {
    this.dismissed = true;
  }
}

class FakeDownload {
  constructor(
    private readonly downloadUrl: string,
    private readonly filename: string,
    private readonly content: string,
  ) {}

  suggestedFilename(): string {
    return this.filename;
  }

  url(): string {
    return this.downloadUrl;
  }

  async failure(): Promise<string | null> {
    return null;
  }

  async saveAs(filePath: string): Promise<void> {
    await writeFile(filePath, this.content, 'utf8');
  }
}

class FakeRequest {
  private readonly startedAt = Date.now();
  private failedText?: string | undefined;

  constructor(
    private readonly requestUrl: string,
    private readonly requestPage: FakePage,
    private readonly requestMethod = 'GET',
    private readonly requestResourceType = 'document',
  ) {}

  url(): string {
    return this.requestUrl;
  }

  method(): string {
    return this.requestMethod;
  }

  resourceType(): string {
    return this.requestResourceType;
  }

  headers(): Record<string, string> {
    return {};
  }

  postData(): string | null {
    return null;
  }

  timing(): { startTime: number; responseEnd: number } {
    return { startTime: this.startedAt, responseEnd: Date.now() };
  }

  frame(): { page: () => FakePage } {
    return { page: () => this.requestPage };
  }

  failure(): { errorText: string } | null {
    return this.failedText ? { errorText: this.failedText } : null;
  }

  markFailed(errorText: string): void {
    this.failedText = errorText;
  }
}

class FakeResponse {
  constructor(
    private readonly responseRequest: FakeRequest,
    private readonly responseStatus: number,
    private readonly responseHeaders: Record<string, string> = {},
  ) {}

  request(): FakeRequest {
    return this.responseRequest;
  }

  status(): number {
    return this.responseStatus;
  }

  statusText(): string {
    return this.responseStatus >= 400 ? 'Error' : 'OK';
  }

  headers(): Record<string, string> {
    return { ...this.responseHeaders };
  }
}

class FakeRoute {
  result: FakeRouteResult | undefined;

  async continue(): Promise<void> {
    this.result = { action: 'continue' };
  }

  async abort(): Promise<void> {
    this.result = { action: 'abort' };
  }

  async fulfill(options: { status?: number; body?: string; contentType?: string }): Promise<void> {
    this.result = {
      action: 'fulfill',
      status: options.status ?? 200,
      body: options.body ?? '',
      contentType: options.contentType,
    };
  }
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

    if (element.attributes?.['data-dialog']) {
      this.page.openDialog(
        element.attributes['data-dialog'],
        element.attributes['data-dialog-message'] ?? element.text,
        element.attributes['data-dialog-default'] ?? '',
      );
      return;
    }

    if (element.attributes?.download !== undefined || element.attributes?.['data-download'] !== undefined) {
      await this.page.startDownload(
        element.href ?? '#',
        element.attributes.download || element.attributes['data-filename'] || 'download.txt',
        element.attributes['data-download'] ?? element.text,
      );
      return;
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

  async evaluate(pageFunction: unknown, arg?: unknown): Promise<unknown> {
    const element = this.resolveElement();
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }

    const source = String(pageFunction);
    if (source.includes('getComputedStyle')) {
      return { display: 'block', visibility: 'visible' };
    }
    if (source.includes('data-camoucli-highlight')) {
      element.attributes = { ...(element.attributes ?? {}), 'data-camoucli-highlighted': String(arg ?? true) };
      return undefined;
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

  async elementHandle(): Promise<{ contentFrame: () => Promise<FakeFrame | null> } | null> {
    const element = this.resolveElement();
    if (!element) {
      return null;
    }
    return {
      contentFrame: async () => element.frameState ? new FakeFrame(element.frameState) : null,
    };
  }
}

class FakeFrame {
  constructor(private readonly state: StoredPageState) {}

  url(): string {
    return this.state.url;
  }

  name(): string {
    return this.state.title;
  }

  locator(selector: string): FakeLocator {
    return new FakeLocator(new FakePage(this.state), selector);
  }

  getByText(text: string): FakeLocator {
    return this.locator(`text=${text}`);
  }

  getByRole(role: string, options?: { name?: string; exact?: boolean }): FakeLocator {
    return this.locator(`role=${role}${options?.name ? `[name=${options.name}]` : ''}${options?.exact ? '[exact]' : ''}`);
  }

  getByLabel(label: string): FakeLocator {
    return this.locator(`label=${label}`);
  }

  getByPlaceholder(placeholder: string): FakeLocator {
    return this.locator(`placeholder=${placeholder}`);
  }

  getByAltText(alt: string): FakeLocator {
    return this.locator(`alt=${alt}`);
  }

  getByTitle(title: string): FakeLocator {
    return this.locator(`title=${title}`);
  }

  getByTestId(testId: string): FakeLocator {
    return this.locator(`testid=${testId}`);
  }

  async evaluate(pageFunction: unknown, arg?: unknown): Promise<unknown> {
    return new FakePage(this.state).evaluate(pageFunction, arg);
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

  viewportSize?: { width: number; height: number } | undefined;
  media?: { colorScheme?: string | undefined; reducedMotion?: string | undefined } | undefined;

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
    const networkResult = await this.context?.dispatchRequest(this, url);
    if (networkResult?.action === 'abort') {
      throw new Error(`Request aborted: ${url}`);
    }
    const nextState = networkResult?.action === 'fulfill' && networkResult.body !== undefined
      ? {
          url,
          title: /<title>(.*?)<\/title>/is.exec(networkResult.body)?.[1]?.trim() ?? url,
          html: networkResult.body,
          localStorage: {},
          sessionStorage: {},
          elements: parseElements(networkResult.body),
        }
      : parsePageState(url);
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(cloneState(nextState));
    this.historyIndex = this.history.length - 1;
    this.state = cloneState(nextState);
    this.refs.clear();
    this.emit('framenavigated', this.mainFrameRef);
  }

  async waitForEvent(eventName: 'popup', options?: { timeout?: number }): Promise<FakePage>;
  async waitForEvent(eventName: 'download', options?: { timeout?: number }): Promise<FakeDownload>;
  async waitForEvent(eventName: string, options?: { timeout?: number }): Promise<FakePage | FakeDownload> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off(eventName, onEvent);
        reject(new Error(`Timed out waiting for ${eventName}`));
      }, options?.timeout ?? 30_000);
      const onEvent = (page: FakePage | FakeDownload) => {
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

  async startDownload(url: string, filename: string, content: string): Promise<FakeDownload> {
    const download = new FakeDownload(url, filename, content);
    this.emit('download', download);
    return download;
  }

  openDialog(type: string, message: string, defaultValue: string): FakeDialog {
    const dialog = new FakeDialog(type, message, defaultValue);
    this.emit('dialog', dialog);
    return dialog;
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

  async screenshot(options: { path: string; type?: string; fullPage?: boolean }): Promise<void> {
    const content = options.type === 'jpeg'
      ? Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x10, 0x00, 0x10, 0x03, 0xff, 0xd9])
      : Buffer.concat([
          Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'),
          Buffer.from([0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x08, 0x02, 0x00, 0x00, 0x00]),
          Buffer.from(`fake screenshot for ${this.state.url}\n`, 'utf8'),
        ]);
    await writeFile(options.path, content);
  }

  async setViewportSize(viewport: { width: number; height: number }): Promise<void> {
    this.viewportSize = { ...viewport };
  }

  async emulateMedia(media: { colorScheme?: string | undefined; reducedMotion?: string | undefined }): Promise<void> {
    this.media = { ...media };
  }

  emitConsole(type: string, text: string, args: unknown[] = []): void {
    this.emit('console', new FakeConsoleMessage(type, text, args));
  }

  emitPageError(error: Error): void {
    this.emit('pageerror', error);
  }

  isClosed(): boolean {
    return this.closed;
  }

  async close(): Promise<void> {
    this.closed = true;
    this.emit('close');
  }

  async evaluate(_pageFunction: unknown, arg?: unknown): Promise<unknown> {
    if (String(_pageFunction).includes('document.hasFocus')) {
      return true;
    }

    if (String(_pageFunction).includes('performance.getEntriesByType')) {
      return {
        url: this.state.url,
        timestamp: '2026-01-01T00:00:00.000Z',
        navigation: {
          startTime: 0,
          domContentLoaded: 20,
          load: 40,
          responseStart: 5,
          responseEnd: 15,
          transferSize: 128,
        },
        paints: { 'first-contentful-paint': 25 },
        webVitals: { ttfb: 5, fcp: 25 },
        resources: { count: 0, transferSize: 0, decodedBodySize: 0 },
      };
    }

    if (typeof arg === 'string' && String(_pageFunction).includes('history.pushState')) {
      try {
        const nextUrl = new URL(arg, this.state.url);
        const currentUrl = new URL(this.state.url);
        if (nextUrl.origin !== currentUrl.origin) {
          throw new Error('SecurityError: cross-origin pushState is not allowed');
        }
        const before = this.state.url;
        this.state = { ...this.state, url: nextUrl.href };
        this.history[this.historyIndex] = cloneState(this.state);
        return { before, after: this.state.url };
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    }

    if (arg && typeof arg === 'object' && 'method' in arg) {
      const options = arg as { method: 'readText' | 'writeText'; text?: string | undefined };
      if (!this.context) {
        throw new Error('Fake page is not attached to a context');
      }
      if (options.method === 'readText') {
        return this.context.clipboardText;
      }
      this.context.clipboardText = options.text ?? '';
      return undefined;
    }

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

    if (arg && typeof arg === 'object' && 'mode' in arg) {
      const options = arg as { mode?: 'text' | 'raw' | 'outline'; filter?: string | undefined };
      const matchesFilter = (value: string): boolean => !options.filter || value.toLowerCase().includes(options.filter.toLowerCase());
      if (options.mode === 'raw') {
        return { content: this.state.html, items: [] };
      }
      if (options.mode === 'outline') {
        const items = this.state.elements
          .filter((element) => ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'input', 'textarea', 'select'].includes(element.tag))
          .map((element) => ({
            tag: element.tag,
            text: element.text,
            href: element.href,
            label: [element.tag, element.text, element.href].filter(Boolean).join(' '),
          }))
          .filter((item) => matchesFilter(item.label));
        return {
          content: items.map((item) => `${item.tag}${item.text ? ` ${item.text}` : ''}${item.href ? ` ${item.href}` : ''}`).join('\n'),
          items,
        };
      }
      const lines = this.state.elements.map((element) => element.value || element.text).filter(Boolean);
      const filtered = options.filter ? lines.filter(matchesFilter) : lines;
      return { content: filtered.join('\n'), items: filtered.map((line) => ({ text: line })) };
    }

    if (arg && typeof arg === 'object' && 'interactiveOnly' in arg) {
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

    if (arg && typeof arg === 'object' && 'kind' in arg) {
      const options = arg as { kind: 'localStorage' | 'sessionStorage'; key?: string | undefined; value?: string | undefined };
      const storage = this.storageFor(options.kind);
      const source = String(_pageFunction);
      if (source.includes('setItem')) {
        storage[options.key ?? ''] = options.value ?? '';
        return undefined;
      }
      if (source.includes('removeItem')) {
        delete storage[options.key ?? ''];
        return undefined;
      }
      if (source.includes('clear')) {
        for (const key of Object.keys(storage)) {
          delete storage[key];
        }
        return undefined;
      }
      if (options.key !== undefined) {
        return { [options.key]: storage[options.key] ?? null };
      }
      return { ...storage };
    }

    if (Array.isArray(arg)) {
      for (const item of arg as Array<{ name: string; value: string }>) {
        this.storageFor('localStorage')[item.name] = item.value;
      }
      return undefined;
    }

    if (!arg || typeof arg !== 'object') {
      this.refs.clear();
      return undefined;
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

  localStorageSnapshot(): Record<string, string> {
    return { ...this.storageFor('localStorage') };
  }

  private storageFor(kind: 'localStorage' | 'sessionStorage'): Record<string, string> {
    if (kind === 'sessionStorage') {
      return this.state.sessionStorage;
    }
    const origin = this.httpOrigin();
    if (!origin || !this.context) {
      return this.state.localStorage;
    }
    return this.context.localStorageForOrigin(origin);
  }

  private httpOrigin(): string | undefined {
    try {
      const parsed = new URL(this.state.url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.origin : undefined;
    } catch {
      return undefined;
    }
  }
}

export class FakeBrowserContext extends EventEmitter {
  private pagesList: FakePage[];
  private cookiesList: FakeCookie[];
  private readonly localStorageByOrigin = new Map<string, Record<string, string>>();
  private readonly routes: FakeRouteRegistration[] = [];
  private closed = false;
  geolocation?: { latitude: number; longitude: number; accuracy?: number | undefined } | undefined;
  offline = false;
  headers: Record<string, string> = {};
  credentials?: { origin?: string | undefined; username: string; password: string } | undefined;
  clipboardText = '';
  initScripts: string[] = [];
  tracingStarted = false;
  tracingOptions?: { screenshots?: boolean; snapshots?: boolean; sources?: boolean } | undefined;

  readonly tracing = {
    start: async (options: { screenshots?: boolean; snapshots?: boolean; sources?: boolean }) => {
      this.tracingStarted = true;
      this.tracingOptions = { ...options };
    },
    stop: async (options: { path: string }) => {
      if (!this.tracingStarted) {
        throw new Error('Tracing is not active');
      }
      this.tracingStarted = false;
      await writeFile(options.path, 'fake trace zip\n', 'utf8');
    },
  };

  constructor(private readonly profileDir: string, initialPages: StoredPageState[], initialCookies: FakeCookie[], initialOrigins: Array<{ origin: string; localStorage: Record<string, string> }>) {
    super();
    for (const origin of initialOrigins) {
      this.localStorageByOrigin.set(origin.origin, { ...origin.localStorage });
    }
    this.pagesList = initialPages.map((state) => new FakePage(state, this));
    this.cookiesList = initialCookies.map((cookie) => ({ ...cookie }));
  }

  pages(): FakePage[] {
    return this.pagesList.filter((page) => !page.isClosed());
  }

  pageAt(index: number): FakePage | undefined {
    return this.pages()[index];
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

  async clearCookies(): Promise<void> {
    this.cookiesList = [];
  }

  async storageState(): Promise<{ cookies: FakeCookie[]; origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }> }> {
    return {
      cookies: await this.cookies(),
      origins: Array.from(this.localStorageByOrigin.entries()).map(([origin, values]) => ({
        origin,
        localStorage: Object.entries(values).map(([name, value]) => ({ name, value })),
      })),
    };
  }

  localStorageForOrigin(origin: string): Record<string, string> {
    const existing = this.localStorageByOrigin.get(origin);
    if (existing) {
      return existing;
    }
    const created: Record<string, string> = {};
    this.localStorageByOrigin.set(origin, created);
    return created;
  }

  async setGeolocation(geolocation: { latitude: number; longitude: number; accuracy?: number | undefined }): Promise<void> {
    this.geolocation = { ...geolocation };
  }

  async setOffline(value: boolean): Promise<void> {
    this.offline = value;
  }

  async setExtraHTTPHeaders(headers: Record<string, string>): Promise<void> {
    this.headers = { ...headers };
  }

  async setHTTPCredentials(credentials: { origin?: string | undefined; username: string; password: string }): Promise<void> {
    this.credentials = { ...credentials };
  }

  async addInitScript(script: string): Promise<void> {
    this.initScripts.push(script);
  }

  async route(url: string, handler: (route: FakeRoute, request: FakeRequest) => Promise<void>): Promise<void> {
    this.routes.push({ url, handler });
  }

  async unroute(url: string, handler?: (route: FakeRoute, request: FakeRequest) => Promise<void>): Promise<void> {
    const index = this.routes.findIndex((route) => route.url === url && (!handler || route.handler === handler));
    if (index >= 0) {
      this.routes.splice(index, 1);
    }
  }

  routeCount(): number {
    return this.routes.length;
  }

  async dispatchRequest(page: FakePage, url: string): Promise<FakeRouteResult> {
    const request = new FakeRequest(url, page);
    this.emit('request', request);
    const registration = this.routes.find((route) => routeUrlMatches(route.url, url));
    if (registration) {
      const route = new FakeRoute();
      await registration.handler(route, request);
      const result = route.result ?? { action: 'continue' };
      if (result.action === 'abort') {
        request.markFailed('net::ERR_FAILED');
        this.emit('requestfailed', request);
        return result;
      }
      this.emit('response', new FakeResponse(request, result.action === 'fulfill' ? result.status ?? 200 : 200, result.contentType ? { 'content-type': result.contentType } : {}));
      return result;
    }

    const result = { action: 'continue' } as const;
    this.emit('response', new FakeResponse(request, 200));
    return result;
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
      origins: Array.from(this.localStorageByOrigin.entries()).map(([origin, localStorage]) => ({ origin, localStorage: { ...localStorage } })),
    });
    this.emit('close');
  }
}

function routeUrlMatches(pattern: string, url: string): boolean {
  if (pattern === url) {
    return true;
  }
  if (!pattern.includes('*')) {
    return false;
  }
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/gu, '\\$&').replace(/\*/gu, '.*');
  return new RegExp(`^${escaped}$`, 'u').test(url);
}

export function createFakeBrowserContext(profileDir: string): FakeBrowserContext {
  const stored = profileStore.get(profileDir);
  const initialPages = stored?.pages ?? [parsePageState('about:blank')];
  const initialCookies = stored?.cookies ?? [];
  const initialOrigins = stored?.origins ?? [];
  const context = new FakeBrowserContext(profileDir, initialPages, initialCookies, initialOrigins);
  contextLog.push(context);
  return context;
}

export function resetFakeBrowserState(): void {
  profileStore.clear();
  launchLog.length = 0;
  contextLog.length = 0;
}

export function recordFakeLaunch(record: FakeLaunchRecord): void {
  launchLog.push(record);
}

export function getFakeLaunchLog(): FakeLaunchRecord[] {
  return [...launchLog];
}

export function getFakeContexts(): FakeBrowserContext[] {
  return [...contextLog];
}

export function getProfileState(profileDir: string): StoredPageState[] | undefined {
  return profileStore.get(profileDir)?.pages.map((page) => ({
    url: page.url,
    title: page.title,
    html: page.html,
    localStorage: { ...page.localStorage },
    sessionStorage: { ...page.sessionStorage },
    elements: page.elements.map((element) => ({ ...element })),
  }));
}

export function getFakeArtifactPath(rootDir: string, version: string): string {
  return path.join(rootDir, 'camoufox-cache', 'browsers', 'official', version, 'camoufox-bin');
}
