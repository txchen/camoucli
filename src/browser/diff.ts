import { Buffer } from 'node:buffer';

export interface TextDiffLine {
  line: number;
  expected?: string | undefined;
  actual?: string | undefined;
  kind: 'same' | 'changed' | 'added' | 'removed';
}

export interface TextDiffResult {
  equal: boolean;
  changes: number;
  expectedLines: number;
  actualLines: number;
  lines: TextDiffLine[];
  unified: string;
}

export interface ImageMetadata {
  format: 'png' | 'jpeg' | 'unknown';
  width?: number | undefined;
  height?: number | undefined;
  bytes: number;
}

export interface ImageDiffResult {
  equal: boolean;
  bytesDifferent: number;
  baseline: ImageMetadata;
  actual: ImageMetadata;
}

export function diffText(expected: string, actual: string): TextDiffResult {
  const expectedLines = expected.split(/\r?\n/u);
  const actualLines = actual.split(/\r?\n/u);
  const maxLines = Math.max(expectedLines.length, actualLines.length);
  const lines: TextDiffLine[] = [];
  const unified: string[] = [];
  let changes = 0;

  for (let index = 0; index < maxLines; index += 1) {
    const expectedLine = expectedLines[index];
    const actualLine = actualLines[index];
    if (expectedLine === actualLine) {
      lines.push({ line: index + 1, expected: expectedLine, actual: actualLine, kind: 'same' });
      continue;
    }

    changes += 1;
    if (expectedLine === undefined) {
      lines.push({ line: index + 1, actual: actualLine, kind: 'added' });
      unified.push(`+${actualLine ?? ''}`);
      continue;
    }
    if (actualLine === undefined) {
      lines.push({ line: index + 1, expected: expectedLine, kind: 'removed' });
      unified.push(`-${expectedLine}`);
      continue;
    }
    lines.push({ line: index + 1, expected: expectedLine, actual: actualLine, kind: 'changed' });
    unified.push(`-${expectedLine}`);
    unified.push(`+${actualLine}`);
  }

  return {
    equal: changes === 0,
    changes,
    expectedLines: expectedLines.length,
    actualLines: actualLines.length,
    lines: lines.filter((line) => line.kind !== 'same'),
    unified: unified.join('\n'),
  };
}

export function diffImageBytes(baseline: Buffer, actual: Buffer): ImageDiffResult {
  const maxLength = Math.max(baseline.length, actual.length);
  let bytesDifferent = Math.abs(baseline.length - actual.length);
  const comparableLength = Math.min(baseline.length, actual.length);
  for (let index = 0; index < comparableLength; index += 1) {
    if (baseline[index] !== actual[index]) {
      bytesDifferent += 1;
    }
  }

  return {
    equal: bytesDifferent === 0,
    bytesDifferent,
    baseline: imageMetadata(baseline),
    actual: imageMetadata(actual),
  };
}

export function imageMetadata(buffer: Buffer): ImageMetadata {
  const pngSignature = '89504e470d0a1a0a';
  if (buffer.length >= 24 && buffer.subarray(0, 8).toString('hex') === pngSignature) {
    return {
      format: 'png',
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
      bytes: buffer.length,
    };
  }

  const jpegSize = readJpegSize(buffer);
  if (jpegSize) {
    return { format: 'jpeg', ...jpegSize, bytes: buffer.length };
  }

  return { format: 'unknown', bytes: buffer.length };
}

function readJpegSize(buffer: Buffer): { width: number; height: number } | undefined {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return undefined;
  }

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) {
      return undefined;
    }
    if (marker && marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }

  return undefined;
}
