import os from 'node:os';
import path from 'node:path';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveSessionId } from '../src/cli/session.js';

describe('CLI session helpers', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'camoucli-session-id-'));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('generates stable sanitized names for cwd scope', async () => {
    const projectDir = path.join(rootDir, 'Project With Spaces');
    await mkdir(projectDir, { recursive: true });

    const first = await resolveSessionId({ cwd: projectDir, scope: 'cwd', prefix: 'work space' });
    const second = await resolveSessionId({ cwd: projectDir, scope: 'cwd', prefix: 'work space' });

    expect(first).toBe(second);
    expect(first).toMatch(/^work-space-Project-With-Spaces-[a-f0-9]{10}$/u);
  });

  it('uses git root for git-root and worktree scopes when available', async () => {
    const gitRoot = path.join(rootDir, 'repo');
    const nested = path.join(gitRoot, 'packages', 'app');
    await mkdir(path.join(gitRoot, '.git'), { recursive: true });
    await writeFile(path.join(gitRoot, '.git', 'HEAD'), 'ref: refs/heads/main\n', 'utf8');
    await mkdir(nested, { recursive: true });

    const gitRootId = await resolveSessionId({ cwd: nested, scope: 'git-root' });
    const worktreeId = await resolveSessionId({ cwd: nested, scope: 'worktree' });
    const cwdId = await resolveSessionId({ cwd: nested, scope: 'cwd' });

    expect(gitRootId).toBe(worktreeId);
    expect(gitRootId).toMatch(/^repo-[a-f0-9]{10}$/u);
    expect(cwdId).toMatch(/^app-[a-f0-9]{10}$/u);
    expect(cwdId).not.toBe(gitRootId);
  });

  it('falls back to cwd when worktree scope is outside git', async () => {
    const projectDir = path.join(rootDir, 'standalone');
    await mkdir(projectDir, { recursive: true });

    await expect(resolveSessionId({ cwd: projectDir, scope: 'worktree' })).resolves.toMatch(/^standalone-[a-f0-9]{10}$/u);
  });
});
