import path from 'node:path';

import type { SessionPaths } from '../state/paths.js';

export type ArtifactFamily = 'screenshots' | 'traces' | 'har' | 'diffs' | 'pdfs' | 'videos';

const DEFAULT_EXTENSIONS: Record<ArtifactFamily, string> = {
  screenshots: 'png',
  traces: 'zip',
  har: 'har',
  diffs: 'json',
  pdfs: 'pdf',
  videos: 'webm',
};

export function resolveArtifactPath(
  sessionPaths: SessionPaths,
  family: ArtifactFamily,
  inputPath: string | undefined,
  basename: string,
  extension: string = DEFAULT_EXTENSIONS[family],
): string {
  if (inputPath) {
    return path.isAbsolute(inputPath) ? inputPath : path.join(sessionPaths.artifactsDir, family, inputPath);
  }

  const suffix = extension.startsWith('.') ? extension.slice(1) : extension;
  return path.join(sessionPaths.artifactsDir, family, `${basename}-${Date.now()}.${suffix}`);
}
