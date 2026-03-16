import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { main } from '../src/cli/main.js';

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
    vi.restoreAllMocks();
    await rm(rootDir, { recursive: true, force: true });
  });

  it('prints runtime failures as structured JSON when --json is enabled', async () => {
    const result = await runCli(['node', 'camou', 'path', '--json'], rootDir);
    const payload = JSON.parse(result.stderr) as {
      success: boolean;
      error: { code: string; message: string };
      exitCode: number;
    };

    expect(result.code).toBe(3);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('browser_not_installed');
    expect(payload.exitCode).toBe(3);
    expect(result.stdout).toBe('');
  });

  it('prints parse failures as structured JSON when --json is enabled', async () => {
    const result = await runCli(['node', 'camou', 'open', '--json'], rootDir);
    const payload = JSON.parse(result.stderr) as {
      success: boolean;
      error: { code: string; message: string };
      exitCode: number;
    };

    expect(result.code).toBe(2);
    expect(payload.success).toBe(false);
    expect(payload.error.code).toBe('validation_error');
    expect(payload.error.message).toContain('missing required argument');
    expect(result.stdout).toBe('');
  });
});

async function runCli(argv: string[], rootDir: string): Promise<CliResult> {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: string | Uint8Array) => {
    stdoutChunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
    return true;
  }) as typeof process.stdout.write);
  const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(((chunk: string | Uint8Array) => {
    stderrChunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
    return true;
  }) as typeof process.stderr.write);

  const previousEnv = {
    XDG_DATA_HOME: process.env.XDG_DATA_HOME,
    XDG_STATE_HOME: process.env.XDG_STATE_HOME,
    XDG_CACHE_HOME: process.env.XDG_CACHE_HOME,
    XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR,
  };

  process.env.XDG_DATA_HOME = path.join(rootDir, 'data-home');
  process.env.XDG_STATE_HOME = path.join(rootDir, 'state-home');
  process.env.XDG_CACHE_HOME = path.join(rootDir, 'cache-home');
  process.env.XDG_RUNTIME_DIR = path.join(rootDir, 'runtime-home');

  try {
    const code = await main(argv);
    return {
      code,
      stdout: stdoutChunks.join(''),
      stderr: stderrChunks.join(''),
    };
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();

    restoreEnv('XDG_DATA_HOME', previousEnv.XDG_DATA_HOME);
    restoreEnv('XDG_STATE_HOME', previousEnv.XDG_STATE_HOME);
    restoreEnv('XDG_CACHE_HOME', previousEnv.XDG_CACHE_HOME);
    restoreEnv('XDG_RUNTIME_DIR', previousEnv.XDG_RUNTIME_DIR);
  }
}

function restoreEnv(name: 'XDG_DATA_HOME' | 'XDG_STATE_HOME' | 'XDG_CACHE_HOME' | 'XDG_RUNTIME_DIR', value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
