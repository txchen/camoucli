# Session Tab Launch Parity Decision

Baseline:

- `agent-browser`: `/Users/txchen/code/github/agent-browser` at `ed2e105`.
- Camoucli: this workspace after `Decide Debug Artifact Parity`.

Primary sources:

- Scope boundary: `.scratch/agent-browser-command-parity/issues/02-decide-parity-scope-boundaries.md:13`
- Command inventory: `.scratch/agent-browser-command-parity/research/01-command-gap-inventory.md:1`
- Core automation deferrals for launch-only `open`, `click --new-tab`, `window`, frames, dialogs, downloads, runtime `set`, and `read`: `.scratch/agent-browser-command-parity/research/03-core-automation-parity.md:77`
- State/debug deferrals for launch-time `--state`, HAR, video, and init scripts: `.scratch/agent-browser-command-parity/research/04-state-storage-network-parity.md:167`, `.scratch/agent-browser-command-parity/research/05-debug-artifact-parity.md:135`
- Camoucli current CLI globals and commands: `src/cli/program.ts:61`, `src/cli/program.ts:287`, `src/cli/program.ts:511`, `src/cli/program.ts:603`
- Camoucli current IPC shape: `src/ipc/protocol.ts:8`
- Camoucli current defaults and compatibility behavior: `src/cli/defaults.ts:1`, `src/cli/defaults.ts:391`
- Camoucli current daemon routing and runtime: `src/daemon/router.ts:9`, `src/browser/manager.ts:21`, `src/browser/tabs.ts:1`
- Camoucli launch config and persistent Firefox launch: `src/camoufox/config.ts:20`, `src/camoufox/config.ts:241`, `src/camoufox/launcher.ts:71`
- Camoucli paths and profile layout: `src/state/paths.ts:13`, `src/state/paths.ts:139`
- `agent-browser` command reference for navigation/tabs/globals: `/Users/txchen/code/github/agent-browser/skill-data/core/references/commands.md:1`, `/Users/txchen/code/github/agent-browser/skill-data/core/references/commands.md:196`, `/Users/txchen/code/github/agent-browser/skill-data/core/references/commands.md:363`
- `agent-browser` parser for launch/open/tab/window/frame/dialog: `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:350`, `/Users/txchen/code/github/agent-browser/cli/src/commands.rs:1479`
- `agent-browser` session helpers, close-all handling, and launch-option dispatch: `/Users/txchen/code/github/agent-browser/cli/src/main.rs:420`, `/Users/txchen/code/github/agent-browser/cli/src/main.rs:581`, `/Users/txchen/code/github/agent-browser/cli/src/main.rs:790`, `/Users/txchen/code/github/agent-browser/cli/src/main.rs:1110`
- `agent-browser` global flags/config/env: `/Users/txchen/code/github/agent-browser/cli/src/flags.rs:54`, `/Users/txchen/code/github/agent-browser/cli/src/flags.rs:620`
- Playwright persistent context options: `node_modules/playwright-core/types/types.d.ts:14714`, `node_modules/playwright-core/types/types.d.ts:14856`, `node_modules/playwright-core/types/types.d.ts:14874`, `node_modules/playwright-core/types/types.d.ts:14940`, `node_modules/playwright-core/types/types.d.ts:14971`, `node_modules/playwright-core/types/types.d.ts:15014`, `node_modules/playwright-core/types/types.d.ts:15043`, `node_modules/playwright-core/types/types.d.ts:15085`, `node_modules/playwright-core/types/types.d.ts:15176`

## Decision

Camoucli should adapt Agent Browser's session, tab, and launch ergonomics where they fit a local Camoufox persistent-context daemon:

- Add current-session helpers: `session`, `session id`, `session info`, and keep `session list`/`session stop`.
- Change `close` into current-session close, keep `close --all`, and add `quit`/`exit` aliases for current-session close.
- Accept launch-only `open` with no URL; keep `goto`/`navigate` as URL-required navigation aliases.
- Add active-tab behavior while preserving existing `--tabname` workflows.
- Add tab labels through Camoucli's existing tab names, not a separate label system.
- Add popup/new-tab tracking for `click --new-tab`.
- Treat `window new` as "new top-level page" only, not a guaranteed operating-system window.
- Add Camoufox-safe launch globals that map to Playwright persistent context options or existing Camoufox config.
- Exclude Agent Browser's CDP/provider connection modes and restore-vault policies from this local parity plan.

