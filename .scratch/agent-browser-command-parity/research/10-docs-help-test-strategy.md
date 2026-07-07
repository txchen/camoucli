# Docs, Help, And Test Strategy

Baseline:

- `agent-browser`: `/Users/txchen/code/github/agent-browser` at `ed2e105`.
- Camoucli: this workspace after `Decide Node API Exposure`.

Primary sources:

- Current README command reference and Node API docs: `README.md:163`, `README.md:383`, `README.md:408`, `README.md:431`, `README.md:592`
- Existing browser compatibility matrix docs/tooling: `docs/compatibility-matrix.md:1`, `scripts/run-compatibility-report.mjs:1`, `scripts/generate-compatibility-matrix.mjs:1`
- Current CLI parser/help surface: `src/cli/program.ts:132`
- Current output formatter: `src/cli/output.ts:1`
- Current JSON error path: `src/cli/main.ts:33`
- Current typed IPC schemas: `src/ipc/protocol.ts:8`
- Current daemon router: `src/daemon/router.ts:9`
- Current fake browser harness: `tests/helpers/fake-browser.ts:1`
- Current parser/output/defaults/API/integration tests: `tests/cli-program.test.ts:1`, `tests/output.test.ts:1`, `tests/cli-defaults.test.ts:1`, `tests/api.test.ts:17`, `tests/daemon.integration.test.ts:1`, `tests/cli-json.integration.test.ts:1`, `tests/cli-bin.integration.test.ts:1`
- Accepted implementation slices: `.scratch/agent-browser-command-parity/research/08-command-parity-implementation-slices.md:1`
- Node API decision: `.scratch/agent-browser-command-parity/research/09-node-api-exposure.md:1`

## Decision

Each command-parity implementation ticket should ship documentation, help text, compatibility-matrix updates, and tests in the same vertical slice as the code. Do not defer all docs and tests to the final polish slice; the final slice should audit and harden, not discover missing semantics.

Add a separate Agent Browser command-parity matrix. Do not overload the existing `docs/compatibility-matrix.md`, because that document is about Camoufox build compatibility with the bundled `playwright-core` version. Command parity needs a user-facing matrix that tracks command semantics.

Recommended new docs:

- `docs/agent-browser-command-parity.md`: command-by-command compatibility matrix.
- `docs/agent-browser-migration.md`: migration notes from Agent Browser terminology to Camoucli's local Camoufox model.
- `docs/node-api.md` or an expanded README Node section: `Camoufox` versus `CamouClient` once the daemon client lands.

Recommended README shape:

- Keep README concise and task-oriented.
- Keep the current command reference, but split it into families that match the accepted parity plan.
- Link to the command-parity matrix for full supported/adapted/deferred/unsupported status.
- Link to migration notes wherever Camoucli intentionally differs from Agent Browser.

## Help Text Strategy

Every added command should have Commander help that says what it does in Camoucli terms, not only that it is compatible with Agent Browser.

Rules:

- Prefer canonical command descriptions over alias descriptions.
- Mark aliases as aliases in help or keep them visually near the canonical command.
- For commands with adapted semantics, include the adaptation in the description or option help when short enough.
- For unsupported compatibility commands, accept syntax only if that materially helps migration, and return a structured unsupported error rather than hiding the command behind parser failure.

Important help wording:

- `open [url]`: "Ensure the current session/tab exists, optionally navigating to URL."
- `goto <url>` / `navigate <url>`: "Navigate the current tab to URL." They require a URL.
- `session`: "Print the resolved current session name."
- `session id`: "Print a stable session name for this project/worktree."
- `close`: "Stop the current session."
- `close --all`: "Stop all running sessions."
- `tab new --label <name>`: describe label as Camoucli tab name.
- `window new`: say "create a new tracked page"; do not promise an OS window.
- `state`: "Manage portable storage-state snapshots"; explicitly separate from `profile`.
- `profile`: "Manage full persistent Firefox profile directories."
- `trace`: "Playwright trace zip"; do not imply CDP trace.
- `network`: "Playwright-backed local session routes/request log/HAR"; do not imply CDP/provider request inspection.
- `clipboard`: mention browser-page clipboard permissions.
- `removeinitscript`: mention current Playwright contexts cannot remove an already registered init script, if the command is exposed.

