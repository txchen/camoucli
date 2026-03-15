import { writeFile } from 'node:fs/promises';

import { BrowserManager } from '../browser/manager.js';
import { createIpcServer, type IpcServerHandle } from '../ipc/server.js';
import { ensureBasePaths, type CamoucliPaths } from '../state/paths.js';
import type { Logger } from '../util/log.js';
import { DaemonRouter } from './router.js';

export class CamoucliDaemon {
  private readonly browserManager: BrowserManager;
  private readonly router: DaemonRouter;
  private serverHandle?: IpcServerHandle | undefined;

  constructor(
    private readonly paths: CamoucliPaths,
    private readonly logger: Logger,
  ) {
    this.browserManager = new BrowserManager({ paths, logger });
    this.router = new DaemonRouter(this.browserManager);
  }

  async start(): Promise<void> {
    await ensureBasePaths(this.paths);
    await writeFile(this.paths.daemonPidFile, `${process.pid}\n`, 'utf8');
    this.serverHandle = await createIpcServer(this.paths, (request) => this.router.handle(request), this.logger);
  }

  async stop(): Promise<void> {
    await this.browserManager.stopAllSessions();
    if (this.serverHandle) {
      await this.serverHandle.close();
      this.serverHandle = undefined;
    }
    this.logger.info('Daemon shutdown complete');
    await this.logger.close();
  }
}
