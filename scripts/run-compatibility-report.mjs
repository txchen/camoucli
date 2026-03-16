import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const options = {
    output: undefined,
    versions: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--output') {
      options.output = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === '--version') {
      const raw = argv[index + 1] ?? '';
      options.versions.push(...raw.split(',').map((item) => item.trim()).filter(Boolean));
      index += 1;
      continue;
    }
  }

  if (!options.output) {
    throw new Error('Missing required --output <file> argument.');
  }

  if (options.versions.length === 0) {
    const envVersions = process.env.CAMOUFOX_VERSIONS ?? '135.0.1-beta.24,135.0.1-beta.23';
    options.versions.push(...envVersions.split(',').map((item) => item.trim()).filter(Boolean));
  }

  return options;
}

async function runCamouCommand(args) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, ['dist/cli/main.js', ...args], {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
      env: process.env,
    });

    return {
      ok: true,
      stdout,
      stderr,
    };
  } catch (error) {
    return {
      ok: false,
      stdout: typeof error === 'object' && error && 'stdout' in error ? String(error.stdout ?? '') : '',
      stderr: typeof error === 'object' && error && 'stderr' in error ? String(error.stderr ?? '') : '',
      message: error instanceof Error ? error.message : String(error),
      code: typeof error === 'object' && error && 'code' in error ? error.code : undefined,
    };
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const installAttempts = [];

  for (const version of options.versions) {
    const args = version === 'latest' ? ['install', '--json'] : ['install', version, '--json'];
    const result = await runCamouCommand(args);
    const parsed = parseJson(result.stdout);
    installAttempts.push({
      requestedVersion: version,
      success: result.ok,
      releaseVersion: typeof parsed?.version === 'string' ? parsed.version : undefined,
      code: result.code,
      error: result.ok ? undefined : result.message,
      stderr: result.ok ? undefined : result.stderr.trim() || undefined,
    });
  }

  const versionsResult = await runCamouCommand(['versions', '--json']);
  const doctorResult = await runCamouCommand(['doctor', '--json']);

  const report = {
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    requestedVersions: options.versions,
    installAttempts,
    versions: parseJson(versionsResult.stdout),
    doctor: parseJson(doctorResult.stdout),
    commandErrors: {
      versions: versionsResult.ok ? undefined : {
        message: versionsResult.message,
        stderr: versionsResult.stderr.trim() || undefined,
      },
      doctor: doctorResult.ok ? undefined : {
        message: doctorResult.message,
        stderr: doctorResult.stderr.trim() || undefined,
      },
    },
  };

  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${options.output}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
