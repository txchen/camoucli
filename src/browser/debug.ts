import type { ConsoleMessage, Page } from 'playwright-core';

export const DEBUG_EVENT_BUFFER_LIMIT = 200;

export interface DebugConsoleEntry {
  id: string;
  type: string;
  text: string;
  args: string[];
  location?: {
    url?: string | undefined;
    lineNumber?: number | undefined;
    columnNumber?: number | undefined;
  } | undefined;
  sessionName: string;
  tabName: string;
  tabId: string;
  pageUrl: string;
  title?: string | undefined;
  timestamp: string;
}

export interface DebugPageErrorEntry {
  id: string;
  name?: string | undefined;
  message: string;
  stack?: string | undefined;
  sessionName: string;
  tabName: string;
  tabId: string;
  pageUrl: string;
  title?: string | undefined;
  timestamp: string;
}

export interface DebugRuntime {
  console: DebugConsoleEntry[];
  errors: DebugPageErrorEntry[];
  nextConsoleSequence: number;
  nextErrorSequence: number;
}

export function createDebugRuntime(): DebugRuntime {
  return {
    console: [],
    errors: [],
    nextConsoleSequence: 1,
    nextErrorSequence: 1,
  };
}

export function pushBounded<T>(buffer: T[], entry: T, limit: number = DEBUG_EVENT_BUFFER_LIMIT): void {
  buffer.push(entry);
  if (buffer.length > limit) {
    buffer.splice(0, buffer.length - limit);
  }
}

export async function summarizePage(page: Page): Promise<{ url: string; title?: string | undefined }> {
  const url = page.url();
  try {
    return { url, title: await page.title() };
  } catch {
    return { url };
  }
}

export function serializeConsoleMessage(message: ConsoleMessage): {
  type: string;
  text: string;
  args: string[];
  location?: DebugConsoleEntry['location'];
} {
  const location = typeof message.location === 'function' ? message.location() : undefined;
  return {
    type: typeof message.type === 'function' ? message.type() : 'log',
    text: typeof message.text === 'function' ? message.text() : String(message),
    args: typeof message.args === 'function' ? message.args().map((arg) => String(arg)) : [],
    ...(location ? { location } : {}),
  };
}
