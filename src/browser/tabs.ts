import type { BrowserContext, Page } from 'playwright-core';

import type { SessionPaths } from '../state/paths.js';
import type { ResolvedLaunchConfig } from '../camoufox/config.js';
import type { SnapshotResult } from './snapshot.js';

export type SessionStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface TabRuntime {
  name: string;
  page: Page;
  refMap: Map<string, string>;
  lastSnapshot?: SnapshotResult | undefined;
}

export interface SessionRuntime {
  name: string;
  status: SessionStatus;
  context: BrowserContext;
  tabs: Map<string, TabRuntime>;
  browserVersion: string;
  installPath: string;
  paths: SessionPaths;
  resolvedConfig: ResolvedLaunchConfig;
  startedAt: string;
}

export function createTabRuntime(name: string, page: Page): TabRuntime {
  return {
    name,
    page,
    refMap: new Map<string, string>(),
  };
}
