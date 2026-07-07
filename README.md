# Camou

Camou is a local-first CLI and background daemon for driving [Camoufox](https://github.com/daijro/camoufox) through Playwright, without depending on the Camoufox Python SDK.

- npm package: `camou`
- installed command: `camou`
- project/repo name: camoucli

Camou is built for agent-style browser workflows:

- keep a browser session alive across separate CLI invocations
- preserve login state with persistent profiles
- operate named tabs in parallel without ref collisions
- interact through stable `@eN` refs from text snapshots
- route requests, inspect an in-memory request log, and capture portable HAR artifacts
- install, switch, and diagnose Camoufox browser versions from the CLI

Camou takes strong inspiration from [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) and [BUNotesAI/agent-browser-session](https://github.com/BUNotesAI/agent-browser-session), but is built for the Camoufox + Playwright Firefox path and persistent local daemon workflows.

See [Agent Browser command parity](docs/agent-browser-command-parity.md) for supported compatibility aliases, adapted commands, and deferred command families.

## Why Camou

| Feature | Why it matters |
| --- | --- |
| Persistent profiles | Login once and reuse the same authenticated browser state later |
| Named sessions | Keep separate workspaces like `work`, `shopping`, or `github` isolated |
| Named tabs | Run multiple agents against the same browser session without fighting over one active page |
| Snapshot refs | Use `@e1`, `@e2`, ... from `snapshot` instead of brittle selectors when driving pages |
| Network controls | Route local Playwright requests, inspect per-session request logs, and write HAR artifacts |
| Version manager | Install and switch Camoufox builds without bundling the browser into the npm package |
| Doctor diagnostics | Check launch compatibility, bundle health, and Linux shared-library issues quickly |

## Install

Requirements:

- Node.js `>=20`
- a supported Camoufox release for your OS

Global install (recommended):

```bash
npm install -g camou
camou install
```

One-off usage with `npx`:

```bash
npx camou install
npx camou open https://example.com
```

From this repo:

```bash
npm install
npm run build
npm run dev -- --help
npm run dev -- skills get core
npm run dev -- skills get core --full
```

Notes:

- Browser download is explicit. Installing the npm package does not download Camoufox.
- `camou install` runs a quick headless launch probe after download.
- `camou use <version>` runs the same compatibility check when you switch versions.
- Agent instructions are available from the installed CLI with `camou skills get core` and `camou skills get core --full`.

## Install The Skill

Camou ships a two-layer agent skill through the open skills ecosystem at [skills.sh](https://skills.sh).

Install the thin discovery stub from this repo:

```bash
npx skills add txchen/camoucli --skill camou
```

Useful variants:

```bash
# Preview available skills in the repo
npx skills add txchen/camoucli --list

# Install globally for a specific agent
npx skills add txchen/camoucli --skill camou -g -a opencode
```

The installed `camou` skill is intentionally small. It points agents at the version-matched runtime guide served by the CLI:

```bash
camou skills get core
camou skills get core --full
npx camou skills get core
npx camou skills get core --full
```

This keeps agent instructions aligned with the installed Camou version. If you previously installed the older static skill, reinstall it so the stub points at `camou skills get core`.

## Quick Start

```bash
camou install                  # Install the default browser build
camou open https://example.com # Open the target page
camou snapshot -i              # Capture interactive refs
# @e1 a "Learn more"
camou click @e1                # Click the chosen ref
camou get title                # Read the current page title
```

What happens behind the scenes:

1. `camou open` auto-starts the local daemon if needed.
2. Camoufox launches with a persistent profile for the default session.
3. `snapshot -i` returns interactive elements with refs like `@e1`.
4. Later commands reuse the same browser session and profile.

Important ref rule:

- Re-run `snapshot` after navigation or major page changes. Refs are per tab and are invalidated on navigation or a new snapshot.

Network example:

```bash
camou network route '**/api/mock' --body '{"ok":true}' --content-type application/json
camou open https://example.com
camou network requests --filter api
camou network har start
camou reload
camou network har stop capture.har
```

Network routes, request logs, and HAR buffers are in-memory daemon/session state. They do not persist into browser profiles or saved state snapshots.

## Project Defaults

If you use Camou inside a coding project, you do not need to repeat `--session` and `--tabname` on every command.

Camou resolves defaults in this order:

1. explicit CLI flags
2. environment variables
3. nearest project config file in the current directory or any parent directory
4. built-in defaults: `session=default`, `tabname=main`

Supported environment variables:

```bash
export CAMOU_SESSION=my-project
export CAMOU_TAB=main
export CAMOU_BROWSER=135.0.1-beta.24
export CAMOU_HEADLESS=true
export CAMOU_PRESET=cache,low-bandwidth
```

Also supported:

- `CAMOU_TABNAME`
- `CAMOU_PRESETS`
- legacy aliases: `CAMOUCLI_SESSION`, `CAMOUCLI_TAB`, `CAMOUCLI_TABNAME`, `CAMOUCLI_BROWSER`, `CAMOUCLI_HEADLESS`, `CAMOUCLI_PRESET`, `CAMOUCLI_PRESETS`

Supported project config file names:

- `.camou.json`
- `camou.json`

Example `.camou.json`:

```json
{
  "session": "my-project",
  "tabname": "main",
  "browser": "135.0.1-beta.24",
  "headless": true,
  "preset": ["cache", "low-bandwidth"]
}
```

Then you can run commands like:

```bash
camou open https://example.com # Open the target page
camou snapshot -i              # Capture interactive refs
camou click @e1                # Click the chosen ref
```

and they automatically use the configured session, tab, browser version, headless mode, and presets unless you override them with flags.

## Use From Node Scripts

Camou can also be used as a Node library, not just a CLI.

There are two programmatic surfaces:

- `Camoufox` launches Camoufox directly and gives you real Playwright `BrowserContext` and `Page` access.
- `CamouClient` talks to the local daemon for command-parity workflows such as named sessions/tabs, `@eN` snapshot refs, state files, network buffers, and artifacts.

Use `Camoufox` when you want standard Playwright control:

```ts
import { Camoufox } from 'camou';

const camou = await Camoufox.launch({
  session: 'script',
  headless: false,
  fingerprint: {
    locales: ['en-US', 'fr-FR'],
    screenProfile: 'desktop-fhd',
    blockImages: true,
  },
});

const page = await camou.open('https://example.com');
console.log(await page.title());

await camou.close();
```

Use `CamouClient` when you want the daemon-owned CLI workflow without shelling out:

```ts
import { CamouClient } from 'camou';

const camou = CamouClient.create({
  session: 'script',
  tabName: 'main',
  headless: false,
});

await camou.open('https://example.com');
const snapshot = await camou.snapshot({ interactive: true });
await camou.click('@e1');
await camou.state.save('logged-in');
await camou.close();
```

`CamouClient` returns structured results and preserves Camoucli error classes. It intentionally omits CLI-only aliases and unsupported compatibility stubs; use canonical methods such as `press()` instead of `key`, `scrollIntoView()` instead of `scrollinto`, and `vitals()` instead of `web-vitals`.

If you prefer a scoped direct-Playwright helper:

```ts
import { Camoufox } from 'camou';

await Camoufox.with({ session: 'script' }, async (camou) => {
  const page = await camou.open('https://example.com');
  console.log(await page.title());
});
```

Useful exported helpers include:

- `Camoufox.launch()`
- `Camoufox.launchContext()`
- `Camoufox.with()`
- `AsyncCamoufox`
- `launchCamoufox()`
- `launchCamoufoxContext()`
- `resolveCamoufoxLaunchSpec()`
- `withCamoufox()`
- `CamouClient`
- `createCamouClient()`
- `withCamouClient()`
- `installCamoufox()`
- `getLogger()`
- `Logger`
- `listInstalledBrowsers()`
- `setCurrentBrowser()`
- `doctorCamoufox()`

Notes:

- install a browser first with `camou install` or `installCamoufox()`
- use a dedicated `session` name in scripts if you do not want to share the default CLI profile
- the returned context is a normal Playwright context, so you can use standard Playwright APIs from there
- use `CamouClient` instead of spawning `camou` repeatedly when a Node script needs daemon state, active tabs, refs, or managed artifacts

Install with logs from Node:

```ts
import { ensureBasePaths, getCamoucliPaths, getLogger, installCamoufox } from 'camou';

const paths = getCamoucliPaths();
await ensureBasePaths(paths);

const logger = getLogger({ name: 'installer', verbose: true });
await installCamoufox(paths, { logger });
```

## Recommended Agent Workflow

For agents and automation loops, this is the happy path:

```bash
camou open https://target.site # Open the target page
camou snapshot -i --json       # Capture JSON refs
camou click @e3                # Act on a chosen ref
camou fill @e5 "hello"       # Fill the next field
camou snapshot -i --json       # Refresh refs after changes
```

Why this works well:

- `snapshot` gives a stable text representation of the page
- refs are deterministic within the current tab snapshot
- `--json` gives machine-readable success and error payloads
- the daemon keeps browser state alive between commands

## Core Concepts

### Session

A session is a named browser workspace selected with `--session <name>`.

- sessions have separate persistent profile directories
- different sessions isolate cookies, storage, downloads, and artifacts
- reuse the same session name to keep login state across runs

Example:

```bash
camou open https://github.com --session work          # Open the work session
camou open https://mail.google.com --session personal # Open a separate personal session
```

### Tab

A tab is a named page binding inside a session selected with `--tabname <name>`.

- tabs in the same session share browser profile state
- tabs keep separate page bindings and separate ref maps
- named tabs make concurrent agent workflows much safer

Example:

```bash
camou open https://reddit.com --session work --tabname reddit       # First named tab
camou open https://news.ycombinator.com --session work --tabname hn # Second named tab
```

### Ref

A ref is a snapshot-generated handle like `@e1` or `@e2`.

- refs come from `camou snapshot` or `camou snapshot -i`
- refs are only valid for the tab that created them
- refs are cleared when the page navigates or you take a new snapshot

### Browser version

Camou keeps an active Camoufox version, but you can also pick a version per command.

- `camou use <version>` changes the active default version
- `camou <command> ... --browser <version>` runs a command against a specific installed version without changing the default

## Common Workflows

### Persistent login session

```bash
camou open https://github.com/login --session work --tabname github   # Start a named session
# log in once in the browser
camou open https://github.com/settings/profile --session work --tabname github # Reuse saved login
```

Use the same `--session` name later and the login state is still there.

### Multi-tab parallel-safe browsing

```bash
camou open https://reddit.com --session research --tabname reddit       # Shared session, first tab
camou open https://news.ycombinator.com --session research --tabname hn # Shared session, second tab

camou snapshot -i --session research --tabname reddit                   # Inspect the reddit tab
camou snapshot -i --session research --tabname hn                       # Inspect the hn tab
```

Both tabs share the same browser profile, but each tab has its own page and ref map.

### Install and switch versions

```bash
camou remote-versions         # Show compatible remote versions
camou install 135.0.1-beta.24 # Install one version
camou install 135.0.1-beta.23 # Install another version
camou versions                # Show installed and active versions
camou use 135.0.1-beta.24     # Switch the default version
camou doctor --json           # Check compatibility in JSON
```

### Use a specific browser version for one session

```bash
camou open https://example.com --session canary --browser 135.0.1-beta.24 # Pin one run
```

### JSON output for automation

```bash
camou snapshot -i --json                        # JSON interactive snapshot
camou get title --json                          # JSON scalar output
camou eval 'document.title' --json              # JSON eval result
camou eval --base64 ZG9jdW1lbnQudGl0bGU= --json # Decode and evaluate JavaScript
printf 'document.title' | camou eval --stdin --json # Read JavaScript from stdin
camou cookies get --json                        # JSON cookie listing, including values
camou state show auth --json                    # JSON Playwright storage-state snapshot
camou doctor --json                             # JSON diagnostics
camou remote-versions --json | jq -r '.remoteVersions[].version' # Extract versions
```

Errors are also structured when `--json` is enabled.

### Daemon lifecycle

```bash
camou daemon stop             # Stop the local daemon process
camou daemon restart          # Restart the daemon after upgrades or cleanup
camou daemon cleanup          # Stop sessions, stop daemon, kill stray Camoufox processes
```

Use `camou daemon restart` after upgrading the CLI if an older background daemon is still running. Use `camou daemon cleanup` when the daemon is gone but orphan Camoufox processes remain.

## Command Reference

For Agent Browser migration details, see [`docs/agent-browser-command-parity.md`](docs/agent-browser-command-parity.md) and [`docs/agent-browser-migration.md`](docs/agent-browser-migration.md).

### Browser management

```bash
camou install [version]    # Install the default or one specific build
camou remove [version]     # Remove an installed browser build
camou use <version>        # Switch the default browser version
camou versions             # List installed versions and the default
camou remote-versions      # List compatible remote versions
camou presets              # Show built-in launch presets
camou version              # Print the active camoucli version
camou path                 # Show the active browser executable path
camou doctor               # Diagnose install and launch issues
```

### Skills

```bash
camou skills                  # Alias for skills list
camou skills list             # List visible packaged skills
camou skills get <name>       # Print one skill
camou skills get <name> --full # Include references and templates
camou skills get --all        # Print every visible skill
camou skills path [name]      # Print searched skill dirs, or one skill dir
```

`CAMOU_SKILLS_DIR` can point at one directory containing skill subdirectories, which is useful for tests and local skill development. `camou skills` does not start the daemon, check browser installs, launch Camoufox, or touch session/browser state.

### Page automation

```bash
camou open <url>                  # Open a URL in the current tab
camou goto <url>                  # Alias for open: navigate the current tab
camou navigate <url>              # Alias for open: navigate the current tab
camou back                        # Go back in the current tab history
camou forward                     # Go forward in the current tab history
camou reload                      # Reload the current page
camou eval <expression>           # Run JavaScript in the current tab
camou eval --base64 <script>      # Decode base64 JavaScript, then run it
camou eval --stdin                # Run JavaScript read from stdin
camou snapshot                    # Capture page state and refs
camou snapshot -i                 # Interactive elements only; recommended
camou click <selectorOrRef>       # Click a selector or @eN ref
camou dblclick <selectorOrRef>    # Double-click a selector or @eN ref
camou hover <selectorOrRef>       # Hover a selector or @eN ref
camou focus <selectorOrRef>       # Focus an element
camou fill <selectorOrRef> <text> # Set an input value directly
camou type <selectorOrRef> <text> # Type text with key events
camou check <selectorOrRef>       # Check a checkbox or radio input
camou uncheck <selectorOrRef>     # Uncheck a checkbox
camou select <selectorOrRef> <value> # Choose a select option
camou press <key>                 # Press a keyboard key in the page
camou key <key>                   # Alias for press
camou keyboard type <text>        # Send page keyboard typing
camou mouse move <x> <y>          # Move the page mouse
camou scroll <direction> [amount] # Scroll up, down, left, or right
camou scrollintoview <selectorOrRef> # Scroll until visible
camou scrollinto <selectorOrRef>  # Alias for scrollintoview
camou upload <selectorOrRef> <files...> # Set files on an input
camou drag <source> <target>      # Drag one selector/ref to another
camou wait [selectorOrRef] [--text <text>] [--load <state>] # Wait for element, text, or load
camou screenshot [path]           # Save a screenshot under artifacts/screenshots by default
camou get url                     # Read the current page URL
camou get title                   # Read the current page title
camou get text <selectorOrRef>    # Read visible text from an element
camou get value <selectorOrRef>   # Read an element's form value
camou find role button --name Save # Use semantic Playwright locator helpers
camou is visible <selectorOrRef>  # Return element predicate booleans
```

### Debug and artifacts

Debug buffers and traces are daemon-owned runtime state. Console events, page errors, network requests, HAR buffers, and traces live only in the running daemon process; they clear when a session stops or the daemon exits.

```bash
camou console [--clear]           # List or clear buffered page console messages
camou errors [--clear]            # List or clear buffered uncaught page errors
camou highlight <selectorOrRef>   # Temporarily outline a target in the page
camou clipboard read              # Read via the browser-page clipboard API
camou clipboard write <text>      # Write via the browser-page clipboard API
camou clipboard copy              # Synthesize the platform copy shortcut
camou clipboard paste             # Synthesize the platform paste shortcut
camou trace start                 # Start Playwright tracing for the session
camou trace stop [path]           # Write a trace zip under artifacts/traces by default
camou diff snapshot --baseline old.txt # Compare a fresh snapshot to a baseline
camou vitals                      # Report browser Performance API vitals
camou pushstate /next             # Run history.pushState in the page
camou addinitscript 'window.x=1'  # Register an init script for future documents
```

Relative artifact paths resolve under per-family directories in `profiles/<session>/artifacts/`: screenshots under `screenshots/`, traces under `traces/`, HARs under `har/`, and future diff/PDF/video artifacts under their own matching directories.

### Sessions and tabs

Use `session` for live daemon state, `profile` for full persistent browser profile directories, and `state` for portable Playwright-compatible storage-state JSON snapshots. `state load` merges cookies and localStorage into a running session; it is not a pristine profile reset.

```bash
camou session list            # List running daemon sessions
camou profile list            # List stored profiles on disk
camou profile inspect <name>  # Show one profile's paths
camou profile remove <name>   # Delete a profile; stops it first if needed
camou cookies                 # List cookies in the default session without values
camou cookies get [url...]    # List cookies, optionally scoped to URLs
camou cookies set sid secret --domain example.com --path / # Set one cookie
camou cookies set --curl cookies.txt # Import JSON array, cURL command, or Cookie header
camou cookies clear           # Clear session cookies
camou cookies export [path]   # Export context cookies as JSON
camou cookies import <path>   # Import cookies into session context
camou storage local get [key] # Read current-origin localStorage
camou storage local set <key> <value> # Set current-origin localStorage
camou storage session clear [key] # Clear current-origin sessionStorage
camou state save auth         # Save portable storage-state to managed auth.json
camou state load auth         # Merge a snapshot into the running session
camou state list              # List managed state snapshots
camou state show auth         # Show snapshot counts; use --json for full data
camou state clear auth        # Remove one managed or explicit snapshot
camou state clear --all       # Remove all managed snapshots, not profiles
camou state clean             # Remove invalid managed snapshot files
camou state rename auth work  # Rename a managed snapshot
camou close --all             # Stop all running sessions
camou daemon stop             # Stop the local daemon process
camou daemon restart          # Restart the local daemon process
camou daemon cleanup          # Stop sessions, stop daemon, kill stray Camoufox processes
camou session stop [name]     # Stop one session or the current session
camou tab list                # List tabs in the current session
camou tab new [url]           # Create a new tab, optionally opening a URL
camou tab close [nameOrIndex] # Close one tab by name or index
camou window new [url]        # Create a new tracked Playwright page
```

### Unsupported and out of scope

Camoucli intentionally stays in local Camoufox/Playwright scope. The following Agent Browser families are not implemented as local daemon workflows:

```bash
camou connect ...             # Unsupported CDP/provider attach migration stub
camou inspect ...             # Unsupported DevTools/CDP inspect migration stub
camou profiler ...            # Unsupported CDP profiler migration stub
camou pdf ...                 # Unsupported until real Camoufox smoke coverage proves support
```

Hidden migration flags such as `--cdp`, `--provider`, `--executable-path`, `--engine`, `--extension`, and `--restore-policy` also return structured `unsupported_command` errors. Remote-provider control, auth vaults, MCP, dashboards, chat, plugin/skill management, and self-upgrade commands are out of scope for Camoucli's local browser daemon.

## Common Flags

Most browser commands support:

- `--session <name>`
- `--tabname <name>`
- `--headless`
- `--browser <version>`
- `--config <path>`
- `--config-json <json>`
- `--prefs <path>`
- `--prefs-json <json>`
- `--fingerprint <path>`
- `--fingerprint-json <json>`
- `--preset <name>`
- `--proxy <url>`
- `--locale <locale>`
- `--locales <locale[,locale...]>`
- `--region <code>`
- `--timezone <timezone>`
- `--screen-profile <name>`
- `--window-profile <name>`
- `--block-images`
- `--block-webrtc`
- `--block-webgl`
- `--disable-coop`
- `--width <px>`
- `--height <px>`
- `--json`
- `--verbose`

`wait` also supports:

- `--text <text>`
- `--load <domcontentloaded|load|networkidle>`

## Presets

Built-in presets give you a small layer of tested ergonomics on top of raw config and prefs JSON.

| Preset | What it does |
| --- | --- |
| `default` | Baseline launch with no extra overrides |
| `cache` | Enables the Firefox cache/session prefs used by the Python library |
| `low-bandwidth` | Blocks images and speculative requests for lighter automation sessions |
| `disable-coop` | Relaxes Cross-Origin-Opener-Policy isolation for troublesome embedded flows |

List them:

```bash
camou presets
```

List built-in fingerprint profiles:

```bash
camou fingerprint-profiles
```

Apply one or more:

```bash
camou open https://example.com --preset cache --preset low-bandwidth
```

## Fingerprint Helpers

Camou now includes a higher-level helper layer for common Camoufox identity settings without forcing you to handcraft raw config keys.

CLI shortcuts:

```bash
camou open https://example.com \
  --locales en-US,fr-FR \
  --region US \
  --screen-profile desktop-fhd \
  --window-profile desktop \
  --block-images
```

You can also pass a helper JSON object:

```bash
camou open https://example.com --fingerprint-json '{"screenProfile":"retina-mac","locales":["en-US","en"],"blockWebRtc":true}'
```

Node API example:

```ts
import { Camoufox } from 'camou';

const camou = await Camoufox.launch({
  fingerprint: {
    region: 'CA',
    locales: ['en-CA', 'fr-CA'],
    screenProfile: 'desktop-fhd',
    windowProfile: 'desktop',
    blockImages: true,
  },
});
```

Supported helper fields include:

- `locales` to keep `navigator.language`, `navigator.languages`, and `Accept-Language` aligned
- `region` to apply a curated locale, timezone, and geolocation bundle for a target country or territory
- `screenProfile` / `windowProfile` for curated screen and window templates
- `screen` / `window` in the Node API for direct helper objects
- `blockImages`, `blockWebRtc`, `blockWebGl`, and `disableCoop` as Python-style toggle helpers
- `fonts` and `fontSpacingSeed` in the Node API for higher-level font config

Current region helpers seed representative locale, timezone, and geolocation values for supported regions. Direct IP-based GeoIP lookup is not bundled yet.

Built-in screen profiles:

- `laptop-hd`
- `desktop-fhd`
- `desktop-qhd`
- `retina-mac`

Built-in window profiles:

- `laptop`
- `desktop`
- `desktop-large`
- `retina`

## Doctor And Troubleshooting

`camou doctor --json` reports:

- installed Camoufox versions
- which version is active
- whether each version can launch with the current `playwright-core`
- bundle file checks
- Linux shared-library diagnostics
- remediation hints

Useful commands:

```bash
camou versions
camou use 135.0.1-beta.24
camou doctor --json
```

Common fixes:

- `Browser.setContrast is not supported`
  - the selected Camoufox build is older than the bundled Playwright runtime
  - switch to a newer browser version with `camou use <version>`
- profile/session locked
  - another browser process is using that session profile
  - stop the other browser or use a different `--session`
- executable missing or damaged
  - reinstall with `camou install --force`
- Linux launch failures
  - run `camou doctor --json` and install the missing shared libraries it reports

## Current Compatibility

Current local verification with `playwright-core` `1.51.1`:

| Camoufox | Status | Notes |
| --- | --- | --- |
| `135.0.1-beta.24` | launches | smoke-tested successfully |
| `135.0.1-beta.23` | incompatible | `Browser.setContrast` is not supported |

The repo now also includes:

- Linux/macOS CI in `.github/workflows/ci.yml`
- a workflow-driven compatibility probe in `.github/workflows/compatibility-matrix.yml`
- local scripts to generate compatibility reports and markdown summaries

See `docs/compatibility-matrix.md` for the workflow and local tooling.

## Storage Layout

Camou keeps its own runtime state and profiles, but stores browser binaries in the shared Camoufox cache layout when possible.

- session data lives under `profiles/<session>/{user-data,downloads,artifacts}`
- daemon state and logs live under platform runtime/state directories
- Camoufox binaries live in the shared cache used by the Python library:
  - Linux: `~/.cache/camoufox/browsers/official/<version>/`
  - macOS: `~/Library/Caches/camoufox/browsers/official/<version>/`
  - Windows: `%LOCALAPPDATA%\camoufox\Cache\browsers\official\<version>\`

This lets Camou reuse compatible Camoufox installs from the Python ecosystem and vice versa.

## Development

```bash
npm install
npm run build
npm test
```

Optional targeted integration suite:

```bash
npm run test:integration
```

Local development commands:

```bash
npm run dev -- --help
npm run dev -- skills list
npm run dev -- skills get core
npm run dev -- skills get core --full
npm run dev:daemon
```

Compatibility tooling:

```bash
# produce a raw compatibility report JSON
node scripts/run-compatibility-report.mjs --output compatibility-report.json

# turn one or more reports into a markdown table
node scripts/generate-compatibility-matrix.mjs compatibility-report.json
```

## Acknowledgements

Camou learned a lot from these projects:

- [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) for the agent-oriented command workflow and skill ecosystem patterns
- [BUNotesAI/agent-browser-session](https://github.com/BUNotesAI/agent-browser-session) for persistent-session and named-tab ergonomics
