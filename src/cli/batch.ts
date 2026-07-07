import { ValidationError } from '../util/errors.js';
import { createProgram, type BatchCommandSpec, type CliHandlers, type SharedOptions } from './program.js';

export interface BatchCommandResult {
  index: number;
  argv: string[];
  action: string;
  data: unknown;
}

export interface BatchResult {
  count: number;
  results: BatchCommandResult[];
}

export type BatchDaemonActionExecutor = (
  action: string,
  payload: Record<string, unknown>,
  options: SharedOptions,
) => Promise<unknown>;

function mergeSharedOptions(batchOptions: SharedOptions, commandOptions: SharedOptions): SharedOptions {
  const merged: Record<string, unknown> = { ...batchOptions };
  for (const [key, value] of Object.entries(commandOptions) as Array<[keyof SharedOptions, unknown]>) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged as SharedOptions;
}

function unsupportedBatchCommand(command: string): never {
  throw new ValidationError(`batch only supports browser/session daemon commands; ${command} cannot run inside batch.`);
}

function createBatchProgramHandlers(
  batchOptions: SharedOptions,
  command: BatchCommandSpec,
  results: BatchCommandResult[],
  executeAction: BatchDaemonActionExecutor,
): CliHandlers {
  const recordAction = async (action: string, payload: Record<string, unknown>, options: SharedOptions): Promise<void> => {
    const data = await executeAction(action, payload, mergeSharedOptions(batchOptions, options));
    results.push({
      index: results.length + 1,
      argv: command,
      action,
      data,
    });
  };

  const unsupported = async (): Promise<void> => {
    unsupportedBatchCommand(command[0] ?? 'unknown');
  };

  return {
    onInstall: unsupported,
    onRemove: unsupported,
    onUse: unsupported,
    onVersions: unsupported,
    onRemoteVersions: unsupported,
    onPresets: unsupported,
    onFingerprintProfiles: unsupported,
    onPath: unsupported,
    onVersion: unsupported,
    onDoctor: unsupported,
    onDaemonAction: recordAction,
    onSessionCurrent: unsupported,
    onSessionId: unsupported,
    onSessionInfo: async (options: SharedOptions) => {
      await recordAction('session.info', { action: 'session.info', session: options.session }, options);
    },
    onDaemonStop: unsupported,
    onDaemonRestart: unsupported,
    onDaemonCleanup: unsupported,
    onSkills: unsupported,
    onBatch: unsupported,
  };
}

export async function executeBatchCommands(
  commands: BatchCommandSpec[],
  options: SharedOptions,
  executeAction: BatchDaemonActionExecutor,
): Promise<BatchResult> {
  const results: BatchCommandResult[] = [];

  for (const command of commands) {
    const program = createProgram(createBatchProgramHandlers(options, command, results, executeAction), { quietErrors: true });
    await program.parseAsync(['node', 'camou', ...command], { from: 'node' });
  }

  return {
    count: results.length,
    results,
  };
}
