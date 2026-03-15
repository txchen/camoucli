function printInstalledVersions(data: Record<string, unknown>): void {
  const installs = Array.isArray(data.installedVersions) ? data.installedVersions : [];

  if (installs.length === 0) {
    process.stdout.write('No Camoufox versions installed\n');
    return;
  }

  for (const install of installs) {
    if (!install || typeof install !== 'object') {
      continue;
    }

    const version = String((install as Record<string, unknown>).version ?? 'unknown');
    const current = Boolean((install as Record<string, unknown>).current);
    const sourceRepo = String((install as Record<string, unknown>).sourceRepo ?? 'unknown');
    const installPath = String((install as Record<string, unknown>).path ?? '');
    process.stdout.write(`${current ? '*' : ' '} ${version} ${sourceRepo}${installPath ? ` ${installPath}` : ''}\n`);
  }
}

function printPresets(data: Record<string, unknown>): void {
  const presets = Array.isArray(data.presets) ? data.presets : [];

  if (presets.length === 0) {
    process.stdout.write('No built-in presets available\n');
    return;
  }

  for (const preset of presets) {
    if (!preset || typeof preset !== 'object') {
      continue;
    }

    const record = preset as Record<string, unknown>;
    process.stdout.write(`${String(record.name ?? 'unknown')} ${String(record.description ?? '')}\n`);
  }
}

function formatSessionTab(data: Record<string, unknown>): string {
  const sessionName = typeof data.sessionName === 'string' ? data.sessionName : undefined;
  const tabName = typeof data.tabName === 'string' ? data.tabName : undefined;

  if (sessionName && tabName) {
    return `${sessionName}/${tabName}`;
  }

  if (sessionName) {
    return sessionName;
  }

  if (tabName) {
    return tabName;
  }

  return 'current';
}

function formatQuoted(value: unknown): string {
  return JSON.stringify(String(value ?? ''));
}

function printOpenResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const title = typeof data.title === 'string' && data.title.length > 0 ? ` ${formatQuoted(data.title)}` : '';
  const url = typeof data.url === 'string' ? data.url : '';
  process.stdout.write(`Opened ${location}${title}${url ? ` ${url}` : ''}\n`);
}

function printClickResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const target = String(data.target ?? 'unknown');
  const url = typeof data.url === 'string' ? data.url : '';
  process.stdout.write(`Clicked ${location} ${target}${url ? ` ${url}` : ''}\n`);
}

function printFillResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const target = String(data.target ?? 'unknown');
  const valueLength = typeof data.valueLength === 'number' ? data.valueLength : undefined;
  process.stdout.write(`Filled ${location} ${target}${valueLength !== undefined ? ` (${valueLength} chars)` : ''}\n`);
}

function printPressResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const key = String(data.key ?? 'unknown');
  process.stdout.write(`Pressed ${location} ${key}\n`);
}

function printWaitResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const target = String(data.target ?? 'unknown');
  const url = typeof data.url === 'string' ? data.url : '';
  process.stdout.write(`Ready ${location} ${target}${url ? ` ${url}` : ''}\n`);
}

function printSessionStopResult(data: Record<string, unknown>): void {
  const sessionName = typeof data.sessionName === 'string' ? data.sessionName : 'session';
  const stopped = data.stopped === true;
  process.stdout.write(stopped ? `Stopped session ${sessionName}\n` : `Session ${sessionName} is not running\n`);
}

function printTabNewResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const url = typeof data.url === 'string' ? data.url : '';
  process.stdout.write(`Created tab ${location}${url ? ` ${url}` : ''}\n`);
}

function printTabCloseResult(data: Record<string, unknown>): void {
  const tabName = typeof data.tabName === 'string' ? data.tabName : undefined;
  const target = typeof data.target === 'string' ? data.target : undefined;
  const closed = data.closed === true;
  if (closed) {
    process.stdout.write(`Closed tab ${tabName ?? 'current'}\n`);
    return;
  }

  process.stdout.write(`Tab ${target ?? tabName ?? 'target'} was not found\n`);
}

function printSessionList(data: unknown): void {
  const sessions = Array.isArray(data) ? data : [];

  if (sessions.length === 0) {
    process.stdout.write('No running sessions\n');
    return;
  }

  for (const session of sessions) {
    if (!session || typeof session !== 'object') {
      continue;
    }

    const record = session as Record<string, unknown>;
    const sessionName = String(record.sessionName ?? 'unknown');
    const status = String(record.status ?? 'unknown');
    const browserVersion = String(record.browserVersion ?? 'unknown');
    const headless = Boolean(record.headless);
    process.stdout.write(`${sessionName} ${status} ${browserVersion} ${headless ? 'headless' : 'headed'}\n`);

    const tabs = Array.isArray(record.tabs) ? record.tabs : [];
    if (tabs.length === 0) {
      process.stdout.write('  (no tabs)\n');
      continue;
    }

    for (const tab of tabs) {
      if (!tab || typeof tab !== 'object') {
        continue;
      }

      const tabRecord = tab as Record<string, unknown>;
      process.stdout.write(`  - ${String(tabRecord.tabName ?? 'unknown')} ${String(tabRecord.url ?? '')}\n`);
    }
  }
}

