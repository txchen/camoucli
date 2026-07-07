# Command Parity Implementation Slices

Baseline:

- `agent-browser`: `/Users/txchen/code/github/agent-browser` at `ed2e105`.
- Camoucli: this workspace after `Decide Session Tab Launch Parity`.

Primary sources:

- Accepted scope: `.scratch/agent-browser-command-parity/issues/02-decide-parity-scope-boundaries.md:13`
- Core automation decision: `.scratch/agent-browser-command-parity/research/03-core-automation-parity.md:1`
- State/storage/network decision: `.scratch/agent-browser-command-parity/research/04-state-storage-network-parity.md:1`
- Debug/artifact decision: `.scratch/agent-browser-command-parity/research/05-debug-artifact-parity.md:1`
- Session/tab/launch decision: `.scratch/agent-browser-command-parity/research/06-session-tab-launch-parity.md:1`
- Current CLI command surface: `src/cli/program.ts:61`, `src/cli/program.ts:287`, `src/cli/program.ts:603`
- Current defaults layer: `src/cli/defaults.ts:1`
- Current IPC/router/manager boundaries: `src/ipc/protocol.ts:8`, `src/daemon/router.ts:9`, `src/browser/manager.ts:21`
- Current session/tab runtime: `src/browser/tabs.ts:1`
- Current launch config and persistent launch: `src/camoufox/config.ts:20`, `src/camoufox/launcher.ts:71`
- Current path layout: `src/state/paths.ts:13`
- Current tests and fake browser harness: `tests/cli-program.test.ts:1`, `tests/cli-defaults.test.ts:1`, `tests/daemon.integration.test.ts:1`, `tests/helpers/fake-browser.ts:1`, `tests/output.test.ts:1`

## Decision

Implement Agent Browser CLI parity as vertical slices, not command-family rewrites. Each slice should include:

- Commander parsing in `src/cli/program.ts`.
- Default application in `src/cli/defaults.ts` when the command uses session, tab, or launch options.
- Typed IPC schemas in `src/ipc/protocol.ts`.
- Routing in `src/daemon/router.ts`.
- Daemon-owned behavior in `src/browser/manager.ts` or a narrow helper module under `src/browser/`, `src/state/`, or `src/cli/`.
- Human and JSON output changes in `src/cli/output.ts`.
- Focused tests in the existing Vitest style, using the fake Playwright harness where practical.

Do not start with large cross-cutting systems like active tabs, network logs, or artifact registries. Begin with parser-only aliases and direct Playwright methods, then add stateful runtime foundations, then layer the heavier command families on top of those foundations.

The recommended sequence is:

1. Core command aliases and URL/eval parsing.
2. Direct Playwright locator/input/get/wait commands.
3. Session and tab lifecycle foundation.
4. Launch option foundation.
5. Downloads, frames, dialogs, read, and runtime `set`.
6. Cookies/storage/state snapshots.
7. Network route/request/HAR.
8. Debug event/artifact foundation.
9. Diff, vitals, pushstate, init scripts, and conditional unsupported commands.
10. Polish, compatibility errors, and real Camoufox smoke coverage.

## Slice 1: Core Aliases And CLI-Only Parsing

Goal:

Add the smallest low-risk parity commands that do not require new daemon state.

Commands:

- `goto <url>`
- `navigate <url>`
- URL normalization for `open|goto|navigate`
- `key <key>`
- `scrollinto <target>`
- `eval -b|--base64 <script>`
- `eval --stdin`

Implementation:

- Add URL normalization helper in the CLI layer or a shared `src/cli/url.ts` helper.
- Keep `open <url>` as the existing IPC action for this slice; URL-less `open` waits for Slice 3.
- Decode base64/read stdin before sending the existing `eval` IPC action.
- Add aliases in Commander rather than daemon-specific alias handling when possible.

Tests:

- `tests/cli-program.test.ts`: parsing for aliases, URL normalization, invalid base64, stdin eval.
- `tests/cli-defaults.test.ts`: aliases still get session/tab/launch defaults.
- Minimal daemon coverage only for normalized navigation if the existing open path is touched.

Exit criteria:

- Existing behavior remains stable.
- No new runtime state or schema ambiguity is introduced.

## Slice 2: Direct Playwright Automation Commands

Goal:

Fill the direct Playwright-native command gaps that operate on the current tab and fit the existing selector/ref model.

Commands:

- `dblclick <target>`
- `focus <target>`
- `type <target> <text> --clear --delay <ms>`
- `select <target> <value...>`
- `keydown <key>`
- `keyup <key>`
- `keyboard type <text>`
- `keyboard inserttext <text>`
- `mouse move|down|up|wheel`
- `scroll [direction] [amount] --selector <target>`
- `upload <target> <files...>`
- `drag <source> <target>`
- `wait <ms>`
- `wait --url <pattern>`
- `wait --fn <expression>`
- `get html|attr|count|box|styles`
- `is visible|enabled|checked`
- `find role|text|label|placeholder|alt|title|testid|first|last|nth ...`
- `screenshot [selector] [path] --full --format --quality`

