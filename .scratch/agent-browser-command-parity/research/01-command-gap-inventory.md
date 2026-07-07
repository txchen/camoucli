# Command Gap Inventory

Baseline:

- `agent-browser`: `/Users/txchen/code/github/agent-browser` at `ed2e105`.
- Camoucli: this workspace after the Wayfinder map was created.

Primary sources:

- `agent-browser` top-level parser command list: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:74`
- `agent-browser` command parser: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:328`
- `agent-browser` direct/non-daemon command dispatch: `/Users/txchen/code/github/agent-browser/cli/src/main.rs:945`
- `agent-browser` command reference: `/Users/txchen/code/github/agent-browser/skill-data/core/references/commands.md:1`
- Camoucli Commander surface: `src/cli/program.ts:132`
- Camoucli IPC schema: `src/ipc/protocol.ts:8`
- Camoucli daemon router: `src/daemon/router.ts:9`
- Camoucli browser manager implementation: `src/browser/manager.ts:21`

## Inventory Summary

Camoucli currently has a narrow browser-automation CLI with install/version helpers, core navigation, snapshots, basic interactions, simple `get`, simple `wait`, screenshot, eval, cookie file import/export, session/profile/daemon management, and basic named-tab creation/list/close. The authoritative Camoucli command surface is the Commander program plus IPC schema; most missing parity requires new IPC actions and daemon behavior, not just new CLI aliases. See `src/cli/program.ts:152`, `src/ipc/protocol.ts:198`, and `src/daemon/router.ts:9`.

`agent-browser` exposes a much broader surface: local browser actions, CDP/provider flows, page reading, semantic locators, runtime browser settings, network interception/inspection, storage/state/auth, tabs/windows/frames/dialogs, debugging artifacts, React/vitals, batch, MCP, dashboard, plugins, skills, and chat. Its top-level parser list is explicit in `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:74`, while several non-daemon entrypoints bypass normal command parsing in `/Users/txchen/code/github/agent-browser/cli/src/main.rs:945`.

## Already Covered Or Close

- Install/version/admin: Camoucli has `install`, `remove`, `use`, `versions`, `remote-versions`, `presets`, `fingerprint-profiles`, `path`, `version`, and `doctor`. `agent-browser` has `install`, `upgrade`, and `doctor`, but their semantics are not the same: Camoucli manages Camoufox releases; `agent-browser` install/upgrade are its own binary/browser setup flows. Sources: `src/cli/program.ts:152`, `/Users/txchen/code/github/agent-browser/cli/src/main.rs:945`.
- Core navigation: `back`, `forward`, and `reload` exist in both. Camoucli routes them through `BrowserManager` methods over IPC. Sources: `src/cli/program.ts:296`, `src/browser/manager.ts:137`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:404`.
- Basic element actions: Camoucli has `click`, `hover`, `fill`, `type`, `check`, `uncheck`, `select`, `press`, `scroll`, and `scrollintoview`. These map to Playwright locators or page input in `BrowserManager`. Sources: `src/cli/program.ts:337`, `src/browser/manager.ts:185`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:410`.
- Basic snapshot: Camoucli has `snapshot -i`; `agent-browser` has `snapshot` plus extra shaping flags. Sources: `src/cli/program.ts:323`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:854`.
- Basic page reads through `get`: Camoucli has `get url`, `get title`, `get text`, and `get value`. `agent-browser` has these plus more inspection subcommands. Sources: `src/cli/program.ts:473`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:2424`.
- Basic wait: Camoucli supports a selector target, `--text`, `--load`, and `--timeout`. `agent-browser` supports those plus URL/function/download/time-only waits. Sources: `src/cli/program.ts:448`, `src/browser/manager.ts:387`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:667`.
- Basic screenshot: Camoucli can save a screenshot to a supplied path or an artifact path, always full page. `agent-browser` has selector/path disambiguation, `--full`, format, quality, annotation, and screenshot directory controls. Sources: `src/cli/program.ts:435`, `src/browser/manager.ts:315`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:781`.
- Basic eval: Camoucli has `eval <expression>`. `agent-browser` supports plain, base64, and stdin script input. Sources: `src/cli/program.ts:243`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:893`.
- Basic tabs: Camoucli has `tab list`, `tab new [url]`, and `tab close [target]`, with `--tabname` as the named-tab selector on browser commands. `agent-browser` also has active-tab switching, stable tab ids, labels, default `tab` listing, and current-tab close. Sources: `src/cli/program.ts:603`, `src/browser/manager.ts:418`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1479`, `/Users/txchen/code/github/agent-browser/skill-data/core/references/commands.md:196`.
- Session/profile management: Camoucli has running-session list/stop and stored-profile list/inspect/remove. `agent-browser` has `session` helpers and a separate `profiles` command. The concepts overlap but are not one-to-one. Sources: `src/cli/program.ts:511`, `src/browser/manager.ts:32`, `/Users/txchen/code/github/agent-browser/cli/src/main.rs:998`.

