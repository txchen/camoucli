# Agent Browser Command Parity

Camoucli supports selected `agent-browser` command-line workflows through its local Camoufox and Playwright daemon. The CLI may expose compatibility aliases, but the daemon remains the owner of browser lifecycle, sessions, tabs, refs, and persistent state.

Statuses:

- `supported`: available with matching local-browser semantics.
- `adapted`: available, but mapped onto Camoucli's daemon/session model.
- `deferred`: accepted for later slices.
- `unsupported`: intentionally rejected or not yet accepted.
- `out of scope`: outside Camoucli's local Camoufox scope.

## Core Aliases And Eval Input Modes

| Agent Browser command | Camoucli command | Status | Notes |
| --- | --- | --- | --- |
| `open [url]` | `open [url]` | adapted | Uses the daemon-resolved current tab. Bare hosts are normalized to `https://`; explicit `http:`, `https:`, `about:`, `data:`, `file:`, `chrome:`, and `chrome-extension:` URLs are preserved. URL-less `open` ensures the session/tab exists without navigating. |
| `goto <url>` | `goto <url>` | supported | CLI alias that sends the existing `open` daemon action after URL normalization. Requires a URL. |
| `navigate <url>` | `navigate <url>` | supported | CLI alias that sends the existing `open` daemon action after URL normalization. Requires a URL. |
| `key <key>` | `key <key>` | supported | CLI alias for the existing `press` daemon action. |
| `scrollinto <target>` | `scrollinto <target>` | supported | CLI alias for the existing `scrollintoview` / `scroll.intoView` action. Targets can be selectors or current-tab `@eN` refs. |
| `eval <expression>` | `eval <expression>` | supported | Runs JavaScript in the current tab through the existing daemon eval action. |
| `eval -b <script>` / `eval --base64 <script>` | `eval -b <script>` / `eval --base64 <script>` | supported | Decodes UTF-8 JavaScript in the CLI and rejects invalid base64 before contacting the daemon. |
| `eval --stdin` | `eval --stdin` | supported | Reads JavaScript from stdin in the CLI and sends the existing eval daemon action. |

Later parity slices will add debug/artifact commands.

## Direct Playwright Automation Commands

These commands operate on the current resolved session/tab and keep using Camoucli's selector-or-current-snapshot-ref target model. Targets can be CSS selectors or current-tab `@eN` refs from `snapshot`.

| Agent Browser command | Camoucli command | Status | Notes |
| --- | --- | --- | --- |
| `dblclick <target>` | `dblclick <target>` | supported | Runs Playwright `locator.dblclick()` for selectors or snapshot refs. |
| `focus <target>` | `focus <target>` | supported | Runs Playwright `locator.focus()`. |
| `type <target> <text>` | `type <target> <text>` | supported | Preserves append-without-clearing default behavior. |
| `type <target> <text> --clear --delay <ms>` | `type <target> <text> --clear --delay <ms>` | supported | Clears first when requested and passes typing delay to Playwright. |
| `select <target> <value...>` | `select <target> <value...>` | supported | Accepts one or more option values. |
| `keydown <key>` / `keyup <key>` | `keydown <key>` / `keyup <key>` | supported | Uses Playwright keyboard down/up. |
| `keyboard type <text>` | `keyboard type <text> [--delay <ms>]` | supported | Sends page keyboard typing. |
| `keyboard inserttext <text>` | `keyboard inserttext <text>` / `keyboard insert-text <text>` | supported | Sends raw text insertion. |
| `mouse move <x> <y>` | `mouse move <x> <y>` | supported | Moves the page mouse to coordinates. |
| `mouse down [button]` / `mouse up [button]` | same | supported | Button may be `left`, `right`, or `middle`. |
| `mouse wheel [dy] [dx]` | `mouse wheel [dy] [dx]` | supported | Defaults to `dy=300`, `dx=0`; argument order follows Agent Browser compatibility. |
| `scroll [direction] [amount]` | `scroll [direction] [amount] [--selector <target>]` | supported | Direction defaults to `down`, amount defaults to `300`, and `--selector` scrolls a target element. |
| `upload <target> <files...>` | `upload <target> <files...>` | supported | Uses daemon-routed Playwright file input handling. |
| `drag <source> <target>` | `drag <source> <target>` | supported | Drags one selector/ref to another. |
| `wait <ms>` | `wait <ms>` | supported | Fixed delay in milliseconds. |
| `wait <target>` | `wait <target>` | supported | Existing selector/ref wait remains supported. |
| `wait --text <text>` / `wait --load <state>` | same | supported | Existing text/load-state waits remain supported. |
| `wait --url <pattern>` | `wait --url <pattern>` | supported | Uses Playwright URL waiting with consistent `--timeout`. |
| `wait --fn <expression>` | `wait --fn <expression>` | supported | Uses Playwright function waiting with consistent `--timeout`. |
| `screenshot` | `screenshot [targetOrPath] [path] [--selector <target>] [--full|--viewport] [--format png|jpeg] [--quality <n>]` | adapted | Page screenshots preserve daemon-owned artifact paths when no path is supplied. Selector screenshots can use `--selector` or `screenshot <selector> <path>`. |
| `get html <target>` | `get html <target>` | supported | Returns element inner HTML. |
| `get attr <target> <attribute>` | `get attr <target> <attribute>` | supported | Returns the attribute value or null in JSON output. |
| `get count <target>` | `get count <target>` | supported | Returns locator count. |
| `get box <target>` | `get box <target>` | supported | Returns locator bounding box. |
| `get styles <target>` | `get styles <target>` | supported | Returns computed styles as a plain object. |
| `is visible|enabled|checked <target>` | `is visible|enabled|checked <target>` | supported | Returns element predicate booleans. |
| `find role <role>` | `find role <role> [--name <name>] [--exact] [--action <action>]` | supported | Subactions are `click`, `fill`, `check`, `hover`, and `text`; default is `click`. `fill` uses `--value <text>`. |
| `find text|label|placeholder|alt|title|testid <value>` | same | supported | Supports `--exact` where Playwright exposes it and the same narrow subactions. |
| `find first|last <target>` / `find nth <target> <index>` | same | supported | Applies a narrow subaction to the selected locator position. |