Implementation:

- Add typed IPC actions for each semantic operation; avoid one generic "action" payload.
- Reuse `locatorForTarget` for selectors and `@eN` refs.
- Add helper modules if `BrowserManager` becomes too large:
  - `src/browser/input.ts`
  - `src/browser/locators.ts`
  - `src/browser/screenshots.ts`
- Extend `tests/helpers/fake-browser.ts` with only the Playwright methods needed by these tests.
- Keep screenshot annotation deferred.

Tests:

- CLI parsing for every command shape.
- IPC schema tests through parse/validation or daemon integration.
- Fake-browser integration for representative commands: double click/focus/type delay shape, multi-select, mouse/keyboard, upload/drag if fakeable, wait ms/url/fn, get/is/find, selector screenshot.
- Output tests for new human-readable result shapes.

Exit criteria:

- Most accepted stateless core parity is complete.
- No session lifecycle or tab active-state changes are required.

## Slice 3: Session And Tab Lifecycle Foundation

Goal:

Introduce the daemon-owned session/tab semantics needed by later stateful commands.

Commands:

- `open` with no URL
- `close`
- `close --all`
- `quit`
- `exit`
- `session`
- `session id`
- `session info`
- `tab` alias for list
- `tab <target>`
- `tab new --label <name> [url]`
- `tab close [target]`
- `click <target> --new-tab [--label <name>]`
- `window new [url] [--label <name>]`

Implementation:

- Add `activeTabName`, optional `tabId`, and `nextTabId` to `SessionRuntime`.
- Centralize tab resolution in `src/browser/tabs.ts`: by name, optional `tN` id, and legacy numeric index.
- Make browser-action tab selection support omitted `tabName` only after the defaults layer can distinguish explicit/default tab from active-tab fallback.
- Add `launch` or `tab.ensure` IPC action for URL-less `open`.
- Change `close` to current-session stop while preserving `close --all`.
- Implement `session id` as a CLI-local helper; it should not start the daemon.
- Add `session.info` runtime and local fallback behavior.
- Implement popup tracking for `click --new-tab` with Playwright `waitForEvent('page')` or `page.waitForEvent('popup')` as appropriate.
- Implement `window new` as a tracked new page and make the output clear that it is not a guaranteed OS window.

Tests:

- CLI parsing for `session`, `session id`, `close`, aliases, tab switches, labels, URL-less `open`, `window new`, and `click --new-tab`.
- Defaults tests for explicit `--tabname` vs env/project default vs active-tab fallback.
- Fake-browser integration for active tab switching, close fallback, generated tab ids/names, popup tracking, and current-session close.
- Output tests for `session.info`, `tab.list`, `tab.switch`, `close`, and `window.new`.

Exit criteria:

- Later commands can rely on a stable active-tab/session runtime model.
- Existing `--session` and `--tabname` workflows remain deterministic.

## Slice 4: Launch Options And Compatibility Foundation

Goal:

Add Camoufox-safe launch globals and immutable launch compatibility checks before state, network, and debug artifacts depend on them.

Options:

- `--headed` as alias for `--headless false`
- `--proxy-bypass <hosts>`
- `--headers <json>`
- `--user-agent <ua>`
- `--ignore-https-errors`
- `--color-scheme <value>`
- `--reduced-motion <value>` if included
- `--init-script <path>`
- `--state <path-or-name>`
- later-compatible fields for `--record-video [dir]` and `--record-har <path>` if included now as schema-only or deferred placeholders

Implementation:

- Extend `SharedOptions`, `toLaunchInput`, `launchInputSchema`, and `ResolvedLaunchConfig`.
- Map accepted options into Playwright `launchPersistentContext` options in `preparePersistentCamoufoxLaunch`.
- Add storage-state path/name resolution only after the state snapshot directory exists, or leave `--state` pending until Slice 6.
- Add init-script loading/registration before first navigation.
- Extend `BrowserManager.assertSessionCompatible` for every new launch-only option.
- Do not add `--executable-path`, `--extension`, `--engine`, `--cdp`, `--provider`, or Agent Browser restore flags.

Tests:

- CLI parsing/defaults for each option.
- Config validation tests for headers JSON, color scheme, reduced motion, proxy bypass, and invalid combinations.
- Launcher unit tests for Playwright option mapping.
- Daemon integration for compatibility errors when changing launch-only options on a running session.

Exit criteria:

