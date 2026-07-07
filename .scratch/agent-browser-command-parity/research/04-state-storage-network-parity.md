# State Storage Network Parity Decision

Baseline:

- `agent-browser`: `/Users/txchen/code/github/agent-browser` at `ed2e105`.
- Camoucli: this workspace after `Decide Core Automation Parity`.

Primary sources:

- Scope boundary: `.scratch/agent-browser-command-parity/issues/02-decide-parity-scope-boundaries.md:13`
- Command inventory: `.scratch/agent-browser-command-parity/research/01-command-gap-inventory.md:1`
- Camoucli current cookie/profile/session paths: `src/browser/manager.ts:32`, `src/browser/manager.ts:358`, `src/state/paths.ts:139`, `src/state/session-profiles.ts:22`
- Camoucli daemon routing and IPC baseline: `src/daemon/router.ts:57`, `src/ipc/protocol.ts:133`
- `agent-browser` cookie parsing and commands: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:162`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1317`
- `agent-browser` state commands: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1739`
- `agent-browser` storage and network commands: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:2885`
- `agent-browser` native cookie/storage/state handlers: `/Users/txchen/code/github/agent-browser/cli/src/native/actions.rs:4310`, `/Users/txchen/code/github/agent-browser/cli/src/native/state.rs:248`, `/Users/txchen/code/github/agent-browser/cli/src/native/storage.rs:6`
- `agent-browser` native network/HAR/request handlers: `/Users/txchen/code/github/agent-browser/cli/src/native/actions.rs:8289`, `/Users/txchen/code/github/agent-browser/cli/src/native/actions.rs:8395`, `/Users/txchen/code/github/agent-browser/cli/src/native/actions.rs:7605`
- Playwright portability references: `node_modules/playwright-core/types/types.d.ts:8780`, `node_modules/playwright-core/types/types.d.ts:9272`, `node_modules/playwright-core/types/types.d.ts:9930`, `node_modules/playwright-core/types/types.d.ts:20740`, `node_modules/playwright-core/types/types.d.ts:22249`

## Decision

Camoucli should adopt the local state, storage, cookie, and portable network command families, but with Camoucli-native lifetime rules:

- Browser profile persistence remains Camoucli's existing session profile model under `profiles/<session>/{user-data,downloads,artifacts}`.
- `state` commands should mean portable Playwright-compatible storage-state snapshots, not full Firefox profile snapshots.
- Cookies and web storage commands mutate the current daemon-owned browser session.
- Network routes, request logs, and HAR capture are in-memory daemon session features. They should not be persisted into profiles or state snapshots.
- CDP-specific network behavior should not be copied. Use Playwright context/page APIs so the implementation remains Camoufox Firefox compatible.

This keeps parity useful for CLI automation while preserving Camoucli's architecture: the CLI parses user intent, IPC validates structured requests, and the daemon owns browser state, filesystem writes, request listeners, and route handlers.

## Cookies

Adopt:

- `cookies` and `cookies get [url...]`: list cookies from the current session. If URLs are supplied, pass them to Playwright `browserContext.cookies(urls)`; otherwise return all context cookies.
- `cookies set <name> <value> [--url <url>] [--domain <domain>] [--path <path>] [--httpOnly] [--secure] [--sameSite <Strict|Lax|None>] [--expires <timestamp>]`: add one cookie to the current session with `browserContext.addCookies`.
- `cookies set --curl <file> [--domain <domain>] [--url <url>]`: import cookies from one of Agent Browser's accepted file shapes: JSON array, copied cURL command containing a Cookie header or `-b`/`--cookie`, or a bare Cookie header.
- `cookies clear`: clear cookies for the current session using `browserContext.clearCookies`.

Adapt:

- Keep Camoucli's current `cookies export [path]` and `cookies import <path>` commands. They are useful file-oriented equivalents and should remain stable.
- Prefer implementing cURL-cookie parsing in daemon/shared state code rather than doing secret-bearing parsing in the CLI. The CLI should send `{ action: "cookies.setCurl", path, domain?, url? }`; the daemon should read and parse the file, then call `addCookies`.
- If `cookies set` receives neither `--url` nor `--domain`/`--path`, the daemon may default the cookie URL to the current tab URL when it is an HTTP(S) page. If the current page is `about:blank`, `file:`, or another non-cookie URL, return a validation error requiring `--url` or `--domain`.
- Error messages from cURL parsing must not echo cookie values or copied headers.

