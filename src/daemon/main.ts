#!/usr/bin/env node
import process from 'node:process';

import packageJson from '../../package.json' with { type: 'json' };

import { CamoucliDaemon } from './daemon.js';
import { getCamoucliPaths } from '../state/paths.js';
import { Logger } from '../util/log.js';

async function main(): Promise<void> {
  const paths = getCamoucliPaths();
  const logger = new Logger({
    name: 'daemon',
    filePath: paths.daemonLogFile,
    verbose: process.env.CAMOUCLI_VERBOSE === '1',
  });
  const daemon = new CamoucliDaemon(paths, logger);

  const shutdown = async () => {
    await daemon.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  logger.info('Starting camou daemon', { version: packageJson.version, pid: process.pid });
  await daemon.start();
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
