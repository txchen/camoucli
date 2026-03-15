import net from 'node:net';

import type { CamoucliPaths } from '../state/paths.js';
import { IpcError, ValidationError } from '../util/errors.js';
import {
  createRequestId,
  daemonResponseSchema,
  type DaemonRequest,
  type DaemonResponse,
  type DaemonSuccessResponse,
} from './protocol.js';

export async function sendDaemonRequest(
  paths: CamoucliPaths,
  request: Omit<DaemonRequest, 'id'> & { id?: string },
  timeoutMs = 20_000,
): Promise<DaemonSuccessResponse['data']> {
  const normalizedRequest = {
    ...request,
    id: request.id ?? createRequestId(),
  } as DaemonRequest;

  const response = await new Promise<DaemonResponse>((resolve, reject) => {
    const socket = paths.daemonSocketPath
      ? net.createConnection({ path: paths.daemonSocketPath })
      : net.createConnection({
          host: paths.daemonHost ?? '127.0.0.1',
          port: paths.daemonPort ?? 43133,
        });

    let buffer = '';
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new IpcError(`Timed out waiting for daemon response after ${timeoutMs}ms.`));
    }, timeoutMs);

    const cleanup = () => clearTimeout(timer);

    socket.once('error', (error) => {
      cleanup();
      reject(new IpcError('Unable to connect to the camou daemon.', undefined, error));
    });

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }

        cleanup();
        socket.end();
        try {
          resolve(daemonResponseSchema.parse(JSON.parse(trimmed)));
        } catch (error) {
          reject(new ValidationError('Daemon returned an invalid response.', undefined, error));
        }
      }
    });

    socket.once('connect', () => {
      socket.write(`${JSON.stringify(normalizedRequest)}\n`);
    });
  });

  if (!response.success) {
    throw new IpcError(response.error.message, response.error.details);
  }

  return response.data;
}

export async function pingDaemon(paths: CamoucliPaths): Promise<boolean> {
  try {
    await sendDaemonRequest(paths, { action: 'ping' }, 2_000);
    return true;
  } catch {
    return false;
  }
}
