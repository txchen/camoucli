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

function printRemoteVersions(data: Record<string, unknown>): void {
  const remoteVersions = Array.isArray(data.remoteVersions) ? data.remoteVersions : [];
  if (remoteVersions.length === 0) {
    process.stdout.write('Remote versions: none\n');
    return;
  }

  process.stdout.write('Remote versions:\n');
  for (const release of remoteVersions) {
    if (!release || typeof release !== 'object') {
      continue;
    }

    const record = release as Record<string, unknown>;
    const version = String(record.version ?? 'unknown');
    const tag = String(record.tag ?? 'unknown');
    const repo = String(record.repo ?? 'unknown');
    const flags = [record.prerelease === true ? 'prerelease' : undefined, record.installed === true ? 'installed' : undefined, record.current === true ? 'current' : undefined]
      .filter((value): value is string => Boolean(value));
    process.stdout.write(` ${record.current === true ? '*' : ' '} ${version} ${tag} ${repo}${flags.length > 0 ? ` ${flags.join(' ')}` : ''}\n`);
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

function printFingerprintProfiles(data: Record<string, unknown>): void {
  const screenProfiles = Array.isArray(data.screenProfiles) ? data.screenProfiles : [];
  const windowProfiles = Array.isArray(data.windowProfiles) ? data.windowProfiles : [];
  const regionProfiles = Array.isArray(data.regionProfiles) ? data.regionProfiles : [];

  if (screenProfiles.length === 0 && windowProfiles.length === 0 && regionProfiles.length === 0) {
    process.stdout.write('No fingerprint profiles available\n');
    return;
  }

  if (screenProfiles.length > 0) {
    process.stdout.write('Screen profiles\n');
    for (const profile of screenProfiles) {
      if (!profile || typeof profile !== 'object') {
        continue;
      }

      const record = profile as Record<string, unknown>;
      process.stdout.write(
        `- ${String(record.name ?? 'unknown')} ${String(record.width ?? '?')}x${String(record.height ?? '?')} dpr=${String(record.devicePixelRatio ?? '?')}\n`,
      );
    }
  }

  if (windowProfiles.length > 0) {
    process.stdout.write('Window profiles\n');
    for (const profile of windowProfiles) {
      if (!profile || typeof profile !== 'object') {
        continue;
      }

      const record = profile as Record<string, unknown>;
      process.stdout.write(
        `- ${String(record.name ?? 'unknown')} inner=${String(record.innerWidth ?? '?')}x${String(record.innerHeight ?? '?')} outer=${String(record.outerWidth ?? '?')}x${String(record.outerHeight ?? '?')} dpr=${String(record.devicePixelRatio ?? '?')}\n`,
      );
    }
  }

  if (regionProfiles.length > 0) {
    process.stdout.write('Region profiles\n');
    for (const profile of regionProfiles) {
      if (!profile || typeof profile !== 'object') {
        continue;
      }

      const record = profile as Record<string, unknown>;
      const locales = Array.isArray(record.locales) ? record.locales.map((locale) => String(locale)).join(',') : '';
      process.stdout.write(
        `- ${String(record.region ?? 'unknown')} ${String(record.timezone ?? '')}${locales ? ` locales=${locales}` : ''}\n`,
      );
    }
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

function printEvalResult(data: Record<string, unknown>): void {
  const result = data.result;
  if (result === null || ['string', 'number', 'boolean'].includes(typeof result)) {
    process.stdout.write(`${String(result ?? 'null')}
`);
    return;
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}
`);
}

function printCookiesExportResult(data: Record<string, unknown>): void {
  if (Array.isArray(data.cookies)) {
    printCookiesListResult(data);
    return;
  }
  process.stdout.write(`Exported ${String(data.count ?? 0)} cookies from ${String(data.sessionName ?? 'session')} to ${String(data.path ?? '')}
`);
}

function printCookiesListResult(data: Record<string, unknown>): void {
  const cookies = Array.isArray(data.cookies) ? data.cookies : [];
  process.stdout.write(`Cookies for ${String(data.sessionName ?? 'session')}: ${String(data.count ?? cookies.length)}\n`);
  for (const cookie of cookies) {
    if (!cookie || typeof cookie !== 'object') {
      continue;
    }
    const record = cookie as Record<string, unknown>;
    const scope = typeof record.url === 'string' ? record.url : `${String(record.domain ?? '')}${String(record.path ?? '/')}`;
    process.stdout.write(`- ${String(record.name ?? 'unknown')} ${scope}\n`);
  }
}

function printCookiesSetResult(data: Record<string, unknown>): void {
  const names = Array.isArray(data.names) ? data.names.map(String).join(', ') : '';
  process.stdout.write(`Set ${String(data.count ?? 0)} cookies in ${String(data.sessionName ?? 'session')}${names ? `: ${names}` : ''}\n`);
}

function printCookiesClearResult(data: Record<string, unknown>): void {
  process.stdout.write(`Cleared ${String(data.cleared ?? 0)} cookies from ${String(data.sessionName ?? 'session')}\n`);
}

function printCookiesImportResult(data: Record<string, unknown>): void {
  process.stdout.write(`Imported ${String(data.imported ?? 0)} cookies into ${String(data.sessionName ?? 'session')} from ${String(data.path ?? '')}
`);
}

function printStorageResult(data: Record<string, unknown>): void {
  const operation = String(data.operation ?? 'get');
  const storage = String(data.storage ?? 'storage');
  const origin = String(data.origin ?? 'origin');
  if (operation === 'get') {
    const values = typeof data.values === 'object' && data.values ? (data.values as Record<string, unknown>) : {};
    process.stdout.write(`${storage} ${origin}\n`);
    for (const [key, value] of Object.entries(values)) {
      process.stdout.write(`- ${key} (${typeof value === 'string' ? value.length : 0} chars)\n`);
    }
    return;
  }
  if (operation === 'set') {
    process.stdout.write(`Set ${storage} ${String(data.key ?? '')} at ${origin} (${String(data.valueLength ?? 0)} chars)\n`);
    return;
  }
  process.stdout.write(`Cleared ${storage}${typeof data.key === 'string' ? ` ${data.key}` : ''} at ${origin}\n`);
}

function printStateListResult(data: Record<string, unknown>): void {
  const states = Array.isArray(data.states) ? data.states : [];
  if (states.length === 0) {
    process.stdout.write('State snapshots: none\n');
    return;
  }
  process.stdout.write('State snapshots:\n');
  for (const state of states) {
    if (!state || typeof state !== 'object') {
      continue;
    }
    const record = state as Record<string, unknown>;
    process.stdout.write(`- ${String(record.name ?? 'unknown')} ${String(record.size ?? 0)} bytes ${String(record.path ?? '')}\n`);
  }
}

function printStateSaveResult(data: Record<string, unknown>): void {
  process.stdout.write(`Saved state for ${String(data.sessionName ?? 'session')} to ${String(data.path ?? '')} (${String(data.cookies ?? 0)} cookies, ${String(data.origins ?? 0)} origins)\n`);
}

function printStateLoadResult(data: Record<string, unknown>): void {
  process.stdout.write(`Merged state into ${String(data.sessionName ?? 'session')} from ${String(data.path ?? '')} (${String(data.cookies ?? 0)} cookies, ${String(data.localStorageItems ?? 0)} localStorage items)\n`);
}

function printStateShowResult(data: Record<string, unknown>): void {
  process.stdout.write(`State ${String(data.path ?? '')}: ${String(data.cookies ?? 0)} cookies, ${String(data.origins ?? 0)} origins\n`);
}

function printStateClearResult(data: Record<string, unknown>): void {
  if (data.all === true) {
    process.stdout.write(`Removed ${String(data.removed ?? 0)} state snapshots\n`);
    return;
  }
  process.stdout.write(data.removed === true ? `Removed state ${String(data.name ?? '')} ${String(data.path ?? '')}\n` : `State ${String(data.name ?? '')} was not found\n`);
}

function printStateCleanResult(data: Record<string, unknown>): void {
  process.stdout.write(`Cleaned ${String(data.removed ?? 0)} invalid state snapshots\n`);
}

function printStateRenameResult(data: Record<string, unknown>): void {
  process.stdout.write(`Renamed state ${String(data.from ?? '')} to ${String(data.to ?? '')} ${String(data.path ?? '')}\n`);
}

function printNetworkRouteResult(data: Record<string, unknown>): void {
  const resourceTypes = Array.isArray(data.resourceTypes) ? ` ${data.resourceTypes.map(String).join(',')}` : '';
  process.stdout.write(`Added network route ${String(data.routeId ?? '')} ${String(data.behavior ?? '')} ${String(data.url ?? '')}${resourceTypes}\n`);
}

function printNetworkUnrouteResult(data: Record<string, unknown>): void {
  const url = typeof data.url === 'string' ? ` ${data.url}` : '';
  process.stdout.write(`Removed ${String(data.removed ?? 0)} network routes${url}\n`);
}

function printNetworkRequestsResult(data: Record<string, unknown>): void {
  const requests = Array.isArray(data.requests) ? data.requests : [];
  process.stdout.write(`Network requests for ${String(data.sessionName ?? 'session')}: ${String(data.count ?? requests.length)}\n`);
  for (const request of requests) {
    if (!request || typeof request !== 'object') {
      continue;
    }
    const record = request as Record<string, unknown>;
    const status = record.status !== undefined ? ` ${String(record.status)}` : record.failed === true ? ' failed' : '';
    const tab = typeof record.tabName === 'string' ? ` ${record.tabName}` : '';
    process.stdout.write(`- ${String(record.requestId ?? '')} ${String(record.method ?? '')}${status} ${String(record.resourceType ?? '')}${tab} ${String(record.url ?? '')}\n`);
  }
  if (data.cleared !== undefined && Number(data.cleared) > 0) {
    process.stdout.write(`Cleared ${String(data.cleared)} buffered requests\n`);
  }
}

function printNetworkRequestResult(data: Record<string, unknown>): void {
  const request = typeof data.request === 'object' && data.request ? (data.request as Record<string, unknown>) : {};
  process.stdout.write(`${String(request.id ?? '')} ${String(request.method ?? '')} ${String(request.url ?? '')}\n`);
  if (typeof request.resourceType === 'string') {
    process.stdout.write(`Type: ${request.resourceType}\n`);
  }
  const response = typeof request.response === 'object' && request.response ? (request.response as Record<string, unknown>) : undefined;
  if (response) {
    process.stdout.write(`Response: ${String(response.status ?? 0)} ${String(response.statusText ?? '')}\n`);
  }
  const failure = typeof request.failure === 'object' && request.failure ? (request.failure as Record<string, unknown>) : undefined;
  if (failure) {
    process.stdout.write(`Failure: ${String(failure.errorText ?? '')}\n`);
  }
  if (typeof request.tabName === 'string' || typeof request.pageUrl === 'string') {
    process.stdout.write(`Page: ${String(request.tabName ?? 'unknown')} ${String(request.pageUrl ?? '')}\n`);
  }
}

function printNetworkHarStartResult(data: Record<string, unknown>): void {
  process.stdout.write(`Started HAR capture for ${String(data.sessionName ?? 'session')}\n`);
}

function printNetworkHarStopResult(data: Record<string, unknown>): void {
  process.stdout.write(`Wrote HAR for ${String(data.sessionName ?? 'session')} to ${String(data.path ?? '')} (${String(data.entries ?? 0)} entries)\n`);
}

function printConsoleEventsResult(data: Record<string, unknown>): void {
  const entries = Array.isArray(data.entries) ? data.entries : [];
  process.stdout.write(`Console events for ${String(data.sessionName ?? 'session')}: ${String(data.count ?? entries.length)}\n`);
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const tab = typeof record.tabName === 'string' ? ` ${record.tabName}` : '';
    process.stdout.write(`- ${String(record.id ?? '')} ${String(record.type ?? 'log')}${tab} ${String(record.text ?? '')}\n`);
  }
  if (data.cleared !== undefined && Number(data.cleared) > 0) {
    process.stdout.write(`Cleared ${String(data.cleared)} console events\n`);
  }
}

function printPageErrorsResult(data: Record<string, unknown>): void {
  const errors = Array.isArray(data.errors) ? data.errors : [];
  process.stdout.write(`Page errors for ${String(data.sessionName ?? 'session')}: ${String(data.count ?? errors.length)}\n`);
  for (const error of errors) {
    if (!error || typeof error !== 'object') {
      continue;
    }
    const record = error as Record<string, unknown>;
    const tab = typeof record.tabName === 'string' ? ` ${record.tabName}` : '';
    process.stdout.write(`- ${String(record.id ?? '')}${tab} ${String(record.name ?? 'Error')}: ${String(record.message ?? '')}\n`);
  }
  if (data.cleared !== undefined && Number(data.cleared) > 0) {
    process.stdout.write(`Cleared ${String(data.cleared)} page errors\n`);
  }
}

function printHighlightResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  process.stdout.write(`Highlighted ${location} ${String(data.target ?? 'target')} (${String(data.durationMs ?? 0)}ms)\n`);
}

function printClipboardTextResult(data: Record<string, unknown>): void {
  process.stdout.write(`${String(data.text ?? '')}\n`);
}

function printClipboardWriteResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  process.stdout.write(`Wrote clipboard text ${location} (${String(data.valueLength ?? 0)} chars)\n`);
}

function printClipboardShortcutResult(prefix: string, data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  process.stdout.write(`${prefix} ${location} ${String(data.shortcut ?? '')}\n`);
}

function printTraceStartResult(data: Record<string, unknown>): void {
  process.stdout.write(`Started Playwright trace for ${String(data.sessionName ?? 'session')}\n`);
}

function printTraceStopResult(data: Record<string, unknown>): void {
  process.stdout.write(`Wrote Playwright trace for ${String(data.sessionName ?? 'session')} to ${String(data.path ?? '')}\n`);
}

function printDiffResult(data: Record<string, unknown>): void {
  const kind = String(data.kind ?? 'diff');
  const equal = data.equal === true ? 'equal' : 'different';
  const metric = typeof data.changes === 'number'
    ? `${data.changes} changes`
    : typeof data.bytesDifferent === 'number'
      ? `${data.bytesDifferent} bytes different`
      : 'compared';
  process.stdout.write(`${kind} ${equal}: ${metric}\n`);
  if (typeof data.path === 'string') {
    process.stdout.write(`Report: ${data.path}\n`);
  }
  const diff = typeof data.diff === 'object' && data.diff ? (data.diff as Record<string, unknown>) : undefined;
  if (typeof diff?.unified === 'string' && diff.unified.length > 0) {
    process.stdout.write(`${diff.unified}\n`);
  }
  if (kind === 'url') {
    const left = typeof data.left === 'object' && data.left ? (data.left as Record<string, unknown>) : undefined;
    const right = typeof data.right === 'object' && data.right ? (data.right as Record<string, unknown>) : undefined;
    if (left) {
      process.stdout.write(`Left: ${String(left.finalUrl ?? '')}${left.mutated === true ? ' (mutated)' : ''}\n`);
    }
    if (right) {
      process.stdout.write(`Right: ${String(right.finalUrl ?? '')}${right.mutated === true ? ' (mutated)' : ''}\n`);
    }
  }
}

function printVitalsResult(data: Record<string, unknown>): void {
  const metrics = typeof data.metrics === 'object' && data.metrics ? (data.metrics as Record<string, unknown>) : {};
  const webVitals = typeof metrics.webVitals === 'object' && metrics.webVitals ? (metrics.webVitals as Record<string, unknown>) : {};
  process.stdout.write(`Vitals for ${formatSessionTab(data)}\n`);
  process.stdout.write(`- ttfb: ${String(webVitals.ttfb ?? 'n/a')}\n`);
  process.stdout.write(`- fcp: ${String(webVitals.fcp ?? 'n/a')}\n`);
}

function printPushStateResult(data: Record<string, unknown>): void {
  process.stdout.write(`pushState ${formatSessionTab(data)} ${String(data.before ?? '')} -> ${String(data.after ?? '')}\n`);
}

function printAddInitScriptResult(data: Record<string, unknown>): void {
  process.stdout.write(`Added init script ${String(data.id ?? '')} to ${String(data.sessionName ?? 'session')} (${String(data.sourceLength ?? 0)} chars)\n`);
}

function printRemoveInitScriptResult(data: Record<string, unknown>): void {
  process.stdout.write(`Init script ${String(data.id ?? '')} was not removed: ${String(data.reason ?? 'unsupported')}\n`);
}

function printStopAllSessionsResult(data: Record<string, unknown>): void {
  process.stdout.write(`Stopped ${String(data.stopped ?? 0)} sessions
`);
}

function printOpenResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const title = typeof data.title === 'string' && data.title.length > 0 ? ` ${formatQuoted(data.title)}` : '';
  const url = typeof data.url === 'string' ? data.url : '';
  process.stdout.write(`Opened ${location}${title}${url ? ` ${url}` : ''}\n`);
}

function printNavigationResult(prefix: string, data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const title = typeof data.title === 'string' && data.title.length > 0 ? ` ${formatQuoted(data.title)}` : '';
  const url = typeof data.url === 'string' ? data.url : '';
  process.stdout.write(`${prefix} ${location}${title}${url ? ` ${url}` : ''}\n`);
}

function printClickResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const target = String(data.target ?? 'unknown');
  const url = typeof data.url === 'string' ? data.url : '';
  process.stdout.write(`Clicked ${location} ${target}${url ? ` ${url}` : ''}\n`);
}

function printHoverResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const target = String(data.target ?? 'unknown');
  process.stdout.write(`Hovered ${location} ${target}\n`);
}

function printTargetActionResult(prefix: string, data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const target = String(data.target ?? 'unknown');
  const url = typeof data.url === 'string' ? data.url : '';
  process.stdout.write(`${prefix} ${location} ${target}${url ? ` ${url}` : ''}\n`);
}

function printFillResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const target = String(data.target ?? 'unknown');
  const valueLength = typeof data.valueLength === 'number' ? data.valueLength : undefined;
  process.stdout.write(`Filled ${location} ${target}${valueLength !== undefined ? ` (${valueLength} chars)` : ''}\n`);
}

function printTypeResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const target = String(data.target ?? 'unknown');
  const valueLength = typeof data.valueLength === 'number' ? data.valueLength : undefined;
  process.stdout.write(`Typed ${location} ${target}${valueLength !== undefined ? ` (+${valueLength} chars)` : ''}\n`);
}

function printCheckResult(prefix: string, data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const target = String(data.target ?? 'unknown');
  process.stdout.write(`${prefix} ${location} ${target}\n`);
}

function printSelectResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const target = String(data.target ?? 'unknown');
  const value = Array.isArray(data.value) ? data.value.map((item) => String(item)).join(',') : String(data.value ?? '');
  process.stdout.write(`Selected ${location} ${target} ${formatQuoted(value)}\n`);
}

function printPressResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const key = String(data.key ?? 'unknown');
  process.stdout.write(`Pressed ${location} ${key}\n`);
}

function printKeyboardTextResult(prefix: string, data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const valueLength = typeof data.valueLength === 'number' ? data.valueLength : undefined;
  process.stdout.write(`${prefix} ${location}${valueLength !== undefined ? ` (${valueLength} chars)` : ''}\n`);
}

function printMouseResult(prefix: string, data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const details = ['x', 'y', 'button', 'deltaX', 'deltaY']
    .filter((key) => data[key] !== undefined)
    .map((key) => `${key}=${String(data[key])}`)
    .join(' ');
  process.stdout.write(`${prefix} ${location}${details ? ` ${details}` : ''}\n`);
}

function printScrollResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const direction = String(data.direction ?? 'down');
  const amount = typeof data.amount === 'number' ? data.amount : undefined;
  const target = typeof data.target === 'string' ? ` ${data.target}` : '';
  const url = typeof data.url === 'string' ? data.url : '';
  process.stdout.write(`Scrolled ${location}${target} ${direction}${amount !== undefined ? ` ${amount}` : ''}${url ? ` ${url}` : ''}\n`);
}

function printScrollIntoViewResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const target = String(data.target ?? 'unknown');
  process.stdout.write(`Scrolled into view ${location} ${target}\n`);
}

function printWaitResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  if (data.download === true) {
    const path = typeof data.path === 'string' ? ` ${data.path}` : '';
    const filename = typeof data.suggestedFilename === 'string' ? ` ${formatQuoted(data.suggestedFilename)}` : '';
    process.stdout.write(`Downloaded ${location}${filename}${path}\n`);
    return;
  }
  const ms = typeof data.ms === 'number' ? `${data.ms}ms` : undefined;
  const target = typeof data.target === 'string' ? data.target : undefined;
  const text = typeof data.text === 'string' ? `text=${formatQuoted(data.text)}` : undefined;
  const loadState = typeof data.loadState === 'string' ? `load=${data.loadState}` : undefined;
  const urlPattern = typeof data.urlPattern === 'string' ? `url=${formatQuoted(data.urlPattern)}` : undefined;
  const fn = typeof data.fn === 'string' ? 'fn' : undefined;
  const waitedFor = [ms, target, text, loadState, urlPattern, fn].filter(Boolean).join(' ');
  const url = typeof data.url === 'string' ? data.url : '';
  process.stdout.write(`Ready ${location}${waitedFor ? ` ${waitedFor}` : ''}${url ? ` ${url}` : ''}\n`);
}

function printDownloadResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const target = String(data.target ?? 'unknown');
  const filePath = String(data.path ?? '');
  const filename = typeof data.suggestedFilename === 'string' ? ` ${formatQuoted(data.suggestedFilename)}` : '';
  process.stdout.write(`Downloaded ${location} ${target}${filename}${filePath ? ` ${filePath}` : ''}\n`);
}

function printRuntimeSetResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const setting = String(data.setting ?? 'runtime');
  const lifetime = String(data.lifetime ?? 'runtime');
  process.stdout.write(`Set ${setting} for ${lifetime} ${location}\n`);
}

function printFrameResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  if (data.active === false) {
    process.stdout.write(`Frame context cleared ${location}\n`);
    return;
  }
  const frame = String(data.frame ?? 'unknown');
  const url = typeof data.url === 'string' ? ` ${data.url}` : '';
  process.stdout.write(`Frame context ${location} ${frame}${url}\n`);
}

function printDialogStatusResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  if (data.pending !== true) {
    process.stdout.write(`No pending dialog ${location}\n`);
    return;
  }
  const dialog = typeof data.dialog === 'object' && data.dialog ? (data.dialog as Record<string, unknown>) : {};
  process.stdout.write(`Pending dialog ${location} ${String(dialog.type ?? 'dialog')} ${formatQuoted(dialog.message)}\n`);
}

function printDialogResolveResult(prefix: string, data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const dialog = typeof data.dialog === 'object' && data.dialog ? (data.dialog as Record<string, unknown>) : {};
  process.stdout.write(`${prefix} dialog ${location} ${String(dialog.type ?? 'dialog')} ${formatQuoted(dialog.message)}\n`);
}

function printReadResult(data: Record<string, unknown>): void {
  process.stdout.write(`${String(data.content ?? '')}\n`);
}

function printDaemonStopResult(data: Record<string, unknown>): void {
  const stopped = Boolean(data.stopped);
  if (!stopped) {
    process.stdout.write('Daemon is not running\n');
    return;
  }

  const pid = typeof data.pid === 'number' ? ` ${data.pid}` : '';
  process.stdout.write(`Stopped daemon${pid}\n`);
}

function printDaemonRestartResult(data: Record<string, unknown>): void {
  const pid = typeof data.pid === 'number' ? ` ${data.pid}` : '';
  process.stdout.write(`Restarted daemon${pid}\n`);
}

function printDaemonCleanupResult(data: Record<string, unknown>): void {
  const stoppedSessions = typeof data.stoppedSessions === 'number' ? data.stoppedSessions : 0;
  const stoppedDaemon = Boolean(data.stoppedDaemon);
  const killedProcesses = typeof data.killedProcesses === 'number' ? data.killedProcesses : 0;
  process.stdout.write(`Cleanup complete: stopped ${stoppedSessions} sessions, ${stoppedDaemon ? 'stopped daemon' : 'daemon already stopped'}, killed ${killedProcesses} Camoufox processes\n`);
}

function printSessionStopResult(data: Record<string, unknown>): void {
  const sessionName = typeof data.sessionName === 'string' ? data.sessionName : 'session';
  const stopped = data.stopped === true;
  process.stdout.write(stopped ? `Stopped session ${sessionName}\n` : `Session ${sessionName} is not running\n`);
}

function printSessionCurrentResult(data: Record<string, unknown>): void {
  process.stdout.write(`${String(data.sessionName ?? 'default')}\n`);
}

function printSessionInfoResult(data: Record<string, unknown>): void {
  const sessionName = String(data.sessionName ?? 'session');
  const active = data.active === true;
  process.stdout.write(`Session ${sessionName} ${active ? 'running' : 'stopped'}\n`);

  const daemon = typeof data.daemon === 'object' && data.daemon ? (data.daemon as Record<string, unknown>) : undefined;
  if (daemon) {
    const daemonRunning = daemon.running === true;
    const pid = typeof daemon.pid === 'number' ? ` ${daemon.pid}` : '';
    process.stdout.write(`Daemon: ${daemonRunning ? 'running' : 'stopped'}${pid}\n`);
  }

  if (typeof data.browserVersion === 'string') {
    process.stdout.write(`Browser: ${data.browserVersion}${data.headless === true ? ' headless' : data.headless === false ? ' headed' : ''}\n`);
  }
  const launch = typeof data.launch === 'object' && data.launch ? (data.launch as Record<string, unknown>) : undefined;
  if (launch) {
    const details = [
      'browser',
      'headless',
      'preset',
      'proxy',
      'proxyBypass',
      'userAgent',
      'ignoreHTTPSErrors',
      'colorScheme',
      'reducedMotion',
      'state',
      'locale',
      'timezone',
      'region',
      'screenProfile',
      'windowProfile',
    ]
      .filter((key) => launch[key] !== undefined)
      .map((key) => {
        const value = Array.isArray(launch[key]) ? (launch[key] as unknown[]).map(String).join(',') : String(launch[key]);
        return `${key}=${value}`;
      })
      .join(' ');
    if (details) {
      process.stdout.write(`Launch: ${details}\n`);
    }
  }
  if (typeof data.activeTabName === 'string') {
    process.stdout.write(`Active tab: ${data.activeTabName}\n`);
  }
  if (typeof data.rootDir === 'string') {
    process.stdout.write(`Root: ${data.rootDir}\n`);
  }
  if (typeof data.profileDir === 'string') {
    process.stdout.write(`User data: ${data.profileDir}\n`);
  }
  if (typeof data.downloadsDir === 'string') {
    process.stdout.write(`Downloads: ${data.downloadsDir}\n`);
  }
  if (typeof data.artifactsDir === 'string') {
    process.stdout.write(`Artifacts: ${data.artifactsDir}\n`);
  }

  const tabs = Array.isArray(data.tabs) ? data.tabs : [];
  for (const tab of tabs) {
    if (!tab || typeof tab !== 'object') {
      continue;
    }
    const record = tab as Record<string, unknown>;
    const state = record.active === true ? ' active' : '';
    process.stdout.write(`Tab: ${String(record.tabName ?? 'unknown')}${state} ${String(record.url ?? '')}\n`);
  }
}

function printTabNewResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const url = typeof data.url === 'string' ? data.url : '';
  process.stdout.write(`Created tab ${location}${url ? ` ${url}` : ''}\n`);
}

function printTabActivateResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const url = typeof data.url === 'string' ? data.url : '';
  process.stdout.write(`Active tab ${location}${url ? ` ${url}` : ''}\n`);
}

function printWindowNewResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const url = typeof data.url === 'string' ? data.url : '';
  process.stdout.write(`Created page ${location}${url ? ` ${url}` : ''} (not guaranteed OS window)\n`);
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

function printValueResult(data: Record<string, unknown>): void {
  process.stdout.write(`${String((data as Record<string, unknown>).value ?? '')}\n`);
}

function printCountResult(data: Record<string, unknown>): void {
  process.stdout.write(`${String(data.count ?? 0)}\n`);
}

function printBoxResult(data: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(data.box ?? null)}\n`);
}

function printStylesResult(data: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(data.styles ?? {}, null, 2)}\n`);
}

function printPredicateResult(data: Record<string, unknown>): void {
  process.stdout.write(`${String(Boolean(data.value))}\n`);
}

function printFindResult(data: Record<string, unknown>): void {
  if (typeof data.text === 'string') {
    process.stdout.write(`${data.text}\n`);
    return;
  }

  const location = formatSessionTab(data);
  const locatorType = String(data.locatorType ?? 'locator');
  const value = data.value ?? data.target ?? data.index ?? '';
  const subaction = String(data.subaction ?? 'click');
  process.stdout.write(`Found ${location} ${locatorType}${value !== '' ? ` ${formatQuoted(value)}` : ''} ${subaction}\n`);
}

function printUploadResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  const target = String(data.target ?? 'unknown');
  process.stdout.write(`Uploaded ${String(data.count ?? 0)} files ${location} ${target}\n`);
}

function printDragResult(data: Record<string, unknown>): void {
  const location = formatSessionTab(data);
  process.stdout.write(`Dragged ${location} ${String(data.source ?? 'unknown')} -> ${String(data.target ?? 'unknown')}\n`);
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

function printProfileList(data: unknown): void {
  const profiles = Array.isArray(data) ? data : [];

  if (profiles.length === 0) {
    process.stdout.write('Stored profiles: none\n');
    return;
  }

  process.stdout.write('Stored profiles:\n');
  for (const profile of profiles) {
    if (!profile || typeof profile !== 'object') {
      continue;
    }

    const record = profile as Record<string, unknown>;
    const profileName = String(record.profileName ?? 'unknown');
    const running = record.running === true;
    const rootDir = String(record.rootDir ?? '');
    const browserVersion = typeof record.browserVersion === 'string' ? ` ${record.browserVersion}` : '';
    const mode = running ? ` ${record.headless === true ? 'headless' : 'headed'}` : '';
    process.stdout.write(`- ${profileName} ${running ? 'running' : 'stopped'}${browserVersion}${mode}${rootDir ? ` ${rootDir}` : ''}\n`);

    if (typeof record.sessionName === 'string' && record.sessionName.length > 0) {
      process.stdout.write(`  session: ${record.sessionName}\n`);
    }

    const tabs = Array.isArray(record.tabs) ? record.tabs : [];
    for (const tab of tabs) {
      if (!tab || typeof tab !== 'object') {
        continue;
      }

      const tabRecord = tab as Record<string, unknown>;
      process.stdout.write(`  tab: ${String(tabRecord.tabName ?? 'unknown')} ${String(tabRecord.url ?? '')}\n`);
    }
  }
}

function printProfileInspectResult(data: Record<string, unknown>): void {
  const profileName = String(data.profileName ?? 'unknown');
  if (data.found !== true) {
    process.stdout.write(`Profile ${profileName} was not found\n`);
    if (typeof data.rootDir === 'string') {
      process.stdout.write(`${data.rootDir}\n`);
    }
    return;
  }

  process.stdout.write(`Profile ${profileName}\n`);
  process.stdout.write(`State: ${data.running === true ? 'running' : 'stopped'}\n`);
  if (typeof data.sessionName === 'string') {
    process.stdout.write(`Session: ${data.sessionName}\n`);
  }
  if (typeof data.browserVersion === 'string') {
    process.stdout.write(`Browser: ${data.browserVersion}${data.headless === true ? ' headless' : ' headed'}\n`);
  }
  if (typeof data.rootDir === 'string') {
    process.stdout.write(`Root: ${data.rootDir}\n`);
  }
  if (typeof data.profileDir === 'string') {
    process.stdout.write(`User data: ${data.profileDir}\n`);
  }
  if (typeof data.downloadsDir === 'string') {
    process.stdout.write(`Downloads: ${data.downloadsDir}\n`);
  }
  if (typeof data.artifactsDir === 'string') {
    process.stdout.write(`Artifacts: ${data.artifactsDir}\n`);
  }
  const tabs = Array.isArray(data.tabs) ? data.tabs : [];
  for (const tab of tabs) {
    if (!tab || typeof tab !== 'object') {
      continue;
    }
    const record = tab as Record<string, unknown>;
    process.stdout.write(`Tab: ${String(record.tabName ?? 'unknown')} ${String(record.url ?? '')}\n`);
  }
}

function printProfileRemoveResult(data: Record<string, unknown>): void {
  const profileName = String(data.profileName ?? 'unknown');
  const rootDir = typeof data.rootDir === 'string' ? data.rootDir : undefined;
  if (data.removed === true) {
    process.stdout.write(`Removed profile ${profileName}\n`);
    if (data.stopped === true) {
      process.stdout.write('Stopped running session first\n');
    }
    if (rootDir) {
      process.stdout.write(`${rootDir}\n`);
    }
    return;
  }

  process.stdout.write(`Profile ${profileName} was not found\n`);
  if (rootDir) {
    process.stdout.write(`${rootDir}\n`);
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
    if (action === 'state.show' && data && typeof data === 'object' && 'state' in data) {
      process.stdout.write(`${JSON.stringify((data as Record<string, unknown>).state, null, 2)}\n`);
      return;
    }
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
    case 'remote-versions':
      printRemoteVersions(data as Record<string, unknown>);
      return;
    case 'presets':
      printPresets(data as Record<string, unknown>);
      return;
    case 'fingerprint-profiles':
      printFingerprintProfiles(data as Record<string, unknown>);
      return;
    case 'session.list':
      printSessionList(data);
      return;
    case 'session.current':
    case 'session.id':
      printSessionCurrentResult(data as Record<string, unknown>);
      return;
    case 'session.info':
      printSessionInfoResult(data as Record<string, unknown>);
      return;
    case 'profile.list':
      printProfileList(data);
      return;
    case 'profile.inspect':
      printProfileInspectResult(data as Record<string, unknown>);
      return;
    case 'profile.remove':
      printProfileRemoveResult(data as Record<string, unknown>);
      return;
    case 'tab.list':
      printTabList(data);
      return;
    case 'doctor':
      printDoctorSummary(data as Record<string, unknown>);
      return;
    case 'eval':
      printEvalResult(data as Record<string, unknown>);
      return;
    case 'cookies.export':
      printCookiesExportResult(data as Record<string, unknown>);
      return;
    case 'cookies.get':
      printCookiesListResult(data as Record<string, unknown>);
      return;
    case 'cookies.set':
      printCookiesSetResult(data as Record<string, unknown>);
      return;
    case 'cookies.clear':
      printCookiesClearResult(data as Record<string, unknown>);
      return;
    case 'cookies.import':
      printCookiesImportResult(data as Record<string, unknown>);
      return;
    case 'storage.local':
    case 'storage.session':
      printStorageResult(data as Record<string, unknown>);
      return;
    case 'state.list':
      printStateListResult(data as Record<string, unknown>);
      return;
    case 'state.save':
      printStateSaveResult(data as Record<string, unknown>);
      return;
    case 'state.load':
      printStateLoadResult(data as Record<string, unknown>);
      return;
    case 'state.show':
      printStateShowResult(data as Record<string, unknown>);
      return;
    case 'state.clear':
      printStateClearResult(data as Record<string, unknown>);
      return;
    case 'state.clean':
      printStateCleanResult(data as Record<string, unknown>);
      return;
    case 'state.rename':
      printStateRenameResult(data as Record<string, unknown>);
      return;
    case 'network.route':
      printNetworkRouteResult(data as Record<string, unknown>);
      return;
    case 'network.unroute':
      printNetworkUnrouteResult(data as Record<string, unknown>);
      return;
    case 'network.requests':
      printNetworkRequestsResult(data as Record<string, unknown>);
      return;
    case 'network.request':
      printNetworkRequestResult(data as Record<string, unknown>);
      return;
    case 'network.har.start':
      printNetworkHarStartResult(data as Record<string, unknown>);
      return;
    case 'network.har.stop':
      printNetworkHarStopResult(data as Record<string, unknown>);
      return;
    case 'console':
      printConsoleEventsResult(data as Record<string, unknown>);
      return;
    case 'errors':
      printPageErrorsResult(data as Record<string, unknown>);
      return;
    case 'highlight':
      printHighlightResult(data as Record<string, unknown>);
      return;
    case 'clipboard.read':
      printClipboardTextResult(data as Record<string, unknown>);
      return;
    case 'clipboard.write':
      printClipboardWriteResult(data as Record<string, unknown>);
      return;
    case 'clipboard.copy':
      printClipboardShortcutResult('Copied', data as Record<string, unknown>);
      return;
    case 'clipboard.paste':
      printClipboardShortcutResult('Pasted', data as Record<string, unknown>);
      return;
    case 'trace.start':
      printTraceStartResult(data as Record<string, unknown>);
      return;
    case 'trace.stop':
      printTraceStopResult(data as Record<string, unknown>);
      return;
    case 'diff.snapshot':
    case 'diff.screenshot':
    case 'diff.url':
      printDiffResult(data as Record<string, unknown>);
      return;
    case 'vitals':
      printVitalsResult(data as Record<string, unknown>);
      return;
    case 'pushstate':
      printPushStateResult(data as Record<string, unknown>);
      return;
    case 'addinitscript':
      printAddInitScriptResult(data as Record<string, unknown>);
      return;
    case 'removeinitscript':
      printRemoveInitScriptResult(data as Record<string, unknown>);
      return;
    case 'session.stopAll':
      printStopAllSessionsResult(data as Record<string, unknown>);
      return;
    case 'open':
      printOpenResult(data as Record<string, unknown>);
      return;
    case 'back':
      printNavigationResult('Went back', data as Record<string, unknown>);
      return;
    case 'forward':
      printNavigationResult('Went forward', data as Record<string, unknown>);
      return;
    case 'reload':
      printNavigationResult('Reloaded', data as Record<string, unknown>);
      return;
    case 'click':
      printClickResult(data as Record<string, unknown>);
      return;
    case 'download':
      printDownloadResult(data as Record<string, unknown>);
      return;
    case 'dblclick':
      printTargetActionResult('Double-clicked', data as Record<string, unknown>);
      return;
    case 'hover':
      printHoverResult(data as Record<string, unknown>);
      return;
    case 'focus':
      printTargetActionResult('Focused', data as Record<string, unknown>);
      return;
    case 'fill':
      printFillResult(data as Record<string, unknown>);
      return;
    case 'type':
      printTypeResult(data as Record<string, unknown>);
      return;
    case 'check':
      printCheckResult('Checked', data as Record<string, unknown>);
      return;
    case 'uncheck':
      printCheckResult('Unchecked', data as Record<string, unknown>);
      return;
    case 'select':
      printSelectResult(data as Record<string, unknown>);
      return;
    case 'press':
      printPressResult(data as Record<string, unknown>);
      return;
    case 'keyboard.down':
      printPressResult(data as Record<string, unknown>);
      return;
    case 'keyboard.up':
      printPressResult(data as Record<string, unknown>);
      return;
    case 'keyboard.type':
      printKeyboardTextResult('Keyboard typed', data as Record<string, unknown>);
      return;
    case 'keyboard.insertText':
      printKeyboardTextResult('Keyboard inserted', data as Record<string, unknown>);
      return;
    case 'mouse.move':
      printMouseResult('Mouse moved', data as Record<string, unknown>);
      return;
    case 'mouse.down':
      printMouseResult('Mouse down', data as Record<string, unknown>);
      return;
    case 'mouse.up':
      printMouseResult('Mouse up', data as Record<string, unknown>);
      return;
    case 'mouse.wheel':
      printMouseResult('Mouse wheel', data as Record<string, unknown>);
      return;
    case 'scroll':
      printScrollResult(data as Record<string, unknown>);
      return;
    case 'scroll.intoView':
      printScrollIntoViewResult(data as Record<string, unknown>);
      return;
    case 'upload':
      printUploadResult(data as Record<string, unknown>);
      return;
    case 'drag':
      printDragResult(data as Record<string, unknown>);
      return;
    case 'wait':
      printWaitResult(data as Record<string, unknown>);
      return;
    case 'runtime.set':
      printRuntimeSetResult(data as Record<string, unknown>);
      return;
    case 'frame':
      printFrameResult(data as Record<string, unknown>);
      return;
    case 'dialog.status':
      printDialogStatusResult(data as Record<string, unknown>);
      return;
    case 'dialog.accept':
      printDialogResolveResult('Accepted', data as Record<string, unknown>);
      return;
    case 'dialog.dismiss':
      printDialogResolveResult('Dismissed', data as Record<string, unknown>);
      return;
    case 'read':
      printReadResult(data as Record<string, unknown>);
      return;
    case 'find':
      printFindResult(data as Record<string, unknown>);
      return;
    case 'session.stop':
      printSessionStopResult(data as Record<string, unknown>);
      return;
    case 'daemon.stop':
      printDaemonStopResult(data as Record<string, unknown>);
      return;
    case 'daemon.restart':
      printDaemonRestartResult(data as Record<string, unknown>);
      return;
    case 'daemon.cleanup':
      printDaemonCleanupResult(data as Record<string, unknown>);
      return;
    case 'tab.new':
      printTabNewResult(data as Record<string, unknown>);
      return;
    case 'tab.activate':
      printTabActivateResult(data as Record<string, unknown>);
      return;
    case 'window.new':
      printWindowNewResult(data as Record<string, unknown>);
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
    case 'get.value':
      printValueResult(data as Record<string, unknown>);
      return;
    case 'get.html':
      process.stdout.write(`${String((data as Record<string, unknown>).html ?? '')}\n`);
      return;
    case 'get.attr':
      printValueResult(data as Record<string, unknown>);
      return;
    case 'get.count':
      printCountResult(data as Record<string, unknown>);
      return;
    case 'get.box':
      printBoxResult(data as Record<string, unknown>);
      return;
    case 'get.styles':
      printStylesResult(data as Record<string, unknown>);
      return;
    case 'is.visible':
    case 'is.enabled':
    case 'is.checked':
      printPredicateResult(data as Record<string, unknown>);
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
