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

  it('prints current session and session info in human-readable form', () => {
    const currentOutput = captureStdout(() => {
      printOutput('session.current', { sessionName: 'work' }, false);
    });
    const infoOutput = captureStdout(() => {
      printOutput(
        'session.info',
        {
          sessionName: 'work',
          active: true,
          daemon: { running: true, pid: 123 },
          browserVersion: '135.0.1-beta.24',
          launch: { browser: '135.0.1-beta.24', headless: false },
          activeTabName: 'docs',
          profileDir: '/tmp/profiles/work/user-data',
          tabs: [{ tabName: 'docs', active: true, url: 'https://example.com/' }],
        },
        false,
      );
    });

    expect(currentOutput).toBe('work\n');
    expect(infoOutput).toContain('Session work running');
    expect(infoOutput).toContain('Daemon: running 123');
    expect(infoOutput).toContain('Launch: browser=135.0.1-beta.24 headless=false');
    expect(infoOutput).toContain('Active tab: docs');
    expect(infoOutput).toContain('Tab: docs active https://example.com/');
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

  it('prints diff vitals pushstate and init script results', () => {
    const output = captureStdout(() => {
      printOutput('diff.snapshot', { kind: 'snapshot', equal: false, changes: 1, path: '/tmp/diff.json', diff: { unified: '-old\n+new' } }, false);
      printOutput('diff.url', { kind: 'url', equal: false, changes: 1, path: '/tmp/url.json', left: { finalUrl: 'https://example.com/' }, right: { finalUrl: 'https://example.com/next', mutated: true } }, false);
      printOutput('vitals', { sessionName: 'work', tabName: 'main', metrics: { webVitals: { ttfb: 5, fcp: 25 } } }, false);
      printOutput('pushstate', { sessionName: 'work', tabName: 'main', before: 'https://example.com/', after: 'https://example.com/next' }, false);
      printOutput('addinitscript', { sessionName: 'work', id: 'init_1', sourceLength: 12 }, false);
      printOutput('removeinitscript', { id: 'init_1', reason: 'Playwright does not expose removal' }, false);
    });

    expect(output).toContain('snapshot different: 1 changes');
    expect(output).toContain('-old\n+new');
    expect(output).toContain('Right: https://example.com/next (mutated)');
    expect(output).toContain('Vitals for work/main');
    expect(output).toContain('pushState work/main https://example.com/ -> https://example.com/next');
    expect(output).toContain('Added init script init_1 to work');
    expect(output).toContain('was not removed');
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

  it('prints active tab and tracked window results in human-readable form', () => {
    const activeOutput = captureStdout(() => {
      printOutput('tab.activate', { sessionName: 'work', tabName: 'docs', url: 'https://example.com/' }, false);
    });
    const windowOutput = captureStdout(() => {
      printOutput('window.new', { sessionName: 'work', tabName: 'win', page: true, window: false, url: 'about:blank' }, false);
    });

    expect(activeOutput).toContain('Active tab work/docs https://example.com/');
    expect(windowOutput).toContain('Created page work/win');
    expect(windowOutput).toContain('not guaranteed OS window');
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

  it('prints eval cookies and close-all results', () => {
    const output = captureStdout(() => {
      printOutput('eval', { expression: 'document.title', result: 'Eval Page' }, false);
      printOutput('cookies.export', { sessionName: 'work', count: 1, cookies: [{ name: 'sid', value: 'abc' }] }, false);
      printOutput('cookies.get', { sessionName: 'work', count: 1, cookies: [{ name: 'sid', value: 'secret', domain: 'example.com', path: '/' }] }, false);
      printOutput('cookies.set', { sessionName: 'work', count: 1, names: ['sid'] }, false);
      printOutput('cookies.clear', { sessionName: 'work', cleared: 1 }, false);
      printOutput('cookies.export', { sessionName: 'work', count: 1, path: '/tmp/cookies.json' }, false);
      printOutput('cookies.import', { sessionName: 'work', imported: 1, path: '/tmp/cookies.json' }, false);
      printOutput('session.stopAll', { stopped: 2, sessionNames: ['one', 'two'] }, false);
      printOutput('daemon.cleanup', { stoppedSessions: 2, stoppedDaemon: true, killedProcesses: 3 }, false);
    });

    expect(output).toContain('Eval Page');
    expect(output).toContain('Cookies for work: 1');
    expect(output).toContain('- sid example.com/');
    expect(output).not.toContain('secret');
    expect(output).not.toContain('abc');
    expect(output).toContain('Set 1 cookies in work: sid');
    expect(output).toContain('Cleared 1 cookies from work');
    expect(output).toContain('/tmp/cookies.json');
    expect(output).toContain('Imported 1 cookies into work');
    expect(output).toContain('Stopped 2 sessions');
    expect(output).toContain('Cleanup complete: stopped 2 sessions, stopped daemon, killed 3 Camoufox processes');
  });

  it('prints storage and state summaries without values', () => {
    const output = captureStdout(() => {
      printOutput('storage.local', { operation: 'get', storage: 'localStorage', origin: 'https://example.com', values: { token: 'secret' } }, false);
      printOutput('storage.local', { operation: 'set', storage: 'localStorage', origin: 'https://example.com', key: 'token', valueLength: 6 }, false);
      printOutput('state.save', { sessionName: 'work', path: '/tmp/auth.json', cookies: 1, origins: 1 }, false);
      printOutput('state.load', { sessionName: 'work', path: '/tmp/auth.json', cookies: 1, localStorageItems: 1 }, false);
      printOutput('state.list', { states: [{ name: 'auth', size: 42, path: '/tmp/auth.json' }] }, false);
      printOutput('state.show', { path: '/tmp/auth.json', cookies: 1, origins: 1, state: { cookies: [{ value: 'secret' }] } }, false);
      printOutput('state.clear', { removed: true, name: 'auth', path: '/tmp/auth.json' }, false);
      printOutput('state.clean', { removed: 1 }, false);
      printOutput('state.rename', { from: 'old', to: 'new', path: '/tmp/new.json' }, false);
    });

    expect(output).toContain('localStorage https://example.com');
    expect(output).toContain('- token (6 chars)');
    expect(output).toContain('Saved state for work');
    expect(output).toContain('Merged state into work');
    expect(output).toContain('State snapshots:');
    expect(output).toContain('State /tmp/auth.json: 1 cookies, 1 origins');
    expect(output).not.toContain('secret');
  });

  it('prints network route request and HAR summaries', () => {
    const output = captureStdout(() => {
      printOutput('network.route', { sessionName: 'work', routeId: 'route_1', behavior: 'fulfill', url: '**/api', resourceTypes: ['xhr'] }, false);
      printOutput('network.requests', {
        sessionName: 'work',
        count: 1,
        requests: [{ requestId: 'net_1', method: 'GET', status: 200, resourceType: 'xhr', tabName: 'main', url: 'https://example.com/api' }],
        cleared: 1,
      }, false);
      printOutput('network.request', {
        request: {
          id: 'net_1',
          method: 'GET',
          url: 'https://example.com/api',
          resourceType: 'xhr',
          response: { status: 200, statusText: 'OK' },
          tabName: 'main',
          pageUrl: 'https://example.com/api',
        },
      }, false);
      printOutput('network.har.start', { sessionName: 'work' }, false);
      printOutput('network.har.stop', { sessionName: 'work', path: '/tmp/capture.har', entries: 1 }, false);
      printOutput('network.unroute', { removed: 1, url: '**/api' }, false);
    });

    expect(output).toContain('Added network route route_1 fulfill **/api xhr');
    expect(output).toContain('- net_1 GET 200 xhr main https://example.com/api');
    expect(output).toContain('Cleared 1 buffered requests');
    expect(output).toContain('Response: 200 OK');
    expect(output).toContain('Started HAR capture for work');
    expect(output).toContain('Wrote HAR for work to /tmp/capture.har (1 entries)');
    expect(output).toContain('Removed 1 network routes **/api');
  });

  it('prints state show JSON as portable storage-state JSON', () => {
    const output = captureStdout(() => {
      printOutput('state.show', { path: '/tmp/auth.json', cookies: 1, origins: 0, state: { cookies: [{ name: 'sid', value: 'secret' }], origins: [] } }, true);
    });

    expect(JSON.parse(output)).toEqual({ cookies: [{ name: 'sid', value: 'secret' }], origins: [] });
  });

  it('prints stateful runtime command results', () => {
    const output = captureStdout(() => {
      printOutput('download', { sessionName: 'work', tabName: 'main', target: '#export', path: '/tmp/export.csv', suggestedFilename: 'report.csv' }, false);
      printOutput('wait', { sessionName: 'work', tabName: 'main', download: true, path: '/tmp/next.bin', suggestedFilename: 'next.bin' }, false);
      printOutput('runtime.set', { sessionName: 'work', tabName: 'main', setting: 'viewport', lifetime: 'tab' }, false);
      printOutput('frame', { sessionName: 'work', tabName: 'main', frame: '#child', active: true, url: 'about:srcdoc' }, false);
      printOutput('frame', { sessionName: 'work', tabName: 'main', active: false }, false);
      printOutput('dialog.status', { sessionName: 'work', tabName: 'main', pending: true, dialog: { type: 'prompt', message: 'Name?' } }, false);
      printOutput('dialog.accept', { sessionName: 'work', tabName: 'main', dialog: { type: 'prompt', message: 'Name?' } }, false);
      printOutput('read', { content: 'Readable text' }, false);
    });

    expect(output).toContain('Downloaded work/main #export "report.csv" /tmp/export.csv');
    expect(output).toContain('Downloaded work/main "next.bin" /tmp/next.bin');
    expect(output).toContain('Set viewport for tab work/main');
    expect(output).toContain('Frame context work/main #child about:srcdoc');
    expect(output).toContain('Frame context cleared work/main');
    expect(output).toContain('Pending dialog work/main prompt "Name?"');
    expect(output).toContain('Accepted dialog work/main prompt "Name?"');
    expect(output).toContain('Readable text');
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