Do not replace `cookies export/import` with `state save/load`: cookie files and storage-state files solve different workflows.

## Storage

Adopt:

- `storage local [get] [key]`
- `storage local set <key> <value>`
- `storage local clear`
- `storage session [get] [key]`
- `storage session set <key> <value>`
- `storage session clear`

Semantics:

- These commands act on the current tab's active page origin.
- `local` maps to `localStorage`; `session` maps to `sessionStorage`.
- Values are strings, matching web storage. Do not auto-parse JSON.
- `get` with no key returns a plain object of all key/value pairs. `get <key>` returns `{ key, value }`, with `value: null` when absent.
- `set` and `clear` should run in the page via `page.evaluate`.
- If the current page has no usable origin, return a validation error instead of silently operating on `about:blank`.

Storage commands are current-page operations. They do not enumerate every origin in the persistent profile.

## State Snapshots

Adopt `state save/load/list/clear/show/clean/rename`, but define them as portable storage-state snapshots, separate from profiles.

Storage location:

- Add a managed state snapshot directory, preferably `<dataDir>/states`.
- Explicit paths are allowed for `save`, `load`, `show`, `clear`, and `rename`.
- Relative managed names should resolve under `<dataDir>/states`; explicit paths containing path separators should resolve as filesystem paths.

Format:

- Default to Playwright-compatible `storageState` JSON: `{ cookies, origins: [{ origin, localStorage }] }`.
- Use `browserContext.storageState({ path })` for `state save` when possible.
- Do not include full Firefox profile files, downloads, request logs, routes, HAR buffers, or artifacts.
- Session storage is not part of Playwright's storage-state format. Do not block the first implementation on sessionStorage snapshotting. If later added, put it behind a Camoucli extension field and keep the base file loadable as Playwright storage state.

Commands:

- `state save <path-or-name>`: save current session storage state. If the argument is a managed name, write `<dataDir>/states/<name>.json`; if it looks like a path, write that path. Return path, cookie count, and origin count.
- `state load <path-or-name>`: apply cookies and localStorage from the snapshot to the current session. For a running persistent context this is an import/merge operation, not a full profile reset. It should return the loaded path plus counts.
- `state list`: list managed state files only, with path, size, modified time, and summary if cheap to compute.
- `state show <path-or-name>`: show metadata and parsed state content. In non-JSON output, redact or summarize cookie values; JSON output can include the full parsed file because `--json` is explicit machine output.
- `state clear <path-or-name>`: delete one managed or explicit state file.
- `state clear --all`: delete all managed state files. This must not remove Camoucli profiles.
- `state clean --older-than <days>`: delete managed state files older than the threshold.
- `state rename <old-name-or-path> <new-name>`: rename a managed or explicit state file. Validate the new managed name with the same safe-name rules used for sessions.

Important limitation:

- `state load` should not promise a pristine browser state in an already-running persistent profile. Stale cookies/storage that are outside the loaded file can remain unless explicitly cleared. A future launch/session ticket can add launch-time `--state <path>` semantics for clean-profile initialization.

Interaction with profile management:

- `profile list/inspect/remove` remains the API for full persistent browser profiles.
- `state` commands are portable snapshots for auth/session transfer.
- `state clear --all` must not call `profile.remove`.
- `profile remove` must not delete state snapshots unless a future explicit flag says so.

## Network Routes

Adopt:

- `network route <url> [--abort|--body <body>] [--resource-type <csv>]`
- `network unroute [url]`

Semantics:

- Use Playwright `browserContext.route`/`unroute`, not CDP Fetch.
- Routes are scoped to the current Camoucli session context, so they apply to current and future tabs in that session.
- Routes are in-memory only and clear on `session.stop`, daemon shutdown, or `network unroute`.
- Route matching should accept Playwright glob strings first. Regex/predicate support is unnecessary for parity.
- `--resource-type <csv>` filters by `request.resourceType()`; non-matching requests should continue normally.
- `--abort` aborts matching requests.
- `--body <body>` fulfills matching requests with status 200 and the supplied body. If the body parses as JSON, set `content-type: application/json`; otherwise use `text/plain`.
- If neither `--abort` nor `--body` is supplied, reject the command as a validation error. A no-op route is not useful.

Do not implement Agent Browser's CDP Fetch-specific behavior or provider network features.

## Request Inspection

Adopt:

- `network requests [--clear] [--filter <text>] [--type <csv>] [--method <method>] [--status <code|nxx|lo-hi>]`
- `network request <requestId>`

Semantics:

- Request tracking should be daemon-owned and per session.
- Attach Playwright `request`, `response`, and `requestfailed` listeners when a session starts, or no later than the first network command. Starting at session launch is preferable because it avoids missing early navigation requests.
- Keep an in-memory ring buffer per session, with a documented cap such as 1000 requests.
- `network requests` returns the filtered buffer.
- `network requests --clear` clears the buffer and returns a count.
- `network request <requestId>` returns metadata for one request: id, URL, method, resource type, request headers, post data when available, response status/status text, response headers, MIME/content type, failure text, timestamps, and tab/page name if known.
- Response body capture should be optional and capped if added later. The first implementation should not promise bodies, because Playwright body access can be expensive and timing-sensitive.

Request logs are not persisted to profiles or state snapshots.

## HAR

Adopt `network har start` and `network har stop [path]` only as a portable HAR-from-tracked-events feature.

Semantics:

- `network har start` clears a per-session HAR buffer and marks HAR capture active.
- While active, the same request/response listeners used for request inspection append HAR entries.
- `network har stop [path]` writes a HAR 1.2 JSON file. If no path is supplied, write to the session artifacts directory.
- The first implementation may omit embedded response bodies and detailed low-level timing that Playwright does not expose portably.
- If the user needs full Playwright `recordHar` with content attachments, that should be handled by the debug/artifact or launch/session ticket because Playwright's built-in `recordHar` is a context creation option and is saved on context close.

This gives CLI parity for local debugging without pretending Camoucli has Chromium CDP HAR capture.

## Implementation Shape

Add typed IPC actions rather than a generic `network` or `state` payload:

- `cookies.get`, `cookies.set`, `cookies.setCurl`, `cookies.clear`
- existing `cookies.export`, `cookies.import` remain
- `storage.get`, `storage.set`, `storage.clear`
- `state.save`, `state.load`, `state.list`, `state.show`, `state.clear`, `state.clean`, `state.rename`
- `network.route`, `network.unroute`, `network.requests`, `network.request`, `network.har.start`, `network.har.stop`

Extend runtime state:

- `CamoucliPaths`: add `statesDir`.
- `SessionRuntime`: add route handler registry, request ring buffer, HAR capture flag/buffer, and maybe a request id counter.
- `BrowserManager.ensureSession`: install request listeners and initialize per-session network state.
- `BrowserManager.stopSession`: no special persistence; dropping the session clears routes/logs/HAR state.

Test strategy:

- Unit-test CLI parsing and IPC schemas for every accepted command.
- Unit-test cookie cURL parsing with JSON-array, cURL, bare header, empty file, and "do not echo secret" cases.
- Unit-test state path/name resolution.
- Use fake Playwright context tests for cookies, storage, state save/load, route registration, request buffer filtering, and HAR output shape.
- Add a small real-browser smoke test later for route/unroute and storage state if Camoufox is installed; do not require it for the planning ticket.

## Defer Or Exclude

- Exclude CDP-only network behavior and provider request inspection.
- Defer launch-time `--state <path>` or clean-profile state initialization to `Decide Session Tab Launch Parity`.
- Defer full Playwright `recordHar` launch option, content attachments, and richer artifact management to `Decide Debug Artifact Parity`.
- Defer IndexedDB storage-state support unless a later issue shows it is needed.
