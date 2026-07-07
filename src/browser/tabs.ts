import type { BrowserContext, Dialog, Frame, Page } from 'playwright-core';

import type { SessionPaths } from '../state/paths.js';
import type { LaunchInput, ResolvedLaunchConfig } from '../camoufox/config.js';
import type { SnapshotResult } from './snapshot.js';
import type { NetworkRuntime } from './network.js';

export type SessionStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface TabRuntime {
  name: string;
  tabId: string;
  page: Page;
  refMap: Map<string, string>;
  lastSnapshot?: SnapshotResult | undefined;
  activeFrame?: Frame | undefined;
  activeFrameTarget?: string | undefined;
  pendingDialog?: {
    id: string;
    dialog: Dialog;
    type: string;
    message: string;
    defaultValue?: string | undefined;
    openedAt: string;
  } | undefined;
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
  network: NetworkRuntime;
}

export function createTabRuntime(name: string, tabId: string, page: Page): TabRuntime {
  return {
    name,
    tabId,
    page,
    refMap: new Map<string, string>(),
  };
}