function printTabList(data: unknown): void {
  const tabs = Array.isArray(data) ? data : [];

  if (tabs.length === 0) {
    process.stdout.write('No tabs\n');
    return;
  }

  for (const tab of tabs) {
    if (!tab || typeof tab !== 'object') {
      continue;
    }

    const record = tab as Record<string, unknown>;
    const index = String(record.index ?? '?');
    const tabName = String(record.tabName ?? 'unknown');
    const title = typeof record.title === 'string' && record.title.length > 0 ? ` ${JSON.stringify(record.title)}` : '';
    const url = String(record.url ?? '');
    process.stdout.write(`${index} ${tabName}${title}${url ? ` ${url}` : ''}\n`);
  }
}

function formatPlatform(data: Record<string, unknown>): string | undefined {
  const platform = typeof data.platform === 'object' && data.platform ? (data.platform as Record<string, unknown>) : undefined;
  if (!platform) {
    return undefined;
  }

  const os = typeof platform.os === 'string' ? platform.os : undefined;
  const arch = typeof platform.arch === 'string' ? platform.arch : undefined;
  if (!os || !arch) {
    return undefined;
  }

  return `${os}.${arch}`;
}

function printDoctorSummary(data: Record<string, unknown>): void {
  const installed = data.installed === true;
  const healthy = data.healthy === true;
  const status = healthy ? 'healthy' : installed ? 'issues detected' : 'not installed';
  process.stdout.write(`Doctor: ${status}\n`);

  const platform = formatPlatform(data);
  if (platform) {
    process.stdout.write(`Platform: ${platform}\n`);
  }

  if (typeof data.playwrightCoreVersion === 'string') {
    process.stdout.write(`Playwright: ${data.playwrightCoreVersion}\n`);
  }

  if (typeof data.currentVersion === 'string') {
    process.stdout.write(`Current: ${data.currentVersion}\n`);
  }

  if (typeof data.executablePath === 'string') {
    process.stdout.write(`Executable: ${data.executablePath}\n`);
  }

  if (typeof data.camoufoxCacheDir === 'string') {
    process.stdout.write(`Cache: ${data.camoufoxCacheDir}\n`);
  }

  if (typeof data.runtimeDir === 'string') {
    process.stdout.write(`Runtime: ${data.runtimeDir}\n`);
  }

  if (typeof data.socketPath === 'string') {
    process.stdout.write(`Socket: ${data.socketPath}\n`);
  } else if (typeof data.host === 'string' || typeof data.port === 'number') {
    process.stdout.write(`Socket: ${String(data.host ?? '127.0.0.1')}:${String(data.port ?? '')}\n`);
  }

  const installedVersions = Array.isArray(data.installedVersions) ? data.installedVersions : [];
  if (installedVersions.length === 0) {
    process.stdout.write('Installed versions: none\n');
  } else {
    process.stdout.write('Installed versions:\n');
    for (const install of installedVersions) {
      if (!install || typeof install !== 'object') {
        continue;
      }

      const record = install as Record<string, unknown>;
      const version = String(record.version ?? 'unknown');
      const current = record.current === true;
      const launchable = record.launchable === true;
      const sourceRepo = typeof record.sourceRepo === 'string' ? ` ${record.sourceRepo}` : '';
      process.stdout.write(` ${current ? '*' : ' '} ${version} ${launchable ? 'launches' : 'not launchable'}${sourceRepo}\n`);
      if (typeof record.error === 'string' && record.error.length > 0) {
        process.stdout.write(`    reason: ${record.error}\n`);
      }
    }
  }

  const bundleCheck = typeof data.bundleCheck === 'object' && data.bundleCheck ? (data.bundleCheck as Record<string, unknown>) : undefined;
  if (bundleCheck) {
    const missingRequiredFiles = Array.isArray(bundleCheck.missingRequiredFiles) ? bundleCheck.missingRequiredFiles : [];
    const missingOptionalFiles = Array.isArray(bundleCheck.missingOptionalFiles) ? bundleCheck.missingOptionalFiles : [];
    if (missingRequiredFiles.length === 0 && missingOptionalFiles.length === 0) {
      process.stdout.write('Bundle: ok\n');
    } else {
      process.stdout.write(`Bundle: ${missingRequiredFiles.length === 0 ? 'ok (optional files missing)' : 'missing required files'}\n`);
      for (const filePath of missingRequiredFiles) {
        process.stdout.write(`  - missing required: ${String(filePath)}\n`);
      }
      for (const filePath of missingOptionalFiles) {
        process.stdout.write(`  - missing optional: ${String(filePath)}\n`);
      }
    }
  }

  const sharedLibraryCheck =
    typeof data.sharedLibraryCheck === 'object' && data.sharedLibraryCheck
      ? (data.sharedLibraryCheck as Record<string, unknown>)
      : undefined;
  if (sharedLibraryCheck) {
    const supported = sharedLibraryCheck.supported === true;
    const missingLibraries = Array.isArray(sharedLibraryCheck.missingLibraries) ? sharedLibraryCheck.missingLibraries : [];
    if (!supported) {
      process.stdout.write('Shared libraries: not checked\n');
    } else if (missingLibraries.length === 0) {
      process.stdout.write('Shared libraries: ok\n');
    } else {
      process.stdout.write(`Shared libraries: missing ${missingLibraries.map(String).join(', ')}\n`);
    }

    const notes = Array.isArray(sharedLibraryCheck.notes) ? sharedLibraryCheck.notes : [];
    for (const note of notes) {
      process.stdout.write(`  - note: ${String(note)}\n`);
    }
  }

  const hints = Array.isArray(data.hints) ? data.hints : [];
  if (hints.length > 0) {
    process.stdout.write('Hints:\n');
    for (const hint of hints) {
      process.stdout.write(`  - ${String(hint)}\n`);
    }
  }
}

