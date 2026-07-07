# Debug Artifact Parity Decision

Baseline:

- `agent-browser`: `/Users/txchen/code/github/agent-browser` at `ed2e105`.
- Camoucli: this workspace after `Decide State Storage Network Parity`.

Primary sources:

- Scope boundary: `.scratch/agent-browser-command-parity/issues/02-decide-parity-scope-boundaries.md:13`
- Core screenshot/PDF deferral: `.scratch/agent-browser-command-parity/research/03-core-automation-parity.md:98`
- State/network artifact deferral: `.scratch/agent-browser-command-parity/research/04-state-storage-network-parity.md:167`
- Camoucli current screenshot baseline: `src/cli/program.ts:437`, `src/ipc/protocol.ts:95`, `src/daemon/router.ts:43`, `src/browser/manager.ts:315`
- Camoucli current dependency baseline: `package.json:1`
- `agent-browser` debug command docs: `/Users/txchen/code/github/agent-browser/skill-data/core/references/commands.md:389`
- `agent-browser` screenshot/PDF parsing: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:782`
- `agent-browser` trace/profiler/record/console/errors/highlight/clipboard parsing: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1588`
- `agent-browser` diff/vitals/pushstate/remove-init-script parsing: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1900`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:2152`
- `agent-browser` native console/errors/diff handlers: `/Users/txchen/code/github/agent-browser/cli/src/native/actions.rs:4432`, `/Users/txchen/code/github/agent-browser/cli/src/native/actions.rs:4512`
- `agent-browser` native trace/profiler/record/PDF handlers: `/Users/txchen/code/github/agent-browser/cli/src/native/actions.rs:5042`, `/Users/txchen/code/github/agent-browser/cli/src/native/tracing.rs:1`, `/Users/txchen/code/github/agent-browser/cli/src/native/recording.rs:1`, `/Users/txchen/code/github/agent-browser/cli/src/native/actions.rs:5292`
- `agent-browser` native inspect and inspect proxy: `/Users/txchen/code/github/agent-browser/cli/src/native/actions.rs:3224`, `/Users/txchen/code/github/agent-browser/cli/src/native/inspect_server.rs:16`
- `agent-browser` native highlight/clipboard/vitals/pushstate/init-script handlers: `/Users/txchen/code/github/agent-browser/cli/src/native/actions.rs:5446`, `/Users/txchen/code/github/agent-browser/cli/src/native/actions.rs:5948`, `/Users/txchen/code/github/agent-browser/cli/src/native/actions.rs:6132`, `/Users/txchen/code/github/agent-browser/cli/src/native/actions.rs:5803`
- Playwright portability references: `node_modules/playwright-core/types/types.d.ts:288`, `node_modules/playwright-core/types/types.d.ts:1134`, `node_modules/playwright-core/types/types.d.ts:3617`, `node_modules/playwright-core/types/types.d.ts:8144`, `node_modules/playwright-core/types/types.d.ts:8887`, `node_modules/playwright-core/types/types.d.ts:9510`, `node_modules/playwright-core/types/types.d.ts:9973`, `node_modules/playwright-core/types/types.d.ts:14714`, `node_modules/playwright-core/types/types.d.ts:21132`

## Decision

Camoucli should adopt the debugging and artifact commands that can be implemented through Playwright Firefox APIs and Camoucli's existing daemon-owned session model:

- `console [--clear]`
- `errors [--clear]`
- `highlight <target>`
- `clipboard read|write|copy|paste`
- `trace start|stop [path]`
- expanded `screenshot`
- `diff snapshot|screenshot|url`
- `vitals|web-vitals [url] [--json]`, as framework-agnostic web vitals
- `pushstate <url>`
- `addinitscript <js>` plus a limited `removeinitscript <id>` contract

Camoucli should not copy Agent Browser's CDP/Chromium debug surfaces as if they were portable:

- `profiler start|stop` should be excluded or return a clear unsupported error in the local Camoufox command set.
- `inspect` as "open Chrome DevTools for this session" should be excluded from first parity because Agent Browser implements a CDP DevTools proxy.
- `record start|stop|restart` should not be implemented as a mid-session parity command in the first slice. Playwright video is a context launch option, and Agent Browser's implementation captures CDP screenshots through ffmpeg.
- `pdf <path>` should be accepted only after a real Camoufox smoke test verifies Playwright Firefox behavior. If it fails, leave it unsupported rather than adding a misleading command.