- Launch-time behavior is explicit, typed, and immutable for running sessions.
- Later state/debug slices can use the launch options without revisiting the launch model.

## Slice 5: Stateful Core Runtime Commands

Goal:

Implement accepted core commands that need per-tab/per-session state or filesystem coordination but do not require the full state/network/debug systems.

Commands:

- `download <target> <path>`
- `wait --download [path]`
- `set viewport|geo|offline|headers|credentials|media`
- `frame <selector|ref|main>`
- `dialog accept|dismiss|status [text]`
- `read [url] --raw --outline --filter --timeout`

Implementation:

- Add per-tab active frame state to `TabRuntime`; clear it on navigation, tab close, and session stop.
- Update selector/ref resolution to honor active frame where accepted.
- Add dialog listener setup during page tracking; store pending dialog metadata per tab.
- Implement download event coordination with daemon-owned path resolution and parent directory creation.
- Implement runtime `set` with explicit page-vs-context lifetimes:
  - viewport/media current tab
  - geolocation/offline/headers/credentials current session context
- Implement local DOM `read` as a deterministic page evaluation/navigation helper, not external markdown fetching.

Tests:

- Fake-browser tests for download event flow if the fake harness can support it; otherwise manager-level unit tests with small mocks.
- Frame state set/clear tests.
- Dialog status/accept/dismiss tests.
- Runtime `set` tests for lifetime and result shape.
- `read` output tests with data URLs and filtering.

Exit criteria:

- Core "later slice" commands are complete without requiring cookies/state/network/debug internals.

## Slice 6: Cookies, Storage, And Portable State Snapshots

Goal:

Implement browser data commands with clear separation between persistent profiles and portable storage-state files.

Commands:

- `cookies` / `cookies get [url...]`
- `cookies set <name> <value> ...`
- `cookies set --curl <file> ...`
- `cookies clear`
- keep `cookies export/import`
- `storage local/session [get] [key]`
- `storage local/session set <key> <value>`
- `storage local/session clear`
- `state save/load/list/show/clear/clean/rename`
- launch-time `--state <path-or-name>` if not completed in Slice 4

Implementation:

- Add `statesDir` to `CamoucliPaths` and base path creation.
- Add `src/state/storage-state.ts` for path/name resolution, storage-state read/write, redaction, and summary helpers.
- Add cURL cookie parser in state/browser support code, not only CLI.
- Implement storage commands as current-tab origin operations.
- Implement running-session `state load` as merge/import, not pristine reset.
- Wire launch-time `--state` as first-navigation initialization only for new sessions.

Tests:

- Unit tests for cURL cookie parsing, no secret echoing, state name/path resolution, redaction, clean/rename.
- Fake-browser integration for cookies get/set/clear, storage local/session, state save/load.
- Output tests for cookies/state/storage.

Exit criteria:

- Browser profiles and portable state snapshots have distinct commands, paths, and documentation-ready semantics.

## Slice 7: Network Route, Request Log, And HAR

Goal:

Add portable Playwright-backed network interception and inspection.

Commands:

- `network route <url> [--abort|--body <body>] [--resource-type <csv>]`
- `network unroute [url]`
- `network requests [--clear] [--filter ...] [--type ...] [--method ...] [--status ...]`
- `network request <requestId>`
- `network har start`
- `network har stop [path]`

Implementation:

- Add a session-level network runtime module, for example `src/browser/network.ts`.
- Extend `SessionRuntime` with route registry, request ring buffer, HAR active flag/buffer, and request id counter.
- Attach Playwright request/response/requestfailed listeners when a session starts.
- Keep routes/logs/HAR memory-only and clear on session stop.
- Write HAR files under session artifacts when no path is supplied.
- Do not implement CDP Fetch/Network or provider request inspection.

Tests:

- Unit tests for request filtering/status matching and HAR JSON shape.
- Fake-browser tests for route registration/unroute and request buffer behavior.
- Output tests for request list/detail and HAR stop.

Exit criteria:

- Network commands are useful locally and do not leak into profile/state persistence.

## Slice 8: Debug Events And Artifact Foundation

Goal:

Add portable debug event tracking and artifact path management shared by later artifact commands.

Commands:

- `console [--clear]`
- `errors [--clear]`
- `highlight <target>`
- `clipboard read|write|copy|paste`
- `trace start|stop [path]`

Implementation:

- Add artifact path helper for `profiles/<session>/artifacts/{screenshots,traces,diffs,pdfs,videos,har}`.
- Extend `SessionRuntime` with console and page-error ring buffers plus trace active state.
- Attach console/pageerror listeners in page tracking.
- Implement highlight as temporary locator overlay/injected outline.
- Implement clipboard through page Clipboard API plus keyboard shortcuts; return clear permission/secure-context errors.
- Implement Playwright `browserContext.tracing.start/stop`, writing trace zip files.

