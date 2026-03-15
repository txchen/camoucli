export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface CamoucliErrorOptions {
  code: string;
  message: string;
  exitCode?: number;
  details?: unknown;
  cause?: unknown;
}

export class CamoucliError extends Error {
  readonly code: string;
  readonly exitCode: number;
  readonly details?: unknown;

  constructor(options: CamoucliErrorOptions) {
    super(options.message, options.cause ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = options.code;
    this.exitCode = options.exitCode ?? 1;
    this.details = options.details;
  }
}

export class ValidationError extends CamoucliError {
  constructor(message: string, details?: unknown, cause?: unknown) {
    super({ code: 'validation_error', message, details, cause, exitCode: 2 });
  }
}

export class UnsupportedPlatformError extends CamoucliError {
  constructor(message: string, details?: unknown) {
    super({ code: 'unsupported_platform', message, details, exitCode: 2 });
  }
}

export class BrowserNotInstalledError extends CamoucliError {
  constructor(message = 'Camoufox is not installed. Run `camoucli install`.') {
    super({ code: 'browser_not_installed', message, exitCode: 3 });
  }
}

export class InstallError extends CamoucliError {
  constructor(message: string, details?: unknown, cause?: unknown) {
    super({ code: 'install_error', message, details, cause, exitCode: 4 });
  }
}

export class DaemonStartError extends CamoucliError {
  constructor(message: string, details?: unknown, cause?: unknown) {
    super({ code: 'daemon_start_error', message, details, cause, exitCode: 5 });
  }
}

export class IpcError extends CamoucliError {
  constructor(message: string, details?: unknown, cause?: unknown) {
    super({ code: 'ipc_error', message, details, cause, exitCode: 6 });
  }
}

export class SessionError extends CamoucliError {
  constructor(message: string, details?: unknown, cause?: unknown) {
    super({ code: 'session_error', message, details, cause, exitCode: 7 });
  }
}

export class RefNotFoundError extends CamoucliError {
  constructor(ref: string) {
    super({
      code: 'invalid_ref',
      message: `Reference ${ref} is not available for the current tab. Run snapshot again.`,
      exitCode: 8,
    });
  }
}

export function isCamoucliError(error: unknown): error is CamoucliError {
  return error instanceof CamoucliError;
}

export function toErrorPayload(error: unknown): ErrorPayload {
  if (isCamoucliError(error)) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'unexpected_error',
      message: error.message,
    };
  }

  return {
    code: 'unexpected_error',
    message: String(error),
  };
}

export function getExitCode(error: unknown): number {
  return isCamoucliError(error) ? error.exitCode : 1;
}