All filesystem artifact writes should be daemon-owned. When a path is omitted, write under the active session's `artifacts` directory with subdirectories by artifact type. CLI parsing should only normalize user intent and pass typed IPC requests.

## Event Commands

Adopt:

- `console [--clear]`
- `errors [--clear]`

Semantics:

- Attach Playwright listeners in the daemon when a session/tab is created:
  - `page.on('console')` for console entries.
  - `page.on('pageerror')` for uncaught page errors.
  - Optionally include failed requests as a separate field later, but do not mix them into JavaScript page errors in the first implementation.
- Store events in a per-session in-memory ring buffer, with tab name/id, page URL, event type, text, timestamp, and location when Playwright exposes it.
- `console` returns the current console buffer; `console --clear` clears and returns `{ cleared: true, count }`.
- `errors` returns the current page-error buffer; `errors --clear` clears and returns `{ cleared: true, count }`.
- Buffers clear on session stop/daemon shutdown. They are not stored in profiles, state snapshots, traces, or HARs.

This is more consistent than Agent Browser's current native split, where `console --clear` is handled but the shown `errors` native handler does not consume the parser's clear flag.

## Highlight

Adopt `highlight <target>`.

Semantics:

- Resolve `<target>` through the existing selector-or-ref path so both CSS selectors and `@eN` snapshot refs work.
- Implement with Playwright locators and a small injected overlay/outline on the target element.
- The default highlight should be temporary and non-persistent. A later option can add duration or screenshot annotation if needed.
- Return `{ highlighted: target }` plus any useful resolved metadata.

This is portable and useful for debugging snapshots/refs in headed and screenshot workflows.

## Clipboard

Adopt:

- `clipboard read`
- `clipboard write <text>`
- `clipboard copy`
- `clipboard paste`

Semantics:

- Prefer page-context Clipboard API operations for `read`/`write`: grant `clipboard-read`/`clipboard-write` permission on the browser context when possible, then run `navigator.clipboard.readText()` or `writeText(...)`.
- `copy` and `paste` should synthesize platform shortcuts through Playwright keyboard APIs: `Meta+C/V` on macOS, `Control+C/V` elsewhere.
- Return clear validation/runtime errors when the active page is not a secure context, the browser denies clipboard permissions, or no focused editable element exists for paste.
- Do not read or write the host OS clipboard directly from the CLI process. The command is a browser-page operation.

Clipboard parity is portable enough to accept, but it needs explicit caveats in help text because browser clipboard permissions vary by page origin and headless/headed mode.

## Tracing

Adopt `trace start|stop [path]`, but define it as Playwright tracing, not Chrome DevTools tracing.

Semantics:

- Use `browserContext.tracing.start({ screenshots: true, snapshots: true, sources: true })` on the active Camoucli session context.
- `trace start` fails if a trace is already active in that session.
- `trace stop [path]` writes a Playwright trace zip. If no path is supplied, write to `profiles/<session>/artifacts/traces/trace-<timestamp>.zip`.
- The trace lifetime is per session context. It should capture current and future pages in that context until stopped.
- Do not use Playwright's deprecated browser-level Chromium tracing or CDP `Tracing.start`.

This preserves a useful debugging workflow without pretending the output is the same JSON trace that Agent Browser emits from CDP.

## Screenshots

Adopt the screenshot improvements already deferred from the core ticket:

- `screenshot [selector] [path]`
- `screenshot --full|-f`
- `screenshot --format <png|jpeg>`
- `screenshot --quality <n>`
- optional global/default `--screenshot-dir <dir>` if Camoucli wants Agent Browser compatibility

Semantics:

- Use `locator.screenshot(...)` when a selector/ref is supplied; otherwise use `page.screenshot(...)`.
- Default artifact path should be in the active session artifacts directory.
- Preserve current Camoucli behavior where practical, but stop hard-coding every screenshot as full-page. Agent Browser's explicit `--full` should mean full-page; default should be viewport unless compatibility with existing Camoucli users requires a transition.
- JPEG quality applies only to JPEG output; reject or warn for PNG.
- Parent directories should be created by the daemon.

