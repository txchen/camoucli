import { ValidationError } from '../util/errors.js';

export interface CookieInput {
  name: string;
  value: string;
  url?: string | undefined;
  domain?: string | undefined;
  path?: string | undefined;
  expires?: number | undefined;
  httpOnly?: boolean | undefined;
  secure?: boolean | undefined;
  sameSite?: 'Strict' | 'Lax' | 'None' | undefined;
}

function assertCookieName(name: unknown): string {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ValidationError('Cookie input contains an invalid cookie name.');
  }
  return name.trim();
}

function normalizeSameSite(value: unknown): 'Strict' | 'Lax' | 'None' | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new ValidationError('Cookie input contains an invalid SameSite value.');
  }
  const normalized = value.toLowerCase();
  if (normalized === 'strict') {
    return 'Strict';
  }
  if (normalized === 'lax') {
    return 'Lax';
  }
  if (normalized === 'none') {
    return 'None';
  }
  throw new ValidationError('Cookie input contains an invalid SameSite value.');
}

function cookieFromRecord(record: Record<string, unknown>): CookieInput {
  const cookie: CookieInput = {
    name: assertCookieName(record.name),
    value: typeof record.value === 'string' ? record.value : String(record.value ?? ''),
    ...(typeof record.url === 'string' ? { url: record.url } : {}),
    ...(typeof record.domain === 'string' ? { domain: record.domain } : {}),
    ...(typeof record.path === 'string' ? { path: record.path } : {}),
    ...(typeof record.expires === 'number' ? { expires: record.expires } : {}),
    ...(typeof record.httpOnly === 'boolean' ? { httpOnly: record.httpOnly } : {}),
    ...(typeof record.secure === 'boolean' ? { secure: record.secure } : {}),
    ...(record.sameSite !== undefined ? { sameSite: normalizeSameSite(record.sameSite) } : {}),
  };
  validateCookieScope(cookie);
  return cookie;
}

function parseCookiePairs(value: string): CookieInput[] {
  const header = value.replace(/^cookie:\s*/iu, '');
  const cookies = header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const equalsIndex = part.indexOf('=');
      if (equalsIndex <= 0) {
        throw new ValidationError('Cookie input contains an invalid cookie pair.');
      }
      return {
        name: assertCookieName(part.slice(0, equalsIndex)),
        value: part.slice(equalsIndex + 1),
      };
    });
  if (cookies.length === 0) {
    throw new ValidationError('Cookie input did not contain any cookies.');
  }
  return cookies;
}

export function parseCookieJsonArray(raw: string): CookieInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch (error) {
    throw new ValidationError('Cookie JSON could not be parsed.', undefined, error);
  }
  if (!Array.isArray(parsed)) {
    throw new ValidationError('Cookie JSON must be an array.');
  }
  return parsed.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new ValidationError('Cookie JSON array contains a non-object item.');
    }
    return cookieFromRecord(item as Record<string, unknown>);
  });
}

function parseCurlCookieHeader(value: string): string | undefined {
  const match = /(?:^|\s)(?:-H|--header)\s+(["'])(.*?)\1/giu;
  let headerMatch: RegExpExecArray | null;
  while ((headerMatch = match.exec(value)) !== null) {
    const header = headerMatch[2] ?? '';
    if (/^cookie\s*:/iu.test(header)) {
      return header;
    }
  }
  return undefined;
}

function parseCurlCookieOption(value: string): string | undefined {
  return /(?:^|\s)(?:-b|--cookie)\s+(["'])(.*?)\1/iu.exec(value)?.[2]
    ?? /(?:^|\s)(?:-b|--cookie)\s+([^\s]+)/iu.exec(value)?.[1];
}

function parseCurlUrl(value: string): string | undefined {
  const quoted = /(?:^|\s)(["'])(https?:\/\/[^"']+)\1/u.exec(value)?.[2];
  if (quoted) {
    return quoted;
  }
  return /(?:^|\s)(https?:\/\/\S+)/u.exec(value)?.[1];
}

export function parseCookieInput(raw: string): CookieInput[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new ValidationError('Cookie input is empty.');
  }

  if (trimmed.startsWith('[')) {
    return parseCookieJsonArray(trimmed);
  }

  const curlHeader = parseCurlCookieHeader(trimmed) ?? parseCurlCookieOption(trimmed);
  if (curlHeader) {
    const curlUrl = parseCurlUrl(trimmed);
    return parseCookiePairs(curlHeader).map((cookie) => ({
      ...cookie,
      ...(curlUrl ? { url: curlUrl } : {}),
    }));
  }

  return parseCookiePairs(trimmed);
}

export function validateCookieScope(cookie: CookieInput): void {
  if (!cookie.url && !cookie.domain) {
    throw new ValidationError('Cookie requires a URL or domain.');
  }
  if (cookie.url && cookie.domain) {
    throw new ValidationError('Cookie accepts either URL or domain, not both.');
  }
  if (cookie.url && cookie.path) {
    throw new ValidationError('Cookie path can only be used with domain-scoped cookies.');
  }
}
