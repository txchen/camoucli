import net, { type Server } from 'node:net';
import { unlink } from 'node:fs/promises';

import type { CamoucliPaths } from '../state/paths.js';
import { isCamoucliError, toErrorPayload, ValidationError } from '../util/errors.js';
import type { Logger } from '../util/log.js';
import {
  daemonRequestSchema,
  daemonResponseSchema,
  failureResponse,
  successResponse,
  type DaemonRequest,
  type DaemonResponse,
} from './protocol.js';

export interface IpcServerHandle {
  server: Server;
  close: () => Promise<void>;
}

export type RequestHandler = (request: DaemonRequest) => Promise<unknown>;

const HTTP_PREFIXES = ['GET ', 'POST ', 'PUT ', 'DELETE ', 'PATCH ', 'HEAD ', 'OPTIONS '];

function isHttpTraffic(line: string): boolean {
  return HTTP_PREFIXES.some((prefix) => line.startsWith(prefix));
}

async function removeStaleSocket(socketPath: string): Promise<void> {
  try {
    await unlink(socketPath);
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
      throw error;
    }
  }
}

function respond(socket: net.Socket, response: DaemonResponse): void {
  const payload = daemonResponseSchema.parse(response);
  socket.write(`${JSON.stringify(payload)}\n`);
}

export async function createIpcServer(
  paths: CamoucliPaths,
  handler: RequestHandler,
  logger: Logger,
): Promise<IpcServerHandle> {
  if (paths.daemonSocketPath) {
    await removeStaleSocket(paths.daemonSocketPath);
  }

  const server = net.createServer((socket) => {
    socket.setEncoding('utf8');
    let buffer = '';

    socket.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }

        if (isHttpTraffic(trimmed)) {
          logger.warn('Rejected accidental HTTP traffic');
          socket.end('camoucli-daemon only accepts newline-delimited JSON\n');
          return;
        }

        void (async () => {
          let requestId = 'unknown';
          try {
            const parsed = JSON.parse(trimmed) as unknown;
            if (typeof parsed === 'object' && parsed && 'id' in parsed && typeof parsed.id === 'string') {
              requestId = parsed.id;
            }

            const request = daemonRequestSchema.parse(parsed);
            const data = await handler(request);
            respond(socket, successResponse(request.id, data));
          } catch (error) {
            const normalized = isCamoucliError(error)
              ? error
              : error instanceof Error && error.name === 'ZodError'
                ? new ValidationError('Invalid daemon request payload.')
                : error;
            logger.error('Request handling failed', { requestId, error: toErrorPayload(normalized) });
            respond(socket, failureResponse(requestId, toErrorPayload(normalized)));
          }
        })();
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    if (paths.daemonSocketPath) {
      server.listen(paths.daemonSocketPath, resolve);
      return;
    }

    server.listen(paths.daemonPort, paths.daemonHost, resolve);
  });

  logger.info('IPC server listening', {
    socketPath: paths.daemonSocketPath,
    host: paths.daemonHost,
    port: paths.daemonPort,
  });

  return {
    server,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      if (paths.daemonSocketPath) {
        await removeStaleSocket(paths.daemonSocketPath);
      }
    },
  };
}