The central adaptation is that Camoucli has one long-lived local daemon that owns multiple persistent Camoufox sessions, while Agent Browser is organized around per-session daemons and CDP/provider launch modes. Camoucli should keep its local daemon, registry-managed Camoufox executable, centralized profile paths, project defaults, and `--session`/`--tabname` compatibility.

## Sessions

Adopt:

- `session`
- `session id [--scope worktree|cwd|git-root] [--prefix <text>]`
- `session info`
- `session list`

Keep:

- `session stop [name]`
- `profile list|inspect|remove`
- `daemon stop|restart|cleanup`

Semantics:

- `session` with no subcommand prints the resolved current session name, matching Agent Browser's convenience behavior.
- `session id` is a CLI-local helper that hashes a filesystem scope into a stable session name. Default scope should be `worktree`: Git root when available, otherwise current working directory. `cwd` and `git-root` should also be accepted. `--prefix` is sanitized with the same rules as session/profile names.
- `session info` returns the current session, daemon status, profile paths, browser version, launch config summary, active tab, tabs, and stored profile path. It should work when the session is not running by reporting `active: false` plus the expected profile path if known.
- `session list` remains the running-session list. Do not make it list stored profiles; `profile list` already owns stored profile inventory.
- Keep `session stop [name]` as a Camoucli extension. It is clearer than overloading `close` for scripts that manage named sessions directly.

Implementation notes:

- `session id` can run without starting the daemon.
- `session info` can ask the daemon for runtime state when running and fall back to local profile inspection when not.
- Existing environment/config resolution should remain: CLI option, `CAMOU_SESSION`/`CAMOUCLI_SESSION`, `.camou.json`/`camou.json`, then `default`.
- If Agent Browser env aliases are added for migration, make them lower priority than Camoucli names and document them as compatibility aliases only.

## Close

Adopt:

- `close`
- `close --all`
- `quit`
- `exit`

Semantics:

- `close` stops the resolved current Camoucli session, not every session and not the daemon process.
- `quit` and `exit` are aliases for `close`.
- `close --all` keeps the current Camoucli behavior of stopping all daemon-owned sessions.
- `daemon stop` remains the command for stopping the daemon process itself.
- If the target current session is not running, return `{ stopped: false, sessionName }` as a successful no-op unless the caller explicitly asks for strict behavior later.

This removes the current mismatch where `camou close` requires `--all`, while preserving existing `close --all` automation.

## Launch-Only Open And Navigation

Adopt:

- `open [url]`
- `goto <url>`
- `navigate <url>`

Semantics:

- `open` with no URL ensures the resolved session and tab exist and leaves the tab at `about:blank`. This supports pre-navigation setup for routes, cookies, storage, init scripts, and tracing.
- `open <url>` launches if needed and navigates the resolved tab.
- `goto` and `navigate` are aliases for navigation and must require a URL.
- Apply the URL normalization already accepted in `Decide Core Automation Parity`: preserve known schemes and prepend `https://` to bare hosts.
- Return `{ sessionName, tabName, url, title }` for both launch-only and navigation forms.

IPC shape:

- Prefer an explicit `launch` or `tab.ensure` action for URL-less `open` instead of making `open.url` nullable if that keeps validation clearer.
- The daemon must own the launch. The CLI should not create pages or inspect browser state directly.

## Tabs

Adopt:

- `tab` as an alias for `tab list`
- `tab list`
- `tab new [url]`
- `tab new --label <name> [url]`
- `tab <name-or-id>`
- `tab close [name-or-id]`

Preserve:

- `--tabname <name>` on browser commands.
- `CAMOU_TAB`, `CAMOU_TABNAME`, `CAMOUCLI_TAB`, `CAMOUCLI_TABNAME`, and project defaults.
- Existing named-tab behavior for commands that explicitly pass `--tabname`.

