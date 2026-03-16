import { readFile, writeFile } from 'node:fs/promises';

function parseArgs(argv) {
  const options = {
    output: undefined,
    files: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--output') {
      options.output = argv[index + 1];
      index += 1;
      continue;
    }

    options.files.push(value);
  }

  if (options.files.length === 0) {
    throw new Error('Pass one or more compatibility report JSON files.');
  }

  return options;
}

function summarizeInstallErrors(report) {
  return (report.installAttempts ?? [])
    .filter((attempt) => attempt && attempt.success === false)
    .map((attempt) => `${attempt.requestedVersion}: ${attempt.error ?? 'install failed'}`);
}

function collectRows(report) {
  const doctorVersions = Array.isArray(report.doctor?.installedVersions) ? report.doctor.installedVersions : [];
  if (doctorVersions.length === 0) {
    return [
      {
        platform: `${report.platform}/${report.arch}`,
        node: report.nodeVersion,
        playwright: report.doctor?.playwrightCoreVersion ?? '-',
        version: '-',
        current: '-',
        launchable: report.doctor?.healthy ? 'yes' : 'no',
        notes: summarizeInstallErrors(report).join('; ') || 'No installed versions detected',
      },
    ];
  }

  const installErrors = summarizeInstallErrors(report);
  return doctorVersions.map((entry) => ({
    platform: `${report.platform}/${report.arch}`,
    node: report.nodeVersion,
    playwright: report.doctor?.playwrightCoreVersion ?? '-',
    version: entry.version ?? '-',
    current: entry.current ? 'yes' : 'no',
    launchable: entry.launchable ? 'yes' : 'no',
    notes: [entry.error, ...installErrors].filter(Boolean).join('; ') || '-',
  }));
}

function renderMarkdown(reports) {
  const rows = reports.flatMap(collectRows);
  const lines = [
    '# Compatibility Matrix',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '| Platform | Node | Playwright | Camoufox | Current | Launchable | Notes |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row.platform} | ${row.node} | ${row.playwright} | ${row.version} | ${row.current} | ${row.launchable} | ${row.notes.replace(/\|/g, '\\|')} |`),
    '',
    '## Requested Versions',
    '',
    ...reports.map((report) => `- ${report.platform}/${report.arch}: ${(report.requestedVersions ?? []).join(', ') || '(none)'}`),
  ];

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const reports = await Promise.all(
    options.files.map(async (filePath) => JSON.parse(await readFile(filePath, 'utf8'))),
  );
  const markdown = renderMarkdown(reports);

  if (options.output) {
    await writeFile(options.output, markdown, 'utf8');
  } else {
    process.stdout.write(markdown);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