## Partial Equivalents And Missing Variants

- `open`: Camoucli requires `open <url>`. `agent-browser open` can launch without navigation, `goto` and `navigate` are aliases, URL schemes include browser/internal schemes, and bare domains get `https://` prepended. Sources: `src/cli/program.ts:287`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:350`.
- `close`: Camoucli `close` requires `--all` and stops all daemon-owned sessions. `agent-browser close`, `quit`, and `exit` close the current browser; `close --all` is handled separately. Sources: `src/cli/program.ts:276`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:935`, `/Users/txchen/code/github/agent-browser/cli/src/main.rs:1035`.
- `click`: Camoucli lacks `--new-tab`. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:410`.
- `type`: Camoucli lacks `--clear` and `--delay`. Sources: `src/ipc/protocol.ts:57`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:439`.
- `select`: Camoucli accepts one value; `agent-browser` accepts multiple option values. Sources: `src/ipc/protocol.ts:73`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:510`.
- `scroll`: Camoucli requires a direction argument at the CLI, defaults daemon amount to 500, and has no selector-scoped scroll. `agent-browser` defaults to down/300 and supports `--selector`. Sources: `src/cli/program.ts:409`, `src/browser/manager.ts:271`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:614`.
- `scrollintoview`: Camoucli lacks the `scrollinto` alias. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:658`.
- `snapshot`: Camoucli lacks compact output, cursor annotation, URL inclusion, max depth, and selector scoping. Sources: `src/ipc/protocol.ts:36`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:854`.
- `wait`: Camoucli lacks `wait <milliseconds>`, `--url`, `--fn`, and `--download`. Sources: `src/ipc/protocol.ts:120`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:667`.
- `screenshot`: Camoucli lacks selector screenshots, non-full-page screenshots, format/quality options, screenshot directory, and annotation. Sources: `src/ipc/protocol.ts:95`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:781`.
- `eval`: Camoucli lacks base64 and stdin input modes; those could be CLI-only input transformations before sending the existing IPC action. Sources: `src/cli/program.ts:243`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:893`.
- `cookies`: Camoucli has `cookies export [path]` and `cookies import <path>` for JSON cookie files. `agent-browser cookies` defaults to get, and also supports `set`, `set --curl`, and `clear`. Sources: `src/cli/program.ts:253`, `src/browser/manager.ts:358`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1317`.
- Global launch/options: Camoucli has Camoufox-specific launch controls such as config/prefs/fingerprint/presets/locales/region/timezone/screen/window/block toggles. `agent-browser` has different global controls such as headed mode, CDP, providers, proxy bypass, headers, executable path, extensions, ignore HTTPS errors, hide scrollbars, action policy, confirmation, engine, screenshot settings, idle timeout, auto-dialog, and plugins. Sources: `src/cli/program.ts:69`, `src/camoufox/config.ts:20`, `/Users/txchen/code/github/agent-browser/cli/src/flags.rs:54`, `/Users/txchen/code/github/agent-browser/skill-data/core/references/commands.md:363`.

## Missing Browser Automation Commands

