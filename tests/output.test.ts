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

  it('prints use compatibility success hints', () => {
    const output = captureStdout(() => {
      printOutput(
        'use',
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

    expect(output).toContain('Using Camoufox 135.0.1-beta.24');
    expect(output).toContain('Compatibility: launch check passed with Playwright 1.51.1');
  });

  it('prints use compatibility warnings', () => {
    const output = captureStdout(() => {
      printOutput(
        'use',
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

    expect(output).toContain('Using Camoufox 135.0.1-beta.23');
    expect(output).toContain('Compatibility warning: launch check failed with Playwright 1.51.1');
    expect(output).toContain("Reason: browserType.launchPersistentContext: Protocol error (Browser.setContrast): ERROR: method 'Browser.setContrast' is not supported");
  });

  it('prints session list in human-readable form', () => {
    const output = captureStdout(() => {
      printOutput(
        'session.list',
        [
          {
            sessionName: 'work',
            status: 'running',
            browserVersion: '135.0.1-beta.24',
            headless: false,
            tabs: [
              {
                tabName: 'main',
                url: 'https://example.com/',
              },
            ],
          },
        ],
        false,
      );
    });

    expect(output).toContain('work running 135.0.1-beta.24 headed');
    expect(output).toContain('  - main https://example.com/');
  });

  it('prints profile list in human-readable form', () => {
    const output = captureStdout(() => {
      printOutput(
        'profile.list',
        [
          {
            profileName: 'stored-only',
            running: false,
            rootDir: '/tmp/profiles/stored-only',
          },
          {
            profileName: 'running-profile',
            running: true,
            sessionName: 'running profile',
            status: 'running',
            browserVersion: '135.0.1-beta.24',
            headless: true,
            tabs: [
              {
                tabName: 'main',
                url: 'https://example.com/',
              },
            ],
            rootDir: '/tmp/profiles/running-profile',
          },
        ],
        false,
      );
    });

    expect(output).toContain('Stored profiles:');
    expect(output).toContain('- stored-only stopped /tmp/profiles/stored-only');
    expect(output).toContain('- running-profile running 135.0.1-beta.24 headless /tmp/profiles/running-profile');
    expect(output).toContain('  session: running profile');
    expect(output).toContain('  tab: main https://example.com/');
  });

  it('prints when no stored profiles exist', () => {
    const output = captureStdout(() => {
      printOutput('profile.list', [], false);
    });

    expect(output).toContain('Stored profiles: none');
  });

  it('prints profile inspection results', () => {
    const runningOutput = captureStdout(() => {
      printOutput(
        'profile.inspect',
        {
          profileName: 'running-profile',
          found: true,
          running: true,
          sessionName: 'running profile',
          browserVersion: '135.0.1-beta.24',
          headless: true,
          rootDir: '/tmp/profiles/running-profile',
          profileDir: '/tmp/profiles/running-profile/user-data',
          downloadsDir: '/tmp/profiles/running-profile/downloads',
          artifactsDir: '/tmp/profiles/running-profile/artifacts',
          tabs: [{ tabName: 'main', url: 'https://example.com/' }],
        },
        false,
      );
    });

    const missingOutput = captureStdout(() => {
      printOutput(
        'profile.inspect',
        {
          profileName: 'missing',
          found: false,
          running: false,
          rootDir: '/tmp/profiles/missing',
        },
        false,
      );
    });

    expect(runningOutput).toContain('Profile running-profile');
    expect(runningOutput).toContain('State: running');
    expect(runningOutput).toContain('Session: running profile');
    expect(runningOutput).toContain('Browser: 135.0.1-beta.24 headless');
    expect(runningOutput).toContain('Tab: main https://example.com/');
    expect(missingOutput).toContain('Profile missing was not found');
  });

  it('prints profile removal results', () => {
    const removedOutput = captureStdout(() => {
      printOutput(
        'profile.remove',
        {
          profileName: 'running-profile',
          removed: true,
          stopped: true,
          rootDir: '/tmp/profiles/running-profile',
        },
        false,
      );
    });

    const missingOutput = captureStdout(() => {
      printOutput(
        'profile.remove',
        {
          profileName: 'missing',
          removed: false,
          stopped: false,
          rootDir: '/tmp/profiles/missing',
        },
        false,
      );
    });

    expect(removedOutput).toContain('Removed profile running-profile');
    expect(removedOutput).toContain('Stopped running session first');
    expect(removedOutput).toContain('/tmp/profiles/running-profile');
    expect(missingOutput).toContain('Profile missing was not found');
  });

  it('prints tab list in human-readable form', () => {
    const output = captureStdout(() => {
      printOutput(
        'tab.list',
        [
          {
            index: 0,
            tabName: 'main',
            title: 'Example Domain',
            url: 'https://example.com/',
          },
          {
            index: 1,
            tabName: 'docs',
            url: 'https://docs.example.com/',
          },
        ],
        false,
      );
    });

    expect(output).toContain('0 main "Example Domain" https://example.com/');
    expect(output).toContain('1 docs https://docs.example.com/');
  });

  it('prints fingerprint profiles in human-readable form', () => {
    const output = captureStdout(() => {
      printOutput(
        'fingerprint-profiles',
        {
          screenProfiles: [
            {
              name: 'desktop-fhd',
              width: 1920,
              height: 1080,
              devicePixelRatio: 1,
            },
          ],
          windowProfiles: [
            {
              name: 'desktop',
              innerWidth: 1440,
              innerHeight: 900,
              outerWidth: 1536,
              outerHeight: 980,
              devicePixelRatio: 1,
            },
          ],
          regionProfiles: [
            {
              region: 'US',
              timezone: 'America/New_York',
              locales: ['en-US', 'es-US', 'en'],
            },
          ],
        },
        false,
      );
    });

    expect(output).toContain('Screen profiles');
    expect(output).toContain('- desktop-fhd 1920x1080 dpr=1');
    expect(output).toContain('Window profiles');
    expect(output).toContain('- desktop inner=1440x900 outer=1536x980 dpr=1');
    expect(output).toContain('Region profiles');
    expect(output).toContain('- US America/New_York locales=en-US,es-US,en');
  });

  it('prints common browser actions in human-readable form', () => {
    const output = captureStdout(() => {
      printOutput(
        'back',
        {
          sessionName: 'work',
          tabName: 'main',
          title: 'Back Page',
          url: 'https://example.com/back',
        },
        false,
      );
      printOutput(
        'forward',
        {
          sessionName: 'work',
          tabName: 'main',
          title: 'Forward Page',
          url: 'https://example.com/forward',
        },
        false,
      );
      printOutput(
        'reload',
        {
          sessionName: 'work',
          tabName: 'main',
          title: 'Reloaded Page',
          url: 'https://example.com/reload',
        },
        false,
      );
      printOutput(
        'open',
        {
          sessionName: 'work',
          tabName: 'main',
          title: 'Example Domain',
          url: 'https://example.com/',
        },
        false,
      );
      printOutput(
        'click',
        {
          sessionName: 'work',
          tabName: 'main',
          target: '@e1',
          url: 'https://www.iana.org/domains/example',
        },
        false,
      );
      printOutput(
        'hover',
        {
          sessionName: 'work',
          tabName: 'main',
          target: '@e2',
        },
        false,
      );
      printOutput(
        'fill',
        {
          sessionName: 'work',
          tabName: 'main',
          target: '@e2',
          valueLength: 12,
        },
        false,
      );
      printOutput(
        'type',
        {
          sessionName: 'work',
          tabName: 'main',
          target: '@e2',
          valueLength: 5,
        },
        false,
      );
      printOutput(
        'check',
        {
          sessionName: 'work',
          tabName: 'main',
          target: '#agree',
        },
        false,
      );
      printOutput(
        'uncheck',
        {
          sessionName: 'work',
          tabName: 'main',
          target: '#agree',
        },
        false,
      );
      printOutput(
        'select',
        {
          sessionName: 'work',
          tabName: 'main',
          target: '#choice',
          value: 'b',
        },
        false,
      );
      printOutput(
        'press',
        {
          sessionName: 'work',
          tabName: 'main',
          key: 'Enter',
        },
        false,
      );
      printOutput(
        'scroll',
        {
          sessionName: 'work',
          tabName: 'main',
          direction: 'down',
          amount: 250,
          url: 'https://example.com/dashboard',
        },
        false,
      );
      printOutput(
        'scroll.intoView',
        {
          sessionName: 'work',
          tabName: 'main',
          target: '#submit',
        },
        false,
      );
      printOutput(
        'wait',
        {
          sessionName: 'work',
          tabName: 'main',
          target: '#ready',
          url: 'https://example.com/dashboard',
        },
        false,
      );
      printOutput(
        'wait',
        {
          sessionName: 'work',
          tabName: 'main',
          text: 'Done',
          loadState: 'networkidle',
          url: 'https://example.com/done',
        },
        false,
      );
      printOutput('get.value', { value: 'selected-b' }, false);
    });

    expect(output).toContain('Went back work/main "Back Page" https://example.com/back');
    expect(output).toContain('Went forward work/main "Forward Page" https://example.com/forward');
    expect(output).toContain('Reloaded work/main "Reloaded Page" https://example.com/reload');
    expect(output).toContain('Opened work/main "Example Domain" https://example.com/');
    expect(output).toContain('Clicked work/main @e1 https://www.iana.org/domains/example');
    expect(output).toContain('Hovered work/main @e2');
    expect(output).toContain('Filled work/main @e2 (12 chars)');
    expect(output).toContain('Typed work/main @e2 (+5 chars)');
    expect(output).toContain('Checked work/main #agree');
    expect(output).toContain('Unchecked work/main #agree');
    expect(output).toContain('Selected work/main #choice "b"');
    expect(output).toContain('Pressed work/main Enter');
    expect(output).toContain('Scrolled work/main down 250 https://example.com/dashboard');
    expect(output).toContain('Scrolled into view work/main #submit');
    expect(output).toContain('Ready work/main #ready https://example.com/dashboard');
    expect(output).toContain('Ready work/main text="Done" load=networkidle https://example.com/done');
    expect(output).toContain('selected-b');
  });

  it('prints session, tab, and remove actions in human-readable form', () => {
    const output = captureStdout(() => {
      printOutput('remove', { removed: '135.0.1-beta.24' }, false);
      printOutput('session.stop', { stopped: true, sessionName: 'work' }, false);
      printOutput('session.stop', { stopped: false, sessionName: 'missing' }, false);
      printOutput(
        'tab.new',
        {
          sessionName: 'work',
          tabName: 'docs',
          url: 'https://docs.example.com/',
        },
        false,
      );
      printOutput('tab.close', { closed: true, tabName: 'docs', target: 'docs' }, false);
      printOutput('tab.close', { closed: false, target: 'ghost' }, false);
    });

    expect(output).toContain('Removed Camoufox 135.0.1-beta.24');
    expect(output).toContain('Stopped session work');
    expect(output).toContain('Session missing is not running');
    expect(output).toContain('Created tab work/docs https://docs.example.com/');
    expect(output).toContain('Closed tab docs');
    expect(output).toContain('Tab ghost was not found');
  });

  it('prints doctor in human-readable form', () => {
    const output = captureStdout(() => {
      printOutput(
        'doctor',
        {
          platform: {
            os: 'lin',
            arch: 'x86_64',
          },
          playwrightCoreVersion: '1.51.1',
          installed: true,
          healthy: false,
          currentVersion: '135.0.1-beta.24',
          executablePath: '/tmp/camoufox-bin',
          camoufoxCacheDir: '/tmp/camoufox-cache',
          runtimeDir: '/tmp/runtime',
          socketPath: '/tmp/runtime/daemon.sock',
          installedVersions: [
            {
              version: '135.0.1-beta.24',
              current: true,
              sourceRepo: 'official',
              launchable: true,
            },
            {
              version: '135.0.1-beta.23',
              current: false,
              sourceRepo: 'official',
              launchable: false,
              error: 'Browser.setContrast is not supported',
            },
          ],
          bundleCheck: {
            missingRequiredFiles: [],
            missingOptionalFiles: ['/tmp/camoufox-cache/browsers/official/135/glxtest'],
          },
          sharedLibraryCheck: {
            supported: true,
            missingLibraries: [],
            notes: [],
          },
          hints: ['Switch to a newer build if launch fails.'],
        },
        false,
      );
    });

    expect(output).toContain('Doctor: issues detected');
    expect(output).toContain('Platform: lin.x86_64');
    expect(output).toContain('Playwright: 1.51.1');
    expect(output).toContain('Current: 135.0.1-beta.24');
    expect(output).toContain('Installed versions:');
    expect(output).toContain('* 135.0.1-beta.24 launches official');
    expect(output).toContain('135.0.1-beta.23 not launchable official');
    expect(output).toContain('reason: Browser.setContrast is not supported');
    expect(output).toContain('Bundle: ok (optional files missing)');
    expect(output).toContain('Shared libraries: ok');
    expect(output).toContain('Hints:');
    expect(output).toContain('Switch to a newer build if launch fails.');
  });

  it('prints doctor when no browsers are installed', () => {
    const output = captureStdout(() => {
      printOutput(
        'doctor',
        {
          platform: {
            os: 'mac',
            arch: 'arm64',
          },
          installed: false,
          healthy: false,
          installedVersions: [],
          sharedLibraryCheck: {
            supported: false,
            missingLibraries: [],
            notes: ['Shared library inspection is currently implemented for Linux only.'],
          },
          hints: ['Run `camou install` to download a compatible Camoufox build.'],
        },
        false,
      );
    });

    expect(output).toContain('Doctor: not installed');
    expect(output).toContain('Platform: mac.arm64');
    expect(output).toContain('Installed versions: none');
    expect(output).toContain('Shared libraries: not checked');
    expect(output).toContain('note: Shared library inspection is currently implemented for Linux only.');
    expect(output).toContain('Run `camou install` to download a compatible Camoufox build.');
  });

  it('prints remote versions', () => {
    const output = captureStdout(() => {
      printOutput(
        'remote-versions',
        {
          remoteVersions: [
            {
              version: '135.0.1-beta.24',
              tag: 'v135.0.1-beta.24',
              repo: 'daijro/camoufox',
              prerelease: false,
              installed: true,
              current: true,
            },
            {
              version: '135.0.1-beta.23',
              tag: 'v135.0.1-beta.23',
              repo: 'daijro/camoufox',
              prerelease: true,
              installed: false,
              current: false,
            },
          ],
        },
        false,
      );
    });

    expect(output).toContain('Remote versions:');
    expect(output).toContain('* 135.0.1-beta.24 v135.0.1-beta.24 daijro/camoufox installed current');
    expect(output).toContain('135.0.1-beta.23 v135.0.1-beta.23 daijro/camoufox prerelease');
  });

  it('prints when no compatible remote versions are available', () => {
    const output = captureStdout(() => {
      printOutput('remote-versions', { remoteVersions: [] }, false);
    });

    expect(output).toContain('Remote versions: none');
  });
});