Add help tests as commands are implemented:

- Existing `tests/cli-bin.integration.test.ts` only checks top-level help behavior. Add targeted help assertions for command families whose semantics are easy to regress: `open`, `close`, `session`, `tab`, `state`, `network`, `trace`, and unsupported commands.
- Keep these tests string-light: assert the command and the critical semantic phrase, not the whole help snapshot.

## Command-Parity Matrix

Create `docs/agent-browser-command-parity.md` with one row per Agent Browser command or command family.

Columns:

- Agent Browser command.
- Camoucli command.
- Status: `supported`, `adapted`, `deferred`, `unsupported`, or `out of scope`.
- Slice: implementation slice number/name.
- Node API: `Camoufox`, `CamouClient`, `CLI only`, or `none`.
- Notes.
- Test coverage: parser, schema, fake browser, output, API, integration, smoke.

Example rows:

| Agent Browser | Camoucli | Status | Slice | Node API | Notes |
| --- | --- | --- | --- | --- | --- |
| `goto <url>` | `goto <url>` | supported | Slice 1 | CLI only alias | Canonical daemon action remains navigation/open. |
| `state save` | `state save` | adapted | Slice 6 | `CamouClient.state.save` | Portable Playwright storage state, not full Firefox profile. |
| `window new` | `window new` | adapted | Slice 3 | `CamouClient.window.new` | New tracked Playwright page, not guaranteed OS window. |
| `inspect` | unsupported error | unsupported | Slice 9 | none | CDP DevTools proxy is outside local Camoufox scope. |
| MCP/dashboard/chat/plugins | none | out of scope | n/a | none | Integration surfaces are outside this map. |

The first implementation can maintain this matrix manually. If it grows hard to keep accurate, add a simple JSON data file and a Node script to generate the markdown, following the style of `scripts/generate-compatibility-matrix.mjs` without adding dependencies.

Keep `docs/compatibility-matrix.md` focused on Camoufox/Playwright launch compatibility. It may link to `docs/agent-browser-command-parity.md`, but it should not absorb command-parity rows.

## Migration Notes

Create `docs/agent-browser-migration.md` with focused migration sections:

- Local scope: Camoucli drives local Camoufox through Playwright, not Browserbase/CDP/provider browsers.
- Sessions: Camoucli `--session` selects a persistent Firefox profile; Agent Browser restore policy flags are not copied.
- Profiles vs state: `profile` is full persistent browser data; `state` is portable Playwright storage-state JSON.
- Tabs: Camoucli tab labels are tab names; active-tab behavior is convenience layered on top of existing `--tabname`.
- Windows: `window new` creates a tracked page, not a guaranteed OS-level window.
- Network: routes/logs/HAR are Playwright-backed and in-memory per session; CDP-specific request inspection is unsupported.
- Debug: `trace` is Playwright tracing; `profiler` and DevTools `inspect` are unsupported in the local Camoufox scope.
- Video/PDF: document smoke-tested support only after real Camoufox verification.
- Node API: direct browser automation uses `Camoufox`; CLI-parity automation uses `CamouClient`.
- Unsupported commands: include a table of unsupported CDP/provider/integration commands and the nearest Camoucli alternative.

README should link to this migration doc from the Agent Browser acknowledgement and from the command reference once parity commands land.

## README And API Docs

README updates should happen incrementally by slice:

- Slice 1: navigation aliases, URL normalization, eval input modes.
- Slice 2: expanded input, wait, get/is/find, screenshot forms.
- Slice 3: session/current close, `session id/info`, active tabs, labels, `window new`.
- Slice 4: new launch globals.
- Slice 5: downloads, frame/dialog/read/runtime `set`.
- Slice 6: cookies/storage/state semantics and storage layout.
- Slice 7: network route/request/HAR.
- Slice 8: console/errors/highlight/clipboard/trace.
- Slice 9: diff/vitals/pushstate/init scripts and unsupported commands.
- Slice 10: final command reference audit and migration links.

Node API docs:

- Keep `Camoufox` docs Playwright-first.
- Add `CamouClient` docs when the daemon client is implemented.
- Show one short example per major namespace: open/snapshot/click, state save/load, network route/request, trace, and unsupported error handling.
- Document that `CamouClient` returns structured data and never formatted CLI output.

Skill docs:

- Update `skills/camou/SKILL.md` and `skills/camou/references/workflows.md` only after the implemented commands are stable enough for agents to use.
- Keep the recommended agent workflow centered on `open -> snapshot -i -> interact with @refs -> re-snapshot`; add new commands as focused alternatives, not as a replacement workflow.

## Unsupported-Command Messaging

Unsupported compatibility commands should return structured errors with stable codes.

Recommended pattern:

- Error code: `unsupported_command` or a more specific `unsupported_cdp_feature` if the error taxonomy is expanded.
- Message: name the command and the Camoucli scope boundary.
- Details: include `command`, `reason`, and `alternative` when available.
- JSON mode: preserve the existing `{ success: false, error, exitCode }` shape from `src/cli/main.ts`.

Examples:

- `inspect`: "The inspect command depends on a Chrome DevTools/CDP target. Camoucli's local Camoufox mode does not expose that surface. Use trace, console, errors, screenshot, or get/session commands instead."
- `profiler`: "CDP profiler capture is not available through Camoufox Firefox Playwright. Use trace start/stop for portable Playwright traces."
- `connect --cdp`: "CDP/provider connection modes are outside Camoucli's local Camoufox daemon scope."

Tests:

- CLI parse tests if syntax is accepted.
- IPC/schema tests if the unsupported command reaches the daemon.
- JSON error tests for structured output.
- Human-output tests only for concise, non-leaky messages.

## Unit Test Strategy

Use the existing focused test files and add new files only when a command family becomes large.

Parser and help:

- `tests/cli-program.test.ts`: every new command shape, alias, option, default action name, and payload field.
- Add `tests/cli-help.test.ts` if help coverage grows beyond a few cases.
- Test invalid parser cases: missing URL for `goto`, invalid base64, invalid numeric ranges, invalid enum values, incompatible flags.

Defaults:

- `tests/cli-defaults.test.ts`: session/tab/launch defaults for every new daemon action that uses them.
- Explicit tests for active-tab fallback once Slice 3 changes tab selection precedence.
- Compatibility checks for launch-only options once Slice 4 adds them.

Schemas:

- Add `tests/ipc-protocol.test.ts` if schema coverage becomes noisy in integration tests.
- Test every new typed IPC action accepts valid payloads and rejects invalid payloads.
- Avoid generic `Record<string, unknown>` payloads in public action tests.

Output:

- `tests/output.test.ts`: human output for each result family.
- JSON output should stay raw structured data; only test JSON formatting where CLI error or CLI shell behavior matters.
- Include redaction tests for cookie/state output where non-JSON output must avoid secrets.

Pure helpers:

- URL normalization helper.
- eval base64/stdin parsing helper.
- state path/name resolution.
- cURL cookie parsing.
- request filtering/status matching.
- artifact path generation.
- text diff formatting.
- unsupported error construction.

## Fake Playwright And Daemon Tests

Use the existing fake browser harness for most browser behavior. Extend it only with the Playwright methods needed by each slice.

Current fake coverage already models pages, locators, history, basic input, screenshots, cookies, tabs, and profile persistence. Add capabilities as needed:

- Slice 2: `dblclick`, `focus`, `selectOption` arrays, typing delay capture, locator screenshot, `boundingBox`, `getAttribute`, computed styles, keyboard down/up/type/insertText, mouse move/down/up/wheel, drag, upload, waitForURL, waitForFunction.
- Slice 3: active tab metadata, generated tab ids, popup/new page event simulation, tab switching/closing behavior.
- Slice 5: downloads, frames, dialogs, runtime context/page settings.
- Slice 6: storage state, localStorage/sessionStorage, cookie clear/get/set.
- Slice 7: context route/unroute, request/response events, request ring buffer, HAR output shape.
- Slice 8: console/pageerror events, tracing start/stop, clipboard, highlight injection.
- Slice 9: pushstate, init-script registry, vitals evaluation, diff snapshot/screenshot helpers.

Guidelines:

