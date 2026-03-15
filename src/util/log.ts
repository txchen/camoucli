import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerOptions {
  name: string;
  filePath?: string | undefined;
  verbose?: boolean;
  mirrorToStderr?: boolean;
}

function stringifyDetail(value: unknown): string {
  if (value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export class Logger {
  readonly name: string;
  readonly verbose: boolean;
  private readonly mirrorToStderr: boolean;
  private readonly stream?: ReturnType<typeof createWriteStream>;

  constructor(options: LoggerOptions) {
    this.name = options.name;
    this.verbose = options.verbose ?? false;
    this.mirrorToStderr = options.mirrorToStderr ?? false;

    if (options.filePath) {
      mkdirSync(dirname(options.filePath), { recursive: true, mode: 0o700 });
      this.stream = createWriteStream(options.filePath, { flags: 'a' });
    }
  }

  debug(message: string, details?: unknown): void {
    if (this.verbose) {
      this.write('debug', message, details);
    }
  }

  info(message: string, details?: unknown): void {
    this.write('info', message, details);
  }

  warn(message: string, details?: unknown): void {
    this.write('warn', message, details);
  }

  error(message: string, details?: unknown): void {
    this.write('error', message, details);
  }

  async close(): Promise<void> {
    if (!this.stream) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.stream!.end((error?: Error | null) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  private write(level: LogLevel, message: string, details?: unknown): void {
    const timestamp = new Date().toISOString();
    const suffix = stringifyDetail(details);
    const line = `[${timestamp}] [${this.name}] [${level}] ${message}${suffix ? ` ${suffix}` : ''}`;

    if (this.stream) {
      this.stream.write(`${line}\n`);
    }

    if (this.mirrorToStderr || (level === 'error' && !this.stream)) {
      process.stderr.write(`${line}\n`);
    }
  }
}
