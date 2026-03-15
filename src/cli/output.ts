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
    case 'doctor':
      process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
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
