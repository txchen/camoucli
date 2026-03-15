import { describe, expect, it } from 'vitest';

import { buildCamouConfigEnv, chunkCamouConfig, getCamouConfigChunkSize } from '../src/camoufox/env.js';

describe('camou config env helpers', () => {
  it('uses the documented chunk size per platform', () => {
    expect(getCamouConfigChunkSize('win32')).toBe(2047);
    expect(getCamouConfigChunkSize('linux')).toBe(32767);
  });

  it('chunks large config payloads on Windows', () => {
    const chunks = chunkCamouConfig({ payload: 'x'.repeat(5000) }, 'win32');

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 2047)).toBe(true);
  });

  it('filters stale CAMOU_CONFIG env vars before adding new ones', () => {
    const env = buildCamouConfigEnv(
      { locale: 'en-US' },
      {
        PATH: '/usr/bin',
        CAMOU_CONFIG_1: 'old',
        CAMOU_CONFIG_2: 'stale',
      },
      'linux',
    );

    expect(env.PATH).toBe('/usr/bin');
    expect(env.CAMOU_CONFIG_1).toContain('"locale":"en-US"');
    expect('CAMOU_CONFIG_2' in env).toBe(false);
  });
});
