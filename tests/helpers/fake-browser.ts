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
  inputType?: string;
  value?: string;
}

interface StoredPageState {
  url: string;
  title: string;
  elements: FakeElement[];
}

const profileStore = new Map<string, StoredPageState[]>();
const launchLog: FakeLaunchRecord[] = [];

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
      const inputType = /type=["']([^"']+)["']/i.exec(attrs)?.[1] ?? (pattern.tag === 'input' ? 'text' : undefined);
      elements.push({
        id,
        tag: pattern.tag,
        text: body || placeholder || pattern.tag,
        href,
        inputType,
        value: body || '',
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
  ) {}

  async click(): Promise<void> {
    const element = this.page.resolveElement(this.selector);
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }

    if (element.href && element.href !== '#') {
      await this.page.goto(element.href);
    }
  }

  async fill(value: string): Promise<void> {
    const element = this.page.resolveElement(this.selector);
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }

    element.value = value;
    element.text = value;
  }

  async innerText(): Promise<string> {
    const element = this.page.resolveElement(this.selector);
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }

    return element.text;
  }

  async waitFor(): Promise<void> {
    const element = this.page.resolveElement(this.selector);
    if (!element) {
      throw new Error(`No element matches ${this.selector}`);
    }
  }
}

class FakePage extends EventEmitter {
  private state: StoredPageState;
  private readonly mainFrameRef = {};
  private closed = false;
  private refs = new Map<string, FakeElement>();

  readonly keyboard = {
    press: async (_key: string) => undefined,
  };

  constructor(initialState: StoredPageState) {
    super();
    this.state = initialState;
  }

  mainFrame(): object {
    return this.mainFrameRef;
  }

  async goto(url: string): Promise<void> {
    this.state = parsePageState(url);
    this.refs.clear();
    this.emit('framenavigated', this.mainFrameRef);
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

  resolveElement(selector: string): FakeElement | undefined {
    if (selector.startsWith('[data-camoucli-ref=')) {
      return this.refs.get(selector);
    }

    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return this.state.elements.find((element) => element.id === id);
    }

    return this.state.elements.find((element) => element.tag === selector);
  }

  serialize(): StoredPageState {
    return {
      url: this.state.url,
      title: this.state.title,
      elements: this.state.elements.map((element) => ({ ...element })),
    };
  }
}

export class FakeBrowserContext extends EventEmitter {
  private pagesList: FakePage[];
  private closed = false;

  constructor(private readonly profileDir: string, initialPages: StoredPageState[]) {
    super();
    this.pagesList = initialPages.map((state) => new FakePage(state));
  }

  pages(): FakePage[] {
    return this.pagesList.filter((page) => !page.isClosed());
  }

  async newPage(): Promise<FakePage> {
    const page = new FakePage(parsePageState('about:blank'));
    this.pagesList.push(page);
    return page;
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;
    profileStore.set(
      this.profileDir,
      this.pages()
        .map((page) => page.serialize())
        .filter((page) => page.url !== 'about:blank'),
    );
    this.emit('close');
  }
}

export function createFakeBrowserContext(profileDir: string): FakeBrowserContext {
  const initialPages = profileStore.get(profileDir) ?? [parsePageState('about:blank')];
  return new FakeBrowserContext(profileDir, initialPages);
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
  return profileStore.get(profileDir)?.map((page) => ({
    url: page.url,
    title: page.title,
    elements: page.elements.map((element) => ({ ...element })),
  }));
}

export function getFakeArtifactPath(rootDir: string, version: string): string {
  return path.join(rootDir, 'camoufox-cache', 'browsers', 'official', version, 'camoufox-bin');
}
