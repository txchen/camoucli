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
| `open <url>` | `open <url>` | adapted | Uses the existing daemon-owned current tab. Bare hosts are normalized to `https://`; explicit `http:`, `https:`, `about:`, `data:`, `file:`, `chrome:`, and `chrome-extension:` URLs are preserved. URL-less `open` is deferred. |
| `goto <url>` | `goto <url>` | supported | CLI alias that sends the existing `open` daemon action after URL normalization. Requires a URL. |
| `navigate <url>` | `navigate <url>` | supported | CLI alias that sends the existing `open` daemon action after URL normalization. Requires a URL. |
| `key <key>` | `key <key>` | supported | CLI alias for the existing `press` daemon action. |
| `scrollinto <target>` | `scrollinto <target>` | supported | CLI alias for the existing `scrollintoview` / `scroll.intoView` action. Targets can be selectors or current-tab `@eN` refs. |
| `eval <expression>` | `eval <expression>` | supported | Runs JavaScript in the current tab through the existing daemon eval action. |
| `eval -b <script>` / `eval --base64 <script>` | `eval -b <script>` / `eval --base64 <script>` | supported | Decodes UTF-8 JavaScript in the CLI and rejects invalid base64 before contacting the daemon. |
| `eval --stdin` | `eval --stdin` | supported | Reads JavaScript from stdin in the CLI and sends the existing eval daemon action. |

Later parity slices will add direct Playwright locator/input/get/wait commands, session and tab lifecycle compatibility, launch option compatibility, state/storage/network commands, and debug/artifact commands.
