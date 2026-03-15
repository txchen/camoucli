import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

describe('CLI JSON errors', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'camoucli-json-errors-'));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('prints runtime failures as structured JSON when --json is enabled', async () => {
    const result = await runCli(['path', '--json'], rootDir);
    const payload = JSON.parse(result.stderr) as {
      success: boolean;
      error: { code: string; message: string };
      exitCode: number;
    };

    expect(result.code).toBe(3);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('browser_not_installed');
    expect(payload.exitCode).toBe(3);
  });

  it('prints parse failures as structured JSON when --json is enabled', async () => {
    const result = await runCli(['open', '--json'], rootDir);
    const payload = JSON.parse(result.stderr) as {
      success: boolean;
      error: { code: string; message: string };
      exitCode: number;
    };

    expect(result.code).toBe(2);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('validation_error');
    expect(payload.error.message).toContain('missing required argument');
  });
});

async function runCli(args: string[], rootDir: string): Promise<CliResult> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'src/cli/main.ts', ...args],
      {
        cwd: '/home/txchen/code/vibe/camoucli',
        env: {
          ...process.env,
          XDG_DATA_HOME: path.join(rootDir, 'data-home'),
          XDG_STATE_HOME: path.join(rootDir, 'state-home'),
          XDG_CACHE_HOME: path.join(rootDir, 'cache-home'),
          XDG_RUNTIME_DIR: path.join(rootDir, 'runtime-home'),
        },
      },
    );

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
