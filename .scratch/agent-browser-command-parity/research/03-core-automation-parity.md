# Core Automation Parity Decision

Baseline:

- `agent-browser`: `/Users/txchen/code/github/agent-browser` at `ed2e105`.
- Camoucli: this workspace after `Decide Parity Scope Boundaries`.

Primary sources:

- Camoucli core CLI commands: `src/cli/program.ts:287`
- Camoucli IPC schemas for current browser actions: `src/ipc/protocol.ts:20`
- Camoucli daemon/browser action implementations: `src/browser/manager.ts:126`
- `agent-browser` navigation, action, keyboard, wait, screenshot, pdf, snapshot, and eval parsing: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:350`
- `agent-browser` `read` parsing: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1956`
- `agent-browser` tabs/window/frame/dialog parsing: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1479`
- `agent-browser` `get`, `is`, `find`, `mouse`, and `set` parsing: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:2424`
- Playwright feasibility references: `node_modules/playwright-core/types/types.d.ts:613`, `node_modules/playwright-core/types/types.d.ts:2536`, `node_modules/playwright-core/types/types.d.ts:3617`, `node_modules/playwright-core/types/types.d.ts:4310`, `node_modules/playwright-core/types/types.d.ts:4319`, `node_modules/playwright-core/types/types.d.ts:4392`, `node_modules/playwright-core/types/types.d.ts:5103`, `node_modules/playwright-core/types/types.d.ts:9226`, `node_modules/playwright-core/types/types.d.ts:11509`, `node_modules/playwright-core/types/types.d.ts:11914`, `node_modules/playwright-core/types/types.d.ts:12962`, `node_modules/playwright-core/types/types.d.ts:18936`, `node_modules/playwright-core/types/types.d.ts:19007`

## Decision

Camoucli should implement core automation parity in two implementation slices.

The first slice should be the low-risk, Playwright-native command set that fits the current "thin CLI, daemon-owned browser state" architecture without introducing new long-lived state models. This slice should include command aliases, direct locator actions, richer keyboard/mouse input, richer waits excluding downloads, richer getters, element predicates, semantic locator helpers, upload/drag, and basic screenshot expansion.

The second slice should include accepted core commands that need durable per-session/per-tab state or cross-command behavior: launch-only `open`, downloads, runtime `set`, frame context, and dialogs. These are in scope, but they should not be mixed into the first low-risk slice because their correctness depends on state lifetime rules.

`pdf`, `window`, and `click --new-tab` should not be decided as first core automation work. `pdf` belongs with debug/artifact portability because Firefox/Camoufox support must be smoke-tested despite the Playwright type surface. `window` and new-tab behavior belong with the session/tab/launch parity ticket because Camoucli's named-tab model is different from Agent Browser's active-tab model.

## First Implementation Slice

Implement these first:

- Navigation aliases: add `goto <url>` and `navigate <url>` as aliases for `open <url>` after URL normalization.
- URL normalization: for `open`, `goto`, `navigate`, preserve `http:`, `https:`, `about:`, `data:`, `file:`, `chrome:`, and `chrome-extension:` URLs; prepend `https://` to bare domains/hosts. This mirrors `agent-browser` parsing and improves Camoucli's current required raw URL behavior.
- `key <key>`: alias to the existing `press <key>` IPC action.
- `scrollinto <target>`: alias to existing `scrollintoview <target>`.
- `eval -b|--base64 <script>` and `eval --stdin`: CLI-only transformations into the existing `eval` IPC action. Decode base64 as UTF-8 and reject invalid input before contacting the daemon.
- `dblclick <target>`: use `locator.dblclick()` against selectors or `@eN` refs.
- `focus <target>`: use `locator.focus()` against selectors or `@eN` refs.
- `type <target> <text> --clear --delay <ms>`: preserve existing default type-without-clearing behavior; when `--clear` is present, clear/fill empty first, then type; pass delay to Playwright typing.
- `select <target> <value...>`: accept one or many values and pass a scalar or array to `locator.selectOption`.
- `keydown <key>` and `keyup <key>`: use `page.keyboard.down/up`.
- `keyboard type <text>` and `keyboard inserttext <text>`: use `page.keyboard.type` and `page.keyboard.insertText`.
- `mouse move <x> <y>`, `mouse down [button]`, `mouse up [button]`, `mouse wheel [dy] [dx]`: use `page.mouse`. Match Agent Browser's argument order for wheel: first `deltaY`, second `deltaX`.
- `scroll [direction] [amount] --selector <target>`: make direction optional with default `down`; use amount default `300` for Agent Browser parity on this syntax. For selector-scoped scrolling, resolve the locator and run wheel/evaluate at that element. Keep current direction names.
- `upload <target> <files...>`: use `locator.setInputFiles`; reject empty file list.
- `drag <source> <target>`: use `sourceLocator.dragTo(targetLocator)`.
- `wait <ms>`: sleep for the requested milliseconds.
- `wait --url <pattern> [--timeout <ms>]`: use `page.waitForURL`; string glob patterns are acceptable.
- `wait --fn <expression> [--timeout <ms>]`: use `page.waitForFunction` and evaluate the supplied expression as the predicate body/expression.
- Existing `wait <selector>`, `wait --text`, and `wait --load` should keep working, with `--timeout` applying consistently to every variant.
- `screenshot [selector] [path] --full --format <png|jpeg> --quality <n>`: add selector screenshots, path/selector disambiguation, format, and JPEG quality. Use session artifacts when no path is supplied.
- `get html <target>`: return `locator.innerHTML()`.
- `get attr <target> <attribute>`: return `locator.getAttribute(attribute)`.
- `get count <target>`: return `locator.count()`.
- `get box <target>`: return `locator.boundingBox()`.
- `get styles <target>`: return computed styles as a plain object from page evaluation.
- `is visible|enabled|checked <target>`: return booleans from locator predicates.
- `find role|text|label|placeholder|alt|title|testid|first|last|nth ...`: add semantic locator helpers using Playwright's built-in locator APIs, then execute a narrow compatible subaction set: `click`, `fill`, `check`, `hover`, and `text`. Default subaction is `click`. Support `--name` for role and `--exact` where Playwright exposes an exact option.

