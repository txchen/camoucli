import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const workspaceRoot = fileURLToPath(new URL('..', import.meta.url));
const cliEntrypoint = fileURLToPath(new URL('../src/cli/main.ts', import.meta.url));
const packageJsonPath = fileURLToPath(new URL('../package.json', import.meta.url));

describe('CLI bin execution', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'camou-bin-integration-'));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('runs correctly when invoked through a symlinked bin path', async () => {
    const linkPath = path.join(rootDir, 'camou');
    await symlink(cliEntrypoint, linkPath);

    const packageJson = JSON.parse(
      await readFile(packageJsonPath, 'utf8'),
    ) as { version: string };

    const result = await runCommand(process.execPath, ['--import', 'tsx', linkPath, '--version']);

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe(packageJson.version);
    expect(result.stderr.trim()).toBe('');
  }, 15000);
});

async function runCommand(command: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: workspaceRoot,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('close', (code) => {
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}
