import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { validateCamouConfig, validateCamouConfigValue } from '../src/camoufox/validation.js';
import { ValidationError } from '../src/util/errors.js';

describe('Camoufox config validation', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'camoucli-validation-'));
    await writeFile(
      path.join(rootDir, 'properties.json'),
      JSON.stringify(
        [
          { property: 'navigator.language', type: 'str' },
          { property: 'audio:seed', type: 'uint' },
          { property: 'fonts', type: 'array' },
        ],
        null,
        2,
      ),
      'utf8',
    );
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('validates supported property types', () => {
    expect(validateCamouConfigValue('en-US', 'str')).toBe(true);
    expect(validateCamouConfigValue(10, 'uint')).toBe(true);
    expect(validateCamouConfigValue(['Arial'], 'array')).toBe(true);
    expect(validateCamouConfigValue(-1, 'uint')).toBe(false);
  });

  it('rejects unknown properties and wrong types', async () => {
    await expect(validateCamouConfig({ unknown: true }, rootDir)).rejects.toThrow(ValidationError);
    await expect(validateCamouConfig({ 'audio:seed': 'bad' }, rootDir)).rejects.toThrow(ValidationError);
  });

  it('accepts config keys that match properties.json', async () => {
    await expect(
      validateCamouConfig(
        {
          'navigator.language': 'en-US',
          'audio:seed': 123,
          fonts: ['Arial'],
        },
        rootDir,
      ),
    ).resolves.toBeUndefined();
  });
});