## Session And Tab Lifecycle

These commands add daemon-owned active-tab behavior while preserving explicit `--session` and `--tabname` workflows. Browser commands resolve tabs in this order: explicit `--tabname`, configured tab defaults from env/config, daemon active tab, then `main`.

| Agent Browser command | Camoucli command | Status | Notes |
| --- | --- | --- | --- |
| `session` | `session` | adapted | Prints the resolved current Camoucli session name without starting a browser session. |
| `session id [--scope worktree|cwd|git-root] [--prefix <text>]` | same | adapted | Generates a stable sanitized session name locally without starting the daemon. |
| `session info` | `session info` | adapted | Reports daemon/runtime state when the daemon is running and profile/path state when it is not. |
| `close` | `close` | adapted | Stops the resolved current session. |
| `close --all` | `close --all` | supported | Keeps the Camoucli cleanup behavior for stopping all running sessions. |
| `quit` / `exit` | `quit` / `exit` | adapted | Aliases for current-session close. |
| `tab` / `tab list` | same | adapted | Lists tabs in the resolved session and marks the active tab. |
| `tab new [url]` | `tab new [url]` | adapted | Creates a tracked tab. If no name is supplied, Camoucli generates `tN`. |
| `tab new --label <name> [url]` | same | adapted | Treats the label as the Camoucli tab name. |
| `tab <target>` | same | adapted | Switches the session's active tab by tab name, generated `tN` id, or zero-based index. |
| `tab close [target]` | same | adapted | Closes the target tab, or the active tab when omitted, then selects a deterministic remaining active tab. |
| `click <target> --new-tab [--label <name>]` | same | adapted | Waits for a popup/new page, tracks it as a tab, switches active tab, and returns a structured timeout error if no page opens. |
| `window new [url] [--label <name>]` | same | adapted | Creates a new tracked Playwright page. Firefox/Playwright does not guarantee this is a separate OS window. |

Still deferred from the broader core automation plan: PDF, screenshot annotation, and debug event buffers.

## Stateful Runtime Commands

Stateful runtime commands are coordinated by the daemon so lifetimes are explicit. Downloads, dialogs, and frame context are current-tab state. Viewport and media runtime changes apply to the current tab. Geolocation, offline mode, extra HTTP headers, and HTTP credentials apply to the current session context.

| Agent Browser command | Camoucli command | Status | Notes |
| --- | --- | --- | --- |
| `download <target> <path>` | same | supported | Waits for a download triggered by clicking a selector/ref, creates parent directories, saves relative paths under the session downloads directory, and returns saved path plus browser metadata. |
| `wait --download [path]` | `wait --download [--path <path>]` | adapted | Waits for the next download in the current tab. `--path` saves it through daemon-owned path resolution. Timeouts return structured `timeout_error` failures. |
| `set viewport <width> <height>` | same | supported | Current-tab lifetime. |
| `set geolocation <lat> <lon> [--accuracy <m>]` / `set geo ...` | same | supported | Current-session lifetime. |
| `set offline <true|false>` | same | supported | Current-session lifetime. |
| `set headers <json>` | same | supported | Current-session lifetime. JSON must be an object with string values. |
| `set credentials <origin> <username> <password>` | same | supported | Current-session lifetime; rejects clearly if the underlying Playwright context cannot mutate credentials. |
| `set media --color-scheme <value> --reduced-motion <value>` | same | supported | Current-tab lifetime. At least one media option is required. |
| `frame <selector|ref>` | same | supported | Sets tab-scoped active frame context for later selector/ref actions. |
| `frame main` | same | supported | Clears active frame context. Frame context also clears on navigation, tab close, and session stop. |
| `dialog status` | same | supported | Reports pending tab dialog type, message, default value, and id. |
| `dialog accept [text]` / `dialog dismiss` | same | supported | Resolves the pending tab dialog. `dismiss [text]` rejects because Playwright dismiss does not accept prompt text. |
| `read [url]` | `read [url] [--raw|--outline] [--filter <text>] [--timeout <ms>]` | supported | Performs local DOM reading in the current tab or active frame. If a URL is supplied, Camoucli navigates first; no external reader service is used. |

