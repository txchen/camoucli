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

export function printOutput(action: string, data: unknown, asJson: boolean): void {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }

  switch (action) {
    case 'install':
      process.stdout.write(`Installed Camoufox ${String((data as Record<string, unknown>).version)}\n`);
      return;
    case 'path':
      process.stdout.write(`${String((data as Record<string, unknown>).path)}\n`);
      return;
    case 'version':
      process.stdout.write(`${String((data as Record<string, unknown>).version)}\n`);
      return;
    case 'use':
      process.stdout.write(`Using Camoufox ${String((data as Record<string, unknown>).version)}\n`);
      return;
    case 'versions':
      printInstalledVersions(data as Record<string, unknown>);
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