Recommended model:

- Add `activeTabName` to `SessionRuntime`.
- Add a stable generated `tabId` field such as `t1`, `t2`, ... if Agent Browser-style ids are worth supporting, but keep `tabName` as Camoucli's primary public label.
- Treat `--label <name>` on `tab new` as an alias for Camoucli's `--tabname <name>`.
- When `tab new` receives neither `--label` nor `--tabname`, generate a stable name such as `t2`. The initial tab can remain `main` for compatibility, but `tab list` may also show `tabId: t1`.
- `tab <target>` switches the session's active tab and returns that tab's metadata.
- Browser commands should use this precedence for selecting a tab:
  1. explicit `--tabname`
  2. env/project default tab
  3. daemon active tab
  4. `main`
- If a project default tab is configured, it should continue to override active-tab switching. This preserves deterministic existing workflows.
- `tab close` with no target closes the active tab; if no active tab is known, close the resolved default tab.
- Closing the active tab should choose a deterministic new active tab, preferably the most recently created remaining tab or `main` if present.
- Keep zero-based numeric close targets as a legacy compatibility path, but prefer names/ids in help text. If `tabId` support is added, parse `t2` before treating a target as a numeric index.

Rationale:

Agent Browser has one active tab and stable `tN` ids; Camoucli already has explicit named tabs. The least disruptive adaptation is to add active-tab convenience while preserving explicit tab names. Scripts that currently use `--tabname docs` should keep working exactly the same.

## New Tabs From Clicks

Adopt `click <target> --new-tab`.

Semantics:

- Use Playwright popup/page waiting around the click.
- Track the new page in the same Camoucli session.
- Assign a generated tab name if no label option is introduced. If adding a Camoucli extension is acceptable, support `click <target> --new-tab --label <name>` for deterministic automation.
- Switch `activeTabName` to the new tab after successful popup creation.
- Return old tab, new tab name/id, URL, and title.
- If no new page opens before timeout, return a structured timeout error instead of silently treating it as a normal click.

This belongs with session/tab parity because the hard part is tab tracking and naming, not the click itself.

## Windows

Adapt `window new [url] [--label <name>]` as a new top-level page, not a true OS-level browser window.

Semantics:

- Implement through `browserContext.newPage()` and the same tab tracking path as `tab new`.
- Return a field such as `{ window: false, page: true }` or a warning in human output making clear that Playwright Firefox does not guarantee a separate OS window here.
- If future Playwright/Camoufox support exposes reliable separate-window creation, this can be revisited.

Do not promise Agent Browser's Chrome window semantics on Camoufox Firefox.

## Connect, CDP, Providers, And Auto-Connect

Exclude from local Camoufox parity:

- `connect <port>`
- `--cdp <port-or-url>`
- `--auto-connect`
- `-p|--provider <name>`
- provider/plugin browser launch mutation

Rationale:

- These are CDP/provider surfaces. `Decide Parity Scope Boundaries` ruled those out.
- Camoucli's architecture launches an installed Camoufox binary via Playwright persistent context. Attaching to an arbitrary Chrome/CDP browser would bypass the Camoufox registry, launch config, profile paths, and daemon-owned state model.
- A future separate project could add a Playwright `connect` mode, but it should not be called Agent Browser CDP parity.

If compatibility requires accepting `connect` syntax, return an explicit unsupported error that names the local Camoufox scope boundary.

## Profiles, Restore, And State At Launch

Keep Camoucli's model:

- `--session <name>` chooses the persistent Firefox profile under `profiles/<session>/user-data`.
- `profile list|inspect|remove` manages full persistent profile directories.
- `state save/load/...` manages portable Playwright storage-state snapshots, as decided in `Decide State Storage Network Parity`.

Do not adopt Agent Browser restore policy flags:

- `--restore`
- `--session-name`
- `--restore-save`
- `--restore-check-url`
- `--restore-check-text`
- `--restore-check-fn`

Rationale:

- Camoucli's persistent session profile already restores browser data by session name.
- Agent Browser restore policies are layered around its own saved state and validation flow. Copying those flags would blur full profiles, portable state snapshots, and runtime session names.

Adopt launch-time `--state <path-or-name>` with Camoucli semantics:

- When starting a new session, load a portable storage-state snapshot before first navigation.
- Resolve managed names through the state snapshot directory proposed in `Decide State Storage Network Parity`; explicit paths remain allowed.
- If the session is already running, reject launch-time `--state` as a launch compatibility error. Users can use `state load <path>` for merge/import behavior in a running session.
- Document that `--state` does not reset a persistent Firefox profile. For pristine state, use a fresh `--session` or remove the profile.

Do not add arbitrary `--profile <path>` launch. Camoucli profiles are centralized and named by session to keep cleanup, inspection, and compatibility checks tractable.

## Launch Options To Adopt

Adopt these launch globals because they map to Playwright persistent context options or existing Camoucli launch config:

- `--headed`: alias for `--headless false`. Camoucli already defaults to headed; this is a compatibility/no-op unless a config/env default requested headless.
- Existing `--headless`: keep as Camoucli's direct headless flag.
- `--proxy <url>`: already exists; extend to support credentials robustly if needed.
- `--proxy-bypass <hosts>`: add and pass to Playwright proxy `bypass`.
- `--headers <json>`: add as launch-time `extraHTTPHeaders` for future requests in the session context.
- `--user-agent <ua>`: add as launch-time Playwright `userAgent`, with compatibility checks against existing sessions.
- `--ignore-https-errors`: add as Playwright `ignoreHTTPSErrors`.
- `--color-scheme <dark|light|no-preference>`: add as Playwright `colorScheme`; runtime `set media` remains accepted separately.
- `--reduced-motion <reduce|no-preference>` or `set media ... reduced-motion`: optional, but if added, map to Playwright `reducedMotion`.
- `--init-script <path>`: add launch-time init script path support. The daemon should read/register scripts and call `browserContext.addInitScript` before the first real navigation.
- `--record-video [dir]`: add later as launch-time video support, not mid-session `record`. Default to `profiles/<session>/artifacts/videos` when no dir is supplied.
- `--record-har <path>` or an equivalent launch/debug option: optional later for full Playwright `recordHar`; keep separate from the in-memory `network har start|stop` feature.

Keep and prefer Camoucli-native launch globals:

- `--browser <version>` for installed Camoufox selection.
- `--config`, `--config-json`, `--prefs`, `--prefs-json`.
- `--fingerprint`, `--fingerprint-json`, `--preset`.
- `--locale`, `--locales`, `--region`, `--timezone`.
- `--screen-profile`, `--window-profile`, `--width`, `--height`.
- `--block-images`, `--block-webrtc`, `--block-webgl`, `--disable-coop`.

Do not adopt these Agent Browser globals in the local Camoufox parity surface:

- `--executable-path`: Camoucli should use the installed Camoufox registry path from `camou install/use` to preserve compatibility with Python-style Camoufox cache layout.
- `--extension`: Agent Browser's extension flow is Chrome-oriented. Firefox/Camoufox extension loading through Playwright persistent context is not portable enough to promise without a separate smoke-tested design.
- `--hide-scrollbars`: Agent Browser uses it for headless Chromium screenshot consistency. Do not expose it unless Camoucli implements a real Firefox-compatible screenshot styling feature.
- `--engine`: Camoucli is Camoufox/Firefox for this parity effort. Browser engine switching is out of scope.
- `--allowed-domains`, `--content-boundaries`, `--max-output`: these belong to Agent Browser's `read`/policy layer. Only add them if the later local `read` implementation needs them with Camoucli semantics.
- `--action-policy`, `--confirm-actions`, `--confirm-interactive`: Agent Browser action approval policy is outside the selected local CLI parity scope.
- `--model`: chat/integration surface, out of scope.
- `--namespace`, `--idle-timeout`: daemon orchestration details from Agent Browser; keep Camoucli daemon controls separate unless a Camoucli need emerges.

## Global Output And Config

Keep:

- `--json`
- `--verbose`
- `.camou.json` / `camou.json` project defaults
- `CAMOU_*` and `CAMOUCLI_*` environment variables

Optional compatibility additions:

- `--quiet` can be added as an output-layer flag if useful, but it is not required for browser automation parity.
- Selected `AGENT_BROWSER_*` environment aliases can be accepted only as lower-priority migration aliases. Do not let them override explicit Camoucli flags or existing `CAMOU_*` values.

Do not adopt `agent-browser.json` or `AGENT_BROWSER_CONFIG` as primary config names. Camoucli already uses `--config` for Camoufox config files, so reusing it for Agent Browser-style CLI defaults would conflict with existing behavior.

## Compatibility Rules

Launch-affecting options are immutable once a session is running unless a separate runtime command explicitly changes them.

Extend `BrowserManager.assertSessionCompatible` for newly accepted launch inputs:

- `proxy` and `proxyBypass`
- `extraHTTPHeaders`
- `userAgent`
- `ignoreHTTPSErrors`
- `colorScheme`
- `reducedMotion`
- `storageState`
- `initScripts`
- `recordVideo`
- `recordHar`

If a running session receives a different launch-only option, return a clear error instructing the user to stop the session or choose a different `--session`.

Runtime commands remain separate:

- `set headers` can mutate extra headers for future requests in a running session.
- `set credentials`, `set offline`, `set media`, and geolocation changes use Playwright context/page APIs and should not be represented as launch-only compatibility changes.

## Implementation Shape

CLI/API:

- Extend `SharedOptions` with accepted launch globals: `headed`, `proxyBypass`, `headers`, `userAgent`, `ignoreHttpsErrors`, `colorScheme`, `reducedMotion`, `initScript`, `state`, `recordVideo`, and optional `recordHar`.
- Keep `--tabname`; add `--label` only on tab/window/new-tab commands as an alias into tab name.
- Add `open [url]`, `goto <url>`, `navigate <url>`, `close`, `quit`, `exit`, `session`, `session id`, `session info`, `tab`, `tab <target>`, and `window new`.

IPC:

- Add typed actions:
  - `launch` or `tab.ensure`
  - `session.info`
  - `tab.switch`
  - `window.new`
  - `click` with `newTab` and optional `newTabName`
- Make browser-action tab selection support optional `tabName` if the active-tab model is adopted. The daemon should resolve omitted tab names to active tab or `main`.
- Keep typed schemas; do not send generic launch blobs.

Runtime:

- Extend `SessionRuntime` with `activeTabName`, `nextTabId`, and launch-state fields for new immutable options.
- Extend `TabRuntime` with optional `tabId` if Agent Browser-style ids are supported.
- Centralize tab target resolution so names, optional ids, and legacy numeric indices all go through one helper.
- Update `trackPage` to set active tab when appropriate and to choose a new active tab on close.
- Add popup tracking for `click --new-tab`.
- Add artifact subdirectories for launch-time video/HAR if those options are implemented.

Tests:

- Unit-test CLI parsing/default resolution for `open` without URL, `goto`, `navigate`, `--headed`, launch globals, `session id`, `close`, `close --all`, tab labels, tab switch, and window alias behavior.
- Unit-test IPC schema validation for new typed actions.
- Use fake Playwright context tests for active tab selection, tab close fallback, popup tracking, launch compatibility errors, and launch option mapping.
- Add real Camoufox smoke tests later for launch-time init scripts, storage state before first navigation, ignore HTTPS errors, user agent, video, and HAR. These should not block the planning ticket.

## Defer Or Exclude

- Exclude CDP `connect`, `--cdp`, provider launch, auto-connect, stream/dashboard/plugin browser providers, and arbitrary executable paths.
- Exclude Agent Browser restore-save/check policy flags; Camoucli profiles and state snapshots cover this area with different semantics.
- Defer true OS-window support unless Playwright/Camoufox exposes a reliable primitive.
- Defer Firefox extension support until separately designed and smoke-tested.
- Defer launch-time video/HAR to a debug/artifact implementation slice, but define them as launch-time options now so mid-session `record` does not become the default design.