function printBrowserCompatibilityResult(prefix: string, data: Record<string, unknown>): void {
  const version = String(data.version ?? 'unknown');
  process.stdout.write(`${prefix} Camoufox ${version}\n`);

  const playwrightCoreVersion =
    typeof data.playwrightCoreVersion === 'string' ? data.playwrightCoreVersion : undefined;
  const launchCheck =
    typeof data.launchCheck === 'object' && data.launchCheck ? (data.launchCheck as Record<string, unknown>) : undefined;

  if (!launchCheck) {
    return;
  }

  const versionSuffix = playwrightCoreVersion ? ` with Playwright ${playwrightCoreVersion}` : '';
  const success = launchCheck.success === true;

  if (success) {
    process.stdout.write(`Compatibility: launch check passed${versionSuffix}\n`);
    return;
  }

  process.stdout.write(`Compatibility warning: launch check failed${versionSuffix}\n`);
  const error =
    typeof launchCheck.error === 'object' && launchCheck.error
      ? (launchCheck.error as Record<string, unknown>)
      : undefined;
  if (typeof error?.message === 'string' && error.message.length > 0) {
    process.stdout.write(`Reason: ${error.message}\n`);
  }
}

export function printOutput(action: string, data: unknown, asJson: boolean): void {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }

  switch (action) {
    case 'install':
      printBrowserCompatibilityResult('Installed', data as Record<string, unknown>);
      return;
    case 'path':
      process.stdout.write(`${String((data as Record<string, unknown>).path)}\n`);
      return;
    case 'remove':
      process.stdout.write(`Removed Camoufox ${String((data as Record<string, unknown>).removed ?? 'unknown')}\n`);
      return;
    case 'version':
      process.stdout.write(`${String((data as Record<string, unknown>).version)}\n`);
      return;
    case 'use':
      printBrowserCompatibilityResult('Using', data as Record<string, unknown>);
      return;
    case 'versions':
      printInstalledVersions(data as Record<string, unknown>);
      return;
    case 'presets':
      printPresets(data as Record<string, unknown>);
      return;
    case 'session.list':
      printSessionList(data);
      return;
    case 'tab.list':
      printTabList(data);
      return;
    case 'doctor':
      printDoctorSummary(data as Record<string, unknown>);
      return;
    case 'open':
      printOpenResult(data as Record<string, unknown>);
      return;
    case 'click':
      printClickResult(data as Record<string, unknown>);
      return;
    case 'fill':
      printFillResult(data as Record<string, unknown>);
      return;
    case 'press':
      printPressResult(data as Record<string, unknown>);
      return;
    case 'wait':
      printWaitResult(data as Record<string, unknown>);
      return;
    case 'session.stop':
      printSessionStopResult(data as Record<string, unknown>);
      return;
    case 'tab.new':
      printTabNewResult(data as Record<string, unknown>);
      return;
    case 'tab.close':
      printTabCloseResult(data as Record<string, unknown>);
      return;
    case 'snapshot':
      process.stdout.write(`${String((data as Record<string, unknown>).snapshot ?? '')}\n`);
      return;
    case 'get.url':
      process.stdout.write(`${String((data as Record<string, unknown>).url ?? '')}\n`);
      return;
    case 'get.title':
      process.stdout.write(`${String((data as Record<string, unknown>).title ?? '')}\n`);
      return;
    case 'get.text':
      process.stdout.write(`${String((data as Record<string, unknown>).text ?? '')}\n`);
      return;
    case 'screenshot':
      process.stdout.write(`${String((data as Record<string, unknown>).path ?? '')}\n`);
      return;
    default:
      if (Array.isArray(data)) {
        process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
        return;
      }

      if (typeof data === 'object' && data) {
        process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
        return;
      }

      process.stdout.write(`${String(data)}\n`);
  }
}