Implementation shape for the first slice:

- Add Commander commands and aliases in `src/cli/program.ts`.
- Add IPC schemas in `src/ipc/protocol.ts`; do not overload loosely typed payloads.
- Implement daemon methods in `src/browser/manager.ts` and route them through the existing router.
- Reuse the existing selector-or-ref resolver so `@eN` snapshot refs work wherever the command takes a target.
- Add focused unit tests for CLI parsing/IPC payloads and manager tests where a Playwright mock already exists. Browser-heavy end-to-end coverage can be limited to one or two representative locator/input flows.

## Accepted But Later Core Slices

`open` without URL is in scope, but it needs launch-only semantics. Change `open <url>` to `open [url]`; when URL is omitted, ensure the session and named tab exist, leave it at `about:blank`, and return `{ sessionName, tabName, url, title }`. `goto` and `navigate` must still require a URL because those verbs imply navigation. This can be implemented either by making the IPC `open.url` optional or by adding an explicit daemon action such as `launch`; prefer an explicit daemon method if that keeps validation clearer.

`download <target> <path>` and `wait --download [path] [--timeout <ms>]` are in scope. Implement with Playwright `page.waitForEvent('download')`, not CDP. `download` should start waiting, click the target, save the download to the requested path, and return the saved path plus suggested filename. `wait --download` should wait for the next download in the current tab and optionally save it. Paths must be resolved and parent directories created by the daemon, not by the CLI.

Runtime `set` is in scope with explicit lifetime rules:

- `set viewport <width> <height> [scale]`: current tab page only. Playwright can set viewport size; device scale factor is not generally mutable at page runtime, so accept `scale` only if Camoufox/Playwright can actually apply it in a smoke test, otherwise reject with a clear unsupported error.
- `set geo|geolocation <lat> <lon>`: current browser context/session.
- `set offline [on|off|true|false]`: current browser context/session.
- `set headers <json>`: current browser context/session for future requests.
- `set credentials|auth <username> <password>`: current browser context/session HTTP credentials.
- `set media [dark|light] [reduced-motion]`: current tab page.
- `set device <name>`: defer. Camoucli already has launch-time Camoufox fingerprint/window/screen controls, and runtime device switching would blur launch configuration with active context mutation.

`frame <selector|main>` is in scope, but needs a per-tab frame context. `frame <selector>` should set the active frame context for later selector-based actions in that tab; `frame main` should clear it. This state must clear on navigation, tab close, and session stop. Snapshot refs should remain per tab; if later work wants refs from inside frames, snapshot needs a separate design update.

`dialog accept|dismiss|status [text]` is in scope, but needs per-tab dialog tracking. The daemon should attach dialog listeners before commands can trigger dialogs, store the latest pending dialog metadata, return it from `status`, and let `accept`/`dismiss` resolve it. If there is no pending dialog, return a structured validation error. Prompt text applies only to prompt dialogs.

`read [url]` is in scope, but should be implemented as local DOM reading, not as Agent Browser's broader product reader. If a URL is supplied, navigate the current tab first using Camoucli's normalized navigation semantics; otherwise read the current page. Support `--raw`, `--outline`, `--filter`, `--timeout`, and `--json` first. Treat `--llms` and `--require-md` as later enhancements unless the implementation includes a real markdown/LLMs discovery pipeline. Output should be deterministic and suitable for agents, but it should not depend on an external fetch service or provider.

## Defer Or Exclude From Core Automation

- `get cdp-url`: exclude from this local Camoufox parity scope because CDP/provider flows were ruled out by `Decide Parity Scope Boundaries`.
- `click --new-tab`: defer to `Decide Session Tab Launch Parity`; it requires popup/new-page tracking and a rule for naming the new tab.
- `window new`: defer to `Decide Session Tab Launch Parity`; Playwright Firefox persistent contexts expose pages, but Camoucli has no current user-facing distinction between "new tab" and "new window".
- `pdf <path>`: defer to `Decide Debug Artifact Parity`. The Playwright type surface exposes `page.pdf`, but this must be verified against Camoufox/Firefox before accepting it as portable. If unsupported, the command should not be added as a fake parity command.
- Screenshot annotation and screenshot directory globals: defer to `Decide Debug Artifact Parity`; selector/full/format/quality are enough for core automation.
- Snapshot shaping flags (`--compact`, `--cursor`, `--urls`, `--depth`, `--selector`) are adjacent to core but were not selected for the first core slice. Revisit them with `read` and documentation because they change the snapshot text contract.

## Rationale

Camoucli's existing command surface already sends browser actions through typed IPC and keeps browser lifecycle/session/tab state in the daemon. The current CLI and IPC cover only required-URL `open`, basic actions, simple `wait`, simple `get`, and full-page screenshots. Adding direct Playwright commands through the same path is a good first step because it expands parity without changing ownership boundaries.

The stateful commands are still local-browser automation and should remain in scope, but they need deeper state contracts. Downloads coordinate a browser event with a user action and filesystem writes. Runtime `set` commands have page-vs-context lifetime differences. Frames and dialogs require per-tab state that affects future commands. Those should be accepted deliberately, not smuggled into a parser-only compatibility pass.