- Keep fake browser behavior minimal and deterministic.
- Prefer manager/router integration tests for daemon-owned state transitions.
- Add narrow unit tests for algorithms that do not need a fake browser.
- Do not make the fake browser a second browser engine; only model what Camoucli depends on.

## CLI Integration Tests

Keep spawned CLI integration tests limited because they are slower.

Use:

- `tests/cli-bin.integration.test.ts` for executable/help behavior.
- `tests/cli-json.integration.test.ts` for structured errors and command failures that should not leak human text into JSON.
- A small number of end-to-end CLI-through-daemon tests for workflows that require the CLI defaults layer plus daemon state.

Suggested CLI workflow tests:

- `open -> snapshot -i -> click @ref -> get url`
- `open` without URL -> `cookies set` or `network route` setup -> `goto`
- `tab new --label` -> `tab <label>` -> active-tab command without `--tabname`
- unsupported command with `--json`

Most behavior should stay in `tests/daemon.integration.test.ts` or family-specific fake-browser tests to keep runtime manageable.

## Node API Tests

As decided in `Decide Node API Exposure`, keep two sets of API tests:

- Existing `tests/api.test.ts` for `Camoufox` direct Playwright launch behavior.
- New `tests/camou-client.test.ts` for the typed daemon client.

`CamouClient` tests should mock `ensureDaemonRunning` and `sendDaemonRequest` for method-shape coverage:

- defaults and launch options are attached correctly
- methods call the expected semantic IPC action
- timeout and paths options are honored
- errors preserve exported Camoucli error types
- canonical methods exist while pure CLI aliases are not duplicated

Add a few integration-style client tests later, but do not make every client method launch a daemon.

## Real Camoufox Smoke Tests

Real Camoufox smoke tests should be opt-in, not part of ordinary `npm test`, because they require installed browsers, platform dependencies, and slower launches.

Recommended command:

- Add `npm run test:smoke` or `npm run smoke:camoufox`.
- Gate tests behind an env var such as `CAMOU_REAL_BROWSER=1`.
- Skip with a clear message when no compatible Camoufox is installed.

Smoke tests to add by slice:

- Slice 1: URL normalization against a real page.
- Slice 2: screenshot selector/format/quality, upload if practical, wait URL/function.
- Slice 3: URL-less open, popup/new tab tracking, current-session close.
- Slice 4: launch-time user agent, headers, proxy bypass if practical, ignore HTTPS errors, color scheme/reduced motion, init script, storage state.
- Slice 5: downloads, frames, dialogs, runtime `set`.
- Slice 6: state save/load round trip and storage local/session behavior.
- Slice 7: route/unroute and request log; HAR stop writes valid JSON.
- Slice 8: trace writes a zip, console/errors capture, clipboard where permission allows.
- Slice 9: PDF only if being considered; video/HAR launch options only if implemented; pushstate/vitals/init scripts.

Real smoke tests should record findings in the relevant implementation issue or docs when support is conditional. Do not claim support for PDF/video/clipboard variants until smoke results are known.

## Final Polish Checklist

The final polish slice should audit, not invent:

- Every accepted command appears in help, README or linked docs, command-parity matrix, and tests.
- Every adapted command has a migration note.
- Every unsupported command has a structured error and a matrix row.
- Every public `CamouClient` method has a typed result and at least one API test.
- Every daemon action has parser/schema/router/manager coverage appropriate to its risk.
- Non-JSON output is concise and does not leak secrets.
- JSON output stays stable enough for scripts.
- `npm run build` and `npm test` pass.
- Opt-in real Camoufox smoke tests have been run for features whose support depends on the actual Firefox/Camoufox engine.

## Implementation Ticket Template Addition

Each future implementation ticket should include these acceptance criteria:

- CLI help text added or updated.
- README or linked doc updated.
- Agent Browser command-parity matrix row updated.
- Migration note added for adapted/unsupported semantics.
- CLI parser/defaults/schema/output tests added as applicable.
- Fake-browser or unit tests added for daemon behavior.
- Node API wrapper and tests added if the Node API decision says the command is public.
- Real Camoufox smoke test added or explicitly deferred with reason if browser behavior is uncertain.
