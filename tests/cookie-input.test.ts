import { describe, expect, it } from 'vitest';

import { parseCookieInput } from '../src/browser/cookie-input.js';

describe('cookie input parsing', () => {
  it('parses Playwright-style JSON arrays without leaking values in validation messages', () => {
    expect(parseCookieInput('[{"name":"sid","value":"secret","domain":"example.com","path":"/"}]')).toEqual([
      { name: 'sid', value: 'secret', domain: 'example.com', path: '/' },
    ]);

    expect(() => parseCookieInput('[{"name":"","value":"secret"}]')).toThrow('invalid cookie name');
    expect(() => parseCookieInput('[{"name":"sid","value":"secret","url":"https://example.com","path":"/"}]')).toThrow('path can only be used');
  });

  it('parses cURL commands and bare Cookie headers', () => {
    expect(parseCookieInput('[{"name":"sid","value":"secret","domain":"127.0.0.1","path":"/","secure":false,"sameSite":"None"}]')).toEqual([
      { name: 'sid', value: 'secret', domain: '127.0.0.1', path: '/', secure: false, sameSite: 'None' },
    ]);
    expect(parseCookieInput("curl 'https://example.com' -H 'Cookie: sid=secret; theme=dark'")).toEqual([
      { name: 'sid', value: 'secret', url: 'https://example.com' },
      { name: 'theme', value: 'dark', url: 'https://example.com' },
    ]);
    expect(parseCookieInput("curl https://example.com -b 'sid=secret; theme=dark'")).toEqual([
      { name: 'sid', value: 'secret', url: 'https://example.com' },
      { name: 'theme', value: 'dark', url: 'https://example.com' },
    ]);
    expect(parseCookieInput('Cookie: sid=secret')).toEqual([{ name: 'sid', value: 'secret' }]);
  });
});