Defer screenshot annotation unless the implementation includes a real overlay pass tied to the current snapshot refs. Annotation is useful, but it creates visual state and `@eN` coupling that should be built deliberately after basic selector/format/path parity.

## PDF

Do not commit to `pdf <path>` until a real Camoufox smoke test is run.

If accepted after smoke testing:

- Use Playwright `page.pdf({ path, printBackground, landscape, preferCSSPageSize })` if it works on Camoufox Firefox.
- Keep the first CLI shape narrow: `pdf <path>` plus a few direct Playwright options only if needed.
- Write files from the daemon.

If the smoke test fails:

- Return an explicit unsupported error explaining that PDF generation is not available for the current Camoufox/Firefox engine.
- Do not route through Chromium, CDP, browser print dialogs, screenshots, or external converters as fake parity.

Agent Browser uses CDP `Page.printToPDF`, so its implementation does not establish Camoufox portability.

## Video Recording

Do not adopt Agent Browser's mid-session `record start|stop|restart` as first debug parity.

Reasoning:

- Agent Browser records by repeatedly capturing CDP screenshots and piping them to ffmpeg.
- Playwright's portable video support is `recordVideo` at context/page creation time, and persistent-context video files are finalized when pages/contexts close.
- Camoucli currently launches persistent contexts through the daemon; adding mid-session recording would either require a new context lifecycle or a custom screenshot-to-video pipeline with a new ffmpeg dependency.

Accepted later shape:

- Add launch/session options such as `open --record-video [dir]` or `session start --record-video [dir]` in the session/tab/launch ticket.
- Store videos under `profiles/<session>/artifacts/videos`.
- Return video paths on tab/session close or through a future artifact listing command.

This keeps the first parity plan honest: video is in scope as a debug artifact, but not as Agent Browser's exact `record` command yet.

## Diff

Adopt:

- `diff snapshot [--baseline <file-or-text>] [--selector <target>] [--compact] [--depth <n>]`
- `diff screenshot --baseline <file> [--output <file>] [--threshold <0-1>] [--selector <target>] [--full|-f]`
- `diff url <url1> <url2> [--screenshot] [--full|-f] [--wait-until <state>] [--selector <target>] [--compact] [--depth <n>]`

Semantics:

- `diff snapshot` should take a current Camoucli snapshot using the existing snapshot model, then compare it with a baseline file or inline baseline string. Use a unified text diff plus counts.
- `diff screenshot` should take a current screenshot and compare it with a baseline image. The implementation will need a Node image decoder/diff dependency or a small local PNG/JPEG path; do not pretend this can be done with plain string comparison.
- `diff url` should navigate/capture the two URLs serially in the active tab unless a later design adds isolated temporary tabs. It must restore or report the final active URL explicitly because it mutates the tab.
- If `--screenshot` is absent, `diff url` compares snapshots. If present, it compares screenshots.
- Default outputs should be JSON-shaped data in IPC, with human formatting in the CLI output layer.

This command family is portable, but `diff screenshot` has a real dependency decision. Keep it out of the smallest first implementation slice unless adding an image diff package is acceptable.

## Vitals

Adopt `vitals|web-vitals [url] [--json]` as framework-agnostic Core Web Vitals measurement.

Semantics:

- Inject an idempotent script that uses `PerformanceObserver` and the Performance APIs to collect FCP, LCP, CLS, INP where available, TTFB from navigation timing, and page URL.
- If a URL is supplied, register the observer before navigation where possible, then navigate and wait for a settling window. If no URL is supplied, reload the current page to capture load metrics; document that this mutates page state.
- Return a structured payload always; normal CLI output can render a short summary while `--json` prints the full payload.
- Include `hydration: null` or omit hydration fields unless a later React-specific feature installs and reads a real React DevTools/profiling hook.

Do not copy Agent Browser's React hydration enrichment into the generic Camoucli command. React-specific `react ...` commands are outside the current local CLI parity scope unless a later ticket explicitly reopens them.

## Pushstate

Adopt `pushstate <url>`.

Semantics:

- Run page JavaScript that resolves the requested URL relative to `location.href`, calls `history.pushState({}, '', resolvedUrl)`, dispatches a `PopStateEvent` or equivalent event, and returns the resulting `location.href`.
- This is a same-document SPA navigation helper. It should not perform network navigation, wait for load, or claim framework-specific router integration.
- If the page blocks the operation because the URL is cross-origin or invalid, return the browser error clearly.

Agent Browser has framework-aware Next router behavior, but Camoucli should start with the portable History API contract.

## Init Scripts

Adopt `addinitscript <js>` and a limited `removeinitscript <id>` contract.

Semantics:

- `addinitscript <js>` registers script content in a daemon-owned per-session init-script registry and applies it to future documents in the active context using `browserContext.addInitScript`.
- Return a stable Camoucli script id such as `init_1`.
- Also support launch-time init script paths later in the session/tab/launch ticket, because Agent Browser docs emphasize staging scripts before the first navigation.
- Playwright has `addInitScript` but no public `removeInitScript`. Therefore `removeinitscript <id>` cannot remove a script that has already been registered with the current Playwright context.

Recommended `removeinitscript` behavior:

- Remove the script from Camoucli's registry so it is not re-applied to future sessions or to any Camoucli-managed manual injection path.
- Return `{ removed: true, activeContextRemoval: false }` when the current Playwright context cannot actually remove the already registered script.
- Document this limitation in help text.

If that limitation feels too surprising, expose only `addinitscript` in the first implementation and reserve `removeinitscript` until Camoucli has a custom injection layer.

## Inspect And Profiler

Exclude from first local Camoufox parity:

- `inspect`
- `profiler start|stop [--categories ...]`

Rationale:

- Agent Browser's `inspect` spins up an HTTP/WebSocket proxy for Chrome DevTools and forwards CDP traffic to a page-level target.
- Agent Browser's `profiler` uses CDP tracing categories aimed at Chromium/V8/DevTools.
- Playwright's Firefox transport does not provide a portable CDP DevTools frontend or equivalent CPU profiler command surface through the public APIs Camoucli is using.

Do not add commands with these names that silently do something different. If compatibility requires accepting the command syntax, return an unsupported structured error that names the engine limitation.

Portable alternatives:

- `trace start|stop` for Playwright traces.
- `console`, `errors`, `screenshot`, `diff`, `vitals`, and future artifact listing commands for local diagnosis.
- Existing or expanded `session info`, `tab list`, `get url`, and `get title` for session inspection.

## Implementation Shape

Add typed IPC actions rather than a generic debug payload:

- `console.list`, `console.clear`
- `errors.list`, `errors.clear`
- `highlight`
- `clipboard.read`, `clipboard.write`, `clipboard.copy`, `clipboard.paste`
- `trace.start`, `trace.stop`
- `screenshot`
- `diff.snapshot`, `diff.screenshot`, `diff.url`
- `vitals`
- `pushstate`
- `initScript.add`, `initScript.remove`

Runtime state additions:

- Per-session console ring buffer.
- Per-session page-error ring buffer.
- Per-session trace active flag.
- Per-session init-script registry.
- Optional artifact helper for generated paths under `profiles/<session>/artifacts/{screenshots,traces,diffs,pdfs,videos}`.

Test strategy:

- Unit-test CLI parsing and IPC schemas for every accepted command and every explicitly unsupported command if the syntax is accepted.
- Use fake Playwright page/context tests for console/error listener capture, clear behavior, highlight injection, clipboard command dispatch, trace start/stop calls, pushstate, and init-script registry behavior.
- Unit-test artifact path generation without launching a browser.
- Unit-test snapshot diff with text inputs.
- If `diff screenshot` is implemented, unit-test identical images, changed images, dimension mismatch, and output path writing.
- Run real Camoufox smoke tests for clipboard permissions, Playwright tracing, PDF support, and video launch-time behavior before documenting those as stable.

## Defer Or Exclude

- Exclude `profiler` and CDP DevTools `inspect` from the local Camoufox parity plan.
- Defer mid-session `record` parity; adopt launch-time Playwright video later.
- Defer `pdf` until a real Camoufox smoke test confirms Playwright support.
- Defer screenshot annotation unless implemented with explicit overlay/ref semantics.
- Defer full artifact management commands such as artifact listing, cleanup, or global artifact retention policy until the accepted command set is being implemented.
