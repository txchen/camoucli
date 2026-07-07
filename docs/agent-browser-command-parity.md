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

Later parity slices will add session and tab lifecycle compatibility, launch option compatibility, state/storage/network commands, and debug/artifact commands.

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

Still deferred from the broader core automation plan: downloads, `wait --download`, frame context, dialogs, URL-less `open`, `click --new-tab`, `window new`, runtime `set`, local-DOM `read`, PDF, screenshot annotation, and debug event buffers.
