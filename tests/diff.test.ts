import { describe, expect, it } from 'vitest';

import { diffImageBytes, diffText, imageMetadata } from '../src/browser/diff.js';

describe('diff helpers', () => {
  it('builds structured text diffs with unified output', () => {
    const result = diffText('alpha\nbeta', 'alpha\ngamma\nomega');

    expect(result).toMatchObject({
      equal: false,
      changes: 2,
      expectedLines: 2,
      actualLines: 3,
    });
    expect(result.lines).toEqual([
      { line: 2, expected: 'beta', actual: 'gamma', kind: 'changed' },
      { line: 3, actual: 'omega', kind: 'added' },
    ]);
    expect(result.unified).toBe('-beta\n+gamma\n+omega');
  });

  it('compares image bytes and extracts PNG metadata without dependencies', () => {
    const png = Buffer.concat([
      Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'),
      Buffer.from([0, 0, 0, 20, 0, 0, 0, 10, 8, 2, 0, 0, 0]),
    ]);
    const changed = Buffer.from(png);
    changed[changed.length - 1] = 1;

    expect(imageMetadata(png)).toMatchObject({ format: 'png', width: 20, height: 10, bytes: png.length });
    expect(diffImageBytes(png, changed)).toMatchObject({
      equal: false,
      bytesDifferent: 1,
      baseline: { format: 'png', width: 20, height: 10 },
      actual: { format: 'png', width: 20, height: 10 },
    });
  });
});
