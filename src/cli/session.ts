import { createHash } from 'node:crypto';
import path from 'node:path';
import { stat } from 'node:fs/promises';

import { sanitizeName } from '../state/paths.js';

export type SessionIdScope = 'worktree' | 'cwd' | 'git-root';

export interface ResolveSessionIdOptions {
  cwd?: string | undefined;
  scope?: SessionIdScope | undefined;
  prefix?: string | undefined;
}

async function isDirectory(candidate: string): Promise<boolean> {
  try {
    return (await stat(candidate)).isDirectory();
  } catch {
    return false;
  }
}

async function isFile(candidate: string): Promise<boolean> {
  try {
    return (await stat(candidate)).isFile();
  } catch {
    return false;
  }
}

async function findGitRoot(cwd: string): Promise<string | undefined> {
  let currentDir = path.resolve(cwd);

  while (true) {
    const gitMarker = path.join(currentDir, '.git');
    if ((await isFile(gitMarker)) || ((await isDirectory(gitMarker)) && (await isFile(path.join(gitMarker, 'HEAD'))))) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return undefined;
    }

    currentDir = parentDir;
  }
}

export async function resolveSessionId(options: ResolveSessionIdOptions = {}): Promise<string> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const scope = options.scope ?? 'worktree';
  const gitRoot = scope === 'cwd' ? undefined : await findGitRoot(cwd);
  const scopedPath = scope === 'git-root' ? gitRoot ?? cwd : scope === 'worktree' ? gitRoot ?? cwd : cwd;
  const hash = createHash('sha256').update(scopedPath).digest('hex').slice(0, 10);
  const baseName = sanitizeName(path.basename(scopedPath));
  const prefix = options.prefix ? `${sanitizeName(options.prefix)}-` : '';
  return sanitizeName(`${prefix}${baseName}-${hash}`);
}
