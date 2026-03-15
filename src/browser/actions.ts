import type { Locator, Page } from 'playwright-core';

import { RefNotFoundError } from '../util/errors.js';
import type { TabRuntime } from './tabs.js';

export function resolveSelectorOrRef(tab: TabRuntime, target: string): string {
  if (!target.startsWith('@')) {
    return target;
  }

  const selector = tab.refMap.get(target);
  if (!selector) {
    throw new RefNotFoundError(target);
  }

  return selector;
}

export function locatorForTarget(page: Page, tab: TabRuntime, target: string): Locator {
  return page.locator(resolveSelectorOrRef(tab, target));
}
