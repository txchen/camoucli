Status: ready-for-agent
Type: task

# Direct Playwright Automation Commands

## Parent

.scratch/agent-browser-command-parity/PRD.md

## What to build

Add the stateless Playwright-native automation parity commands that operate on the current resolved tab and fit the existing selector-or-snapshot-ref target model. A completed slice should be demoable with one session where a user can navigate, locate elements by selectors or `@eN` refs, perform richer input actions, wait for browser conditions, inspect element/page state, and capture screenshots with expanded options.

Keep the work vertical: every accepted command shape should have CLI parsing, defaults, typed IPC, daemon routing, browser behavior, output, docs/help, and tests in the same issue. Do not add active-tab lifecycle, downloads, frame context, dialogs, cookies, storage, network, or debug event buffers in this slice.

## Acceptance criteria

- [ ] Double-click and focus commands work for selectors and snapshot refs.
- [ ] Type supports clear-before-type and typing delay while preserving current default typing behavior.
- [ ] Select accepts one or more option values.
- [ ] Keydown, keyup, keyboard type, keyboard insert-text, mouse move/down/up/wheel, upload, and drag commands are available.
- [ ] Scroll supports an optional direction, parity default amount where applicable, and selector-scoped scrolling.
- [ ] Wait supports fixed time, URL patterns, function predicates, selectors, text, load states, and consistent timeout handling.
- [ ] Screenshot supports page or selector capture, optional paths, viewport/full-page mode, format, and JPEG quality with daemon-owned artifact paths when omitted.
- [ ] Rich getters are available for HTML, attributes, counts, bounding boxes, and computed styles.
- [ ] Element predicates are available for visible, enabled, and checked.
- [ ] Semantic find helpers are available for the accepted locator types and execute the accepted narrow subactions.
- [ ] Commands that take targets reuse the selector-or-ref model.
- [ ] The slice includes schema/parser/defaults/output/help/docs coverage and fake-browser tests for representative behavior.
- [ ] `npm run build` and `npm test` pass.

## Blocked by

- .scratch/agent-browser-command-parity/issues/11-core-aliases-and-eval-input-modes.md
