import { describe, expect, it } from 'vitest';

import { buildHar, matchesRequestFilter, type NetworkRequestRecord } from '../src/browser/network.js';

const baseRecord: NetworkRequestRecord = {
  id: 'net_1',
  url: 'https://example.com/api?item=1',
  method: 'GET',
  resourceType: 'xhr',
  requestHeaders: { accept: 'application/json' },
  startedAt: '2026-01-01T00:00:00.000Z',
  finishedAt: '2026-01-01T00:00:00.025Z',
  response: {
    status: 201,
    statusText: 'Created',
    headers: { 'content-type': 'application/json' },
  },
};

describe('network request helpers', () => {
  it('matches request filters by text resource type method and status', () => {
    expect(matchesRequestFilter(baseRecord, { filter: 'api' })).toBe(true);
    expect(matchesRequestFilter(baseRecord, { filter: 'missing' })).toBe(false);
    expect(matchesRequestFilter(baseRecord, { resourceType: ['xhr'] })).toBe(true);
    expect(matchesRequestFilter(baseRecord, { resourceType: ['document'] })).toBe(false);
    expect(matchesRequestFilter(baseRecord, { method: 'get' })).toBe(true);
    expect(matchesRequestFilter(baseRecord, { method: 'POST' })).toBe(false);
    expect(matchesRequestFilter(baseRecord, { status: 201 })).toBe(true);
    expect(matchesRequestFilter(baseRecord, { status: 200 })).toBe(false);
  });

  it('builds a portable HAR 1.2 shape without response bodies', () => {
    const har = buildHar([baseRecord], '2026-01-01T00:00:00.000Z') as { log: { version: string; entries: Array<Record<string, unknown>> } };
    const entry = har.log.entries[0] as {
      request: { method: string; url: string; queryString: Array<{ name: string; value: string }> };
      response: { status: number; content: { size: number; mimeType: string } };
    };

    expect(har.log.version).toBe('1.2');
    expect(entry.request).toMatchObject({
      method: 'GET',
      url: 'https://example.com/api?item=1',
      queryString: [{ name: 'item', value: '1' }],
    });
    expect(entry.response).toMatchObject({
      status: 201,
      content: { size: 0, mimeType: 'application/json' },
    });
  });
});