Tests:

- Fake-browser or focused mocks for console/error capture and clear.
- Highlight injection test.
- Clipboard command dispatch and failure-shape tests.
- Trace start/stop calls and generated path tests.
- Output tests for console/errors/trace.

Exit criteria:

- Common debug runtime state and artifact paths exist before diff/vitals/init/PDF/video work.

## Slice 9: Diff, Vitals, Pushstate, Init Scripts, And Unsupported Commands

Goal:

Complete the remaining portable debug/artifact commands and provide clear unsupported behavior for excluded Agent Browser commands.

Commands:

- `diff snapshot`
- `diff screenshot`
- `diff url`
- `vitals` / `web-vitals`
- `pushstate <url>`
- `addinitscript <js>`
- `removeinitscript <id>` with limited semantics
- explicit unsupported errors for `connect`, `inspect`, `profiler`, and CDP/provider flags if syntax is accepted
- conditional `pdf <path>` only if smoke-tested

Implementation:

- Add text diff helper for snapshots.
- Decide and add an image diff dependency before implementing `diff screenshot`; keep dependency small and Node-compatible.
- Implement `diff url` by serial navigation/capture and report final active URL mutation.
- Implement vitals via injected PerformanceObserver script.
- Implement pushstate via History API.
- Add daemon-owned init-script registry; document `removeinitscript` cannot remove already registered Playwright context scripts.
- Add unsupported command errors with structured error codes.
- Run real Camoufox smoke for PDF before adding `pdf`; otherwise keep unsupported.

Tests:

- Snapshot diff unit tests.
- Image diff tests if dependency is added.
- Fake-browser pushstate/vitals/init-script tests where practical.
- CLI/IPC tests for unsupported commands and error codes.
- Smoke-test notes for PDF.

Exit criteria:

- Remaining accepted local debug commands are implemented or explicitly unsupported with accurate messages.

## Slice 10: Polish And Compatibility Hardening

Goal:

Stabilize the parity surface before documenting it as Agent Browser-compatible within Camoucli's local scope.

Work:

- Audit help text for every accepted/deferred/excluded command.
- Add compatibility matrix entries for supported, adapted, deferred, and unsupported Agent Browser commands.
- Ensure JSON output shapes are stable and human output is concise.
- Ensure every unsupported command has a structured error code and names the Camoufox/local-scope reason.
- Add real Camoufox smoke scripts for:
  - URL-less open before route/cookie/init setup
  - launch-time init script
  - launch-time storage state
  - route/unroute
  - trace
  - clipboard
  - PDF if attempted
  - video/HAR if implemented
- Run `npm run build` and `npm test`.

Exit criteria:

- The accepted command surface is ready for README/API docs and external use.

## Recommended First Three Implementation Tickets

Start with these because they build confidence without large runtime changes:

1. **Implement core aliases and eval input modes**
   - Slice 1.
   - Mostly `src/cli/program.ts`, `src/cli/defaults.ts`, tests.

2. **Implement direct Playwright locator/input/get/wait commands**
   - First half of Slice 2.
   - Adds typed schemas and manager methods for locator and input operations.

3. **Implement screenshot selector/format/quality and richer waits**
   - Second half of Slice 2.
   - Reuses the same schema/manager pattern and creates the artifact path conventions used later.

Then move to the session/tab foundation before implementing network, state, or debug features that depend on active tabs and launch-only setup.

## Dependencies Between Slices

- Slice 2 depends on Slice 1 only for command alias consistency, not runtime state.
- Slice 3 should happen before `click --new-tab`, `window new`, active-tab defaults, or any command that relies on omitted `tabName`.
- Slice 4 should happen before launch-time `--state`, `--init-script`, video, HAR, user agent, headers, or ignore HTTPS behavior is documented.
- Slice 6 depends on `statesDir`; launch-time `--state` depends on Slice 4 plus Slice 6 path/state helpers.
- Slice 7 depends on session runtime extension patterns from Slice 3 and ideally artifact helpers from Slice 8 for HAR path defaults.
- Slice 8 depends on stable page tracking from Slice 3.
- Slice 9 depends on Slice 8 for artifact paths and event/script runtime support.
- Slice 10 depends on every implemented slice plus the Node API decision and docs/test strategy tickets.

## Explicit Non-Goals For Implementation Tickets

- Do not implement MCP, dashboard, chat, plugin/skills management, provider browser launch, CDP attach, or auth vault behavior.
- Do not switch Camoucli away from local Camoufox Firefox or Playwright Core.
- Do not add Python SDK or Bun-specific runtime dependencies.
- Do not replace Camoucli profiles with Agent Browser restore policies.
- Do not add broad untyped IPC payloads for convenience; parity should improve coverage without weakening validation.
