import path from 'node:path';

import type { CamoucliPaths } from './paths.js';
import { sanitizeName } from './paths.js';

function isExplicitPath(value: string): boolean {
  return path.isAbsolute(value) || value.includes('/') || value.includes('\\') || value.startsWith('.');
}

export function resolveStateSnapshotPath(paths: CamoucliPaths, pathOrName: string): string {
  if (isExplicitPath(pathOrName)) {
    return path.resolve(pathOrName);
  }

  const safeName = sanitizeName(pathOrName);
  const fileName = safeName.endsWith('.json') ? safeName : `${safeName}.json`;
  return path.join(paths.statesDir, fileName);
}
