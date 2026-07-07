import type { BrowserContext, Page } from 'playwright-core';

import type { SessionPaths } from '../state/paths.js';
import type { LaunchInput, ResolvedLaunchConfig } from '../camoufox/config.js';
import type { SnapshotResult } from './snapshot.js';

export type SessionStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface TabRuntime {
  name: string;
  tabId: string;
  page: Page;
  refMap: Map<string, string>;
  lastSnapshot?: SnapshotResult | undefined;
}

export interface SessionRuntime {
  name: string;
  status: SessionStatus;
  context: BrowserContext;
  tabs: Map<string, TabRuntime>;
  activeTabName?: string | undefined;
  nextTabSequence: number;
  browserVersion: string;
  installPath: string;
  paths: SessionPaths;
  resolvedConfig: ResolvedLaunchConfig;
  launchInput: LaunchInput;
  startedAt: string;
}

export function createTabRuntime(name: string, tabId: string, page: Page): TabRuntime {
  return {
    name,
    tabId,
    page,
    refMap: new Map<string, string>(),
  };
}