## Launch Option Compatibility

Launch globals apply when the daemon starts a new persistent Camoufox session. If the named session is already running, Camoucli rejects immutable launch changes with a structured `session_error`; use a different `--session` value or stop the session first.

| Agent Browser launch surface | Camoucli surface | Status | Notes |
| --- | --- | --- | --- |
| headed/headless | `--headless`, `--headed` | adapted | `--headed` is a compatibility alias for `headless=false`; Camoucli remains headed by default unless config/env/CLI says otherwise. |
| proxy | `--proxy <url>` | supported | Existing Camoucli proxy support remains preferred and maps to Playwright persistent-context proxy settings. |
| proxy bypass | `--proxy-bypass <hosts>` | supported | Requires `--proxy` and maps to Playwright proxy `bypass`. |
| extra headers | `--headers <json>` | supported | JSON object with string values; maps to Playwright `extraHTTPHeaders`. |
| user agent | `--user-agent <ua>` | supported | Maps to Playwright `userAgent`. |
| HTTPS errors | `--ignore-https-errors` | supported | Maps to Playwright `ignoreHTTPSErrors`. |
| media preferences | `--color-scheme dark|light|no-preference`, `--reduced-motion reduce|no-preference` | supported | Maps to Playwright context media options at launch. Runtime tab-scoped media mutation is available through `set media`. |
| init scripts | `--init-script <path>` | supported | Can be repeated. Scripts are registered with the context before Camoucli performs the first real navigation. |
| storage state | `--state <path-or-name>` | adapted | For fresh session profiles only. Names resolve under Camoucli's managed state directory as `<name>.json`; explicit paths are passed through as Playwright storage-state JSON. It does not reset or merge into an existing persistent profile. |
| running state merge | `state load <path-or-name>` | adapted | Imports cookies and localStorage into an already-running persistent session. This is a merge operation, not a profile reset. |
| cookie and origin storage | `cookies get/set/clear`, `storage local/session get/set/clear` | supported | Human output redacts cookie and storage values; JSON output preserves full data for automation. |
| portable state files | `state save/list/show/clear/clean/rename` | supported | Managed names resolve under Camoucli's state directory. `state clear --all` removes managed snapshots only and does not remove persistent profiles. |
| direct Node launch | `extraHTTPHeaders`, `userAgent`, `ignoreHTTPSErrors`, `colorScheme`, `reducedMotion`, `initScripts`, `storageState` | supported | Programmatic `Camoufox.launch()` and `launchCamoufox()` expose idiomatic Playwright-style names while preserving Camoucli-native launch fields. |
| executable path, browser engine, CDP/provider, extensions, restore policy | none | unsupported | These remain outside local Camoufox persistent-session scope. Camoucli keeps registry-managed executables and centralized named profiles. |

## Network Route, Request Log, And HAR

Network commands are local Playwright-backed session features. Routes, request buffers, and HAR buffers live only in the running daemon process for the current session. They are not written into browser profiles, state snapshots, or registry files, and they clear when the session stops or the daemon exits.

| Agent Browser command | Camoucli command | Status | Notes |
| --- | --- | --- | --- |
| `network route <url> --abort` | same | supported | Registers a Playwright context route for the current session. Matching requests can be filtered with `--resource-type <type>`; repeat the flag or pass comma-separated values. |
| `network route <url> --body <body>` | same | supported | Fulfills matching requests with the supplied body. Optional `--status <code>` and `--content-type <value>` shape the synthetic response. A route without `--abort` or `--body` is rejected. |
| `network unroute [url]` | same | supported | Removes routes for the current session. With a URL it removes matching route registrations; without one it removes all session routes. |
| `network requests` | same | supported | Lists an in-memory ring buffer of request summaries. Supports `--filter <text>`, `--type <type>`, `--resource-type <type>`, `--method <method>`, `--status <code>`, and `--clear`. |
| `network request <requestId>` | same | supported | Shows one buffered request with request, response, failure, timing, and tab/page metadata. Response bodies are intentionally not captured. |
| `network har start` | same | supported | Starts a fresh in-memory HAR buffer for the session. |
| `network har stop [path]` | same | supported | Writes a HAR 1.2 JSON artifact. Relative paths resolve under `profiles/<session>/artifacts/har/`; omitted paths get a timestamped managed filename. |

CDP Fetch/Network, provider request inspection, persisted network state, and response body capture remain unsupported for this local parity slice.
