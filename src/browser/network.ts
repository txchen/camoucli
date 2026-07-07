import type { BrowserContext, Request, Response, Route } from 'playwright-core';

import packageJson from '../../package.json' with { type: 'json' };
import { ValidationError } from '../util/errors.js';

export type NetworkRouteBehavior =
  | { kind: 'abort' }
  | { kind: 'fulfill'; body: string; status: number; contentType?: string | undefined };

export interface NetworkRouteEntry {
  id: string;
  url: string;
  resourceTypes?: string[] | undefined;
  behavior: NetworkRouteBehavior;
  handler: (route: Route, request: Request) => Promise<void>;
  createdAt: string;
}

export interface NetworkRequestRecord {
  id: string;
  url: string;
  method: string;
  resourceType: string;
  requestHeaders: Record<string, string>;
  postData?: string | undefined;
  startedAt: string;
  finishedAt?: string | undefined;
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
  } | undefined;
  failure?: {
    errorText: string;
  } | undefined;
  timing?: {
    startTime?: number | undefined;
    responseEnd?: number | undefined;
  } | undefined;
  tabName?: string | undefined;
  tabId?: string | undefined;
  pageUrl?: string | undefined;
  pageTitle?: string | undefined;
}

export interface NetworkHarBuffer {
  active: boolean;
  startedAt?: string | undefined;
  entries: NetworkRequestRecord[];
}

export interface NetworkRuntime {
  routes: NetworkRouteEntry[];
  requests: NetworkRequestRecord[];
  nextRouteSequence: number;
  nextRequestSequence: number;
  har: NetworkHarBuffer;
}

export interface NetworkRequestFilter {
  filter?: string | undefined;
  resourceType?: string[] | undefined;
  method?: string | undefined;
  status?: number | undefined;
}

export function createNetworkRuntime(): NetworkRuntime {
  return {
    routes: [],
    requests: [],
    nextRouteSequence: 1,
    nextRequestSequence: 1,
    har: {
      active: false,
      entries: [],
    },
  };
}

export function validateRouteBehavior(input: {
  abort?: boolean | undefined;
  body?: string | undefined;
  status?: number | undefined;
  contentType?: string | undefined;
}): NetworkRouteBehavior {
  if (input.abort && input.body !== undefined) {
    throw new ValidationError('network route accepts either --abort or --body, not both.');
  }
  if (input.abort) {
    return { kind: 'abort' };
  }
  if (input.body !== undefined) {
    return {
      kind: 'fulfill',
      body: input.body,
      status: input.status ?? 200,
      contentType: input.contentType,
    };
  }
  throw new ValidationError('network route requires --abort or --body.');
}

export function normalizeResourceTypes(values?: string[] | undefined): string[] | undefined {
  const normalized = values?.map((value) => value.trim().toLowerCase()).filter(Boolean) ?? [];
  return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
}

export function pushRequestRecord(runtime: NetworkRuntime, record: NetworkRequestRecord, maxRecords = 200): void {
  runtime.requests.push(record);
  if (runtime.requests.length > maxRecords) {
    runtime.requests.splice(0, runtime.requests.length - maxRecords);
  }
  if (runtime.har.active) {
    runtime.har.entries.push(record);
  }
}

export function matchesRequestFilter(record: NetworkRequestRecord, filter: NetworkRequestFilter): boolean {
  if (filter.filter) {
    const needle = filter.filter.toLowerCase();
    const haystack = `${record.url} ${record.method} ${record.resourceType} ${record.response?.status ?? ''} ${record.failure?.errorText ?? ''}`.toLowerCase();
    if (!haystack.includes(needle)) {
      return false;
    }
  }

  if (filter.resourceType && filter.resourceType.length > 0 && !filter.resourceType.includes(record.resourceType.toLowerCase())) {
    return false;
  }

  if (filter.method && record.method.toLowerCase() !== filter.method.toLowerCase()) {
    return false;
  }

  if (filter.status !== undefined && record.response?.status !== filter.status) {
    return false;
  }

  return true;
}

export function summarizeRequest(record: NetworkRequestRecord): Record<string, unknown> {
  return {
    requestId: record.id,
    method: record.method,
    url: record.url,
    resourceType: record.resourceType,
    startedAt: record.startedAt,
    status: record.response?.status,
    failed: Boolean(record.failure),
    ...(record.failure ? { errorText: record.failure.errorText } : {}),
    ...(record.tabName ? { tabName: record.tabName } : {}),
    ...(record.tabId ? { tabId: record.tabId } : {}),
    ...(record.pageUrl ? { pageUrl: record.pageUrl } : {}),
  };
}

export function buildHar(records: NetworkRequestRecord[], startedAt: string | undefined): Record<string, unknown> {
  return {
    log: {
      version: '1.2',
      creator: {
        name: 'camoucli',
        version: packageJson.version,
      },
      pages: [],
      entries: records.map((record) => ({
        startedDateTime: record.startedAt,
        time: harEntryTime(record),
        request: {
          method: record.method,
          url: record.url,
          httpVersion: 'HTTP/1.1',
          cookies: [],
          headers: headersToHar(record.requestHeaders),
          queryString: queryStringToHar(record.url),
          postData: record.postData === undefined ? undefined : {
            mimeType: record.requestHeaders['content-type'] ?? '',
            text: record.postData,
          },
          headersSize: -1,
          bodySize: record.postData?.length ?? 0,
        },
        response: {
          status: record.response?.status ?? 0,
          statusText: record.response?.statusText ?? record.failure?.errorText ?? '',
          httpVersion: 'HTTP/1.1',
          cookies: [],
          headers: headersToHar(record.response?.headers ?? {}),
          content: {
            size: 0,
            mimeType: record.response?.headers['content-type'] ?? '',
          },
          redirectURL: '',
          headersSize: -1,
          bodySize: -1,
        },
        cache: {},
        timings: {
          send: 0,
          wait: harEntryTime(record),
          receive: 0,
        },
      })),
      ...(startedAt ? { _camoucli: { startedAt } } : {}),
    },
  };
}

export function routeMatchesResourceType(request: Request, resourceTypes?: string[] | undefined): boolean {
  return !resourceTypes || resourceTypes.includes(request.resourceType().toLowerCase());
}

export async function applyRouteBehavior(route: Route, behavior: NetworkRouteBehavior): Promise<void> {
  if (behavior.kind === 'abort') {
    await route.abort();
    return;
  }
  await route.fulfill({
    status: behavior.status,
    body: behavior.body,
    ...(behavior.contentType ? { contentType: behavior.contentType } : {}),
  });
}

export async function unrouteEntries(context: BrowserContext, routes: NetworkRouteEntry[]): Promise<void> {
  await Promise.all(routes.map((route) => context.unroute(route.url, route.handler)));
}

function headersToHar(headers: Record<string, string>): Array<{ name: string; value: string }> {
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
}

function queryStringToHar(url: string): Array<{ name: string; value: string }> {
  try {
    const parsed = new URL(url);
    return Array.from(parsed.searchParams.entries()).map(([name, value]) => ({ name, value }));
  } catch {
    return [];
  }
}

function harEntryTime(record: NetworkRequestRecord): number {
  if (!record.finishedAt) {
    return 0;
  }
  return Math.max(0, Date.parse(record.finishedAt) - Date.parse(record.startedAt));
}
