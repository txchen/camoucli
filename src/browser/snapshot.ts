import type { Page } from 'playwright-core';

const SNAPSHOT_ATTRIBUTE = 'data-camoucli-ref';

export interface SnapshotEntry {
  ref: string;
  selector: string;
  tag: string;
  role?: string | undefined;
  inputType?: string | undefined;
  text: string;
}

export interface SnapshotResult {
  interactive: boolean;
  text: string;
  entries: SnapshotEntry[];
  refs: Record<string, string>;
}

export async function clearSnapshotRefs(page: Page): Promise<void> {
  await page
    .evaluate((attributeName) => {
      document.querySelectorAll(`[${attributeName}]`).forEach((element) => {
        element.removeAttribute(attributeName);
      });
    }, SNAPSHOT_ATTRIBUTE)
    .catch(() => undefined);
}

export async function takeSnapshot(page: Page, interactiveOnly: boolean): Promise<SnapshotResult> {
  await clearSnapshotRefs(page);

  const entries = await page.evaluate(
    ({ interactiveOnly, attributeName }) => {
      const interactiveSelectors = [
        'a[href]',
        'button',
        'input',
        'textarea',
        'select',
        '[role="button"]',
        '[role="link"]',
        '[role="textbox"]',
        '[tabindex]:not([tabindex="-1"])',
      ];

      const broadSelectors = [
        ...interactiveSelectors,
        'h1',
        'h2',
        'h3',
        'p',
        'li',
        'label',
        'article',
        'section',
      ];

      const selectors = interactiveOnly ? interactiveSelectors : broadSelectors;

      function isVisible(element: Element): element is HTMLElement {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width > 0 &&
          rect.height > 0
        );
      }

      function summarizeText(element: HTMLElement): string {
        const directText =
          element.getAttribute('aria-label') ||
          element.getAttribute('alt') ||
          ('value' in element ? String((element as HTMLInputElement).value || '') : '') ||
          ('placeholder' in element ? String((element as HTMLInputElement).placeholder || '') : '') ||
          element.innerText ||
          element.textContent ||
          '';

        return directText.replace(/\s+/g, ' ').trim().slice(0, 140);
      }

      return Array.from(document.querySelectorAll(selectors.join(',')))
        .filter((element, index, list) => list.indexOf(element) === index)
        .filter(isVisible)
        .map((element, index) => {
          const refId = `e${index + 1}`;
          element.setAttribute(attributeName, refId);
          const tag = element.tagName.toLowerCase();
          const role = element.getAttribute('role') || undefined;
          const inputType = element instanceof HTMLInputElement ? element.type || 'text' : undefined;
          const text = summarizeText(element) || tag;
          return {
            ref: `@${refId}`,
            selector: `[${attributeName}="${refId}"]`,
            tag,
            role,
            inputType,
            text,
          };
        });
    },
    { interactiveOnly, attributeName: SNAPSHOT_ATTRIBUTE },
  );

  const refs = Object.fromEntries(entries.map((entry) => [entry.ref, entry.selector]));
  const text = entries
    .map((entry) => {
      const detail = entry.role ?? entry.inputType;
      return `${entry.ref} ${entry.tag}${detail ? `[${detail}]` : ''} ${JSON.stringify(entry.text)}`;
    })
    .join('\n');

  return {
    interactive: interactiveOnly,
    text,
    entries,
    refs,
  };
}
