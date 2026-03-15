import { afterEach, describe, expect, it, vi } from 'vitest';

import { printOutput } from '../src/cli/output.js';

function captureStdout(callback: () => void): string {
  const chunks: string[] = [];
  const writeSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation(((chunk: string | Uint8Array) => {
      chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
      return true;
    }) as typeof process.stdout.write);

  try {
    callback();
  } finally {
    writeSpy.mockRestore();
  }

  return chunks.join('');
}

describe('CLI output', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints install compatibility success hints', () => {
    const output = captureStdout(() => {
      printOutput(
        'install',
        {
          version: '135.0.1-beta.24',
          playwrightCoreVersion: '1.51.1',
          launchCheck: {
            attempted: true,
            success: true,
          },
        },
        false,
      );
    });

    expect(output).toContain('Installed Camoufox 135.0.1-beta.24');
    expect(output).toContain('Compatibility: launch check passed with Playwright 1.51.1');
  });

  it('prints install compatibility warnings', () => {
    const output = captureStdout(() => {
      printOutput(
        'install',
        {
          version: '135.0.1-beta.23',
          playwrightCoreVersion: '1.51.1',
          launchCheck: {
            attempted: true,
            success: false,
            error: {
              message:
                "browserType.launchPersistentContext: Protocol error (Browser.setContrast): ERROR: method 'Browser.setContrast' is not supported",
            },
          },
        },
        false,
      );
    });

    expect(output).toContain('Installed Camoufox 135.0.1-beta.23');
    expect(output).toContain('Compatibility warning: launch check failed with Playwright 1.51.1');
    expect(output).toContain("Reason: browserType.launchPersistentContext: Protocol error (Browser.setContrast): ERROR: method 'Browser.setContrast' is not supported");
  });
});