- Page reading: `read [url]` with markdown/llms/outline/filter/raw/domain/output controls is absent. Sources: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:407`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1956`, `/Users/txchen/code/github/agent-browser/skill-data/core/references/commands.md:14`.
- Additional interactions: `dblclick`, `focus`, `drag`, `upload`, and `download` are absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:425`.
- Keyboard expansion: `key` alias, `keydown`, `keyup`, and `keyboard type|inserttext` are absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:556`.
- More `get`: `get html`, `get attr`, `get count`, `get box`, `get styles`, and `get cdp-url` are absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:2424`.
- State predicates: `is visible`, `is enabled`, and `is checked` are absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:2497`.
- Semantic locators: `find role/text/label/placeholder/alt/title/testid/first/last/nth` with action dispatch are absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:2533`.
- Mouse control: `mouse move`, `mouse down`, `mouse up`, and `mouse wheel` are absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:2697`.
- Runtime settings: `set viewport`, `set device`, `set geo/geolocation`, `set offline`, `set headers`, `set credentials/auth`, and `set media` are absent as runtime commands. Camoucli only has some launch-time equivalents. Sources: `src/camoufox/config.ts:20`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:2749`.
- Windows, frames, and dialogs: `window new`, `frame <selector|main>`, and `dialog accept|dismiss|status` are absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1530`.
- Mobile/provider commands: `tap`, `swipe`, and `device list` are absent. They are parser-supported in `agent-browser` but are tied to iOS/provider semantics. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1859`.

## Missing State, Storage, Network, And Auth Commands

- Web storage: `storage local/session [get|set|clear]` is absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:2982`.
- Saved browser state: `state save/load/list/clear/show/clean/rename` is absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1739`.
- Network: `network route/unroute/requests/request/har` is absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:2885`.
- Auth vault: `auth save/login/list/delete/show` is absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:941`.
- Action confirmation: `confirm` and `deny` are absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1178`.

## Missing Debugging, Artifact, React, And Batch Commands

- Browser/stream/provider: `inspect`, `connect`, and `stream enable|disable|status` are absent. `connect` and some inspect/profiler behavior may be CDP/Chromium-specific and need scope decisions before implementation. Sources: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:938`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1194`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1240`.
- PDF/video/tracing/profiling: `pdf`, `trace start|stop`, `profiler start|stop`, and `record start|stop|restart` are absent. Sources: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:845`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1589`.
- Debug readers/helpers: `console`, `errors`, `highlight`, and `clipboard read|write|copy|paste` are absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1702`.
- Diff: `diff snapshot`, `diff screenshot`, and `diff url` are absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:2151`.
- Batch: `batch [--bail] ...` is absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1905`.
- React/web performance: `react tree|inspect|renders|suspense`, `vitals`/`web-vitals`, and `pushstate` are absent. Sources: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:2083`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1916`.
- Init scripts: `removeinitscript` is parser-supported and absent in Camoucli. The docs also mention `addinitscript`, and native handlers exist, but `commands.rs` does not list or parse `addinitscript` as a top-level CLI command in this baseline; treat `addinitscript` as a source inconsistency for the next decision ticket. Sources: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1941`, `/Users/txchen/code/github/agent-browser/skill-data/core/references/commands.md:419`.

## Missing Integration Surfaces

- MCP server: `mcp` is absent. In `agent-browser`, it is dispatched before normal command parsing and exposes tool profiles for core, network, state, debug, tabs, react, mobile, and all. Sources: `/Users/txchen/code/github/agent-browser/cli/src/main.rs:1019`, `/Users/txchen/code/github/agent-browser/skill-data/core/references/commands.md:323`.
- Dashboard: `dashboard start|stop` is absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/main.rs:970`.
- Plugins: `plugin`/`plugins` registry and run commands are absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/main.rs:1010`.
- Skills: `skills list|get|path` is absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/main.rs:1004`.
- Chat: `chat` is absent. Source: `/Users/txchen/code/github/agent-browser/cli/src/main.rs:1045`.
- `upgrade` is absent as a Camoucli self-upgrade command; Camoucli instead has browser-version management commands. Sources: `src/cli/program.ts:152`, `/Users/txchen/code/github/agent-browser/cli/src/main.rs:952`.

## Suggested Next Decisions

The existing blocked Wayfinder tickets cover the right follow-up decisions; no new ticket is required from this inventory.

- `Decide Parity Scope Boundaries` should first decide whether parity means "local Camoufox-compatible browser automation" or includes `agent-browser` integration systems like MCP/dashboard/plugins/chat.
- `Decide Core Automation Parity` should probably start with low-risk Playwright-native gaps: `dblclick`, `focus`, `key` alias, `keydown`, `keyup`, richer `get`, `is`, semantic `find`, `eval --stdin/-b`, and `wait --url/--fn`.
- `Decide State Storage Network Parity` should handle higher-state features together because cookies, storage, state snapshots, and network routes all affect session/profile lifetime.
- `Decide Debug Artifact Parity` must explicitly separate Firefox/Playwright-portable features from Chromium/CDP-heavy features.
- `Decide Session Tab Launch Parity` should reconcile Camoucli's named-tab model with `agent-browser` active-tab switching and stable tab ids before adding tab labels or aliases.
