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
- install, switch, and diagnose Camoufox browser versions from the CLI

Camou takes strong inspiration from [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) and [BUNotesAI/agent-browser-session](https://github.com/BUNotesAI/agent-browser-session), but is built for the Camoufox + Playwright Firefox path and persistent local daemon workflows.

## Why Camou

| Feature | Why it matters |
| --- | --- |
| Persistent profiles | Login once and reuse the same authenticated browser state later |
| Named sessions | Keep separate workspaces like `work`, `shopping`, or `github` isolated |
| Named tabs | Run multiple agents against the same browser session without fighting over one active page |
| Snapshot refs | Use `@e1`, `@e2`, ... from `snapshot` instead of brittle selectors when driving pages |
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
```

Notes:

- Browser download is explicit. Installing the npm package does not download Camoufox.
- `camou install` runs a quick headless launch probe after download.
- `camou use <version>` runs the same compatibility check when you switch versions.

## Install The Skill

Camou also ships an agent skill that can be installed through the open skills ecosystem at [skills.sh](https://skills.sh).

Install it from this repo:

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

The skill teaches agents the recommended Camou workflow: `open -> snapshot -i -> interact with @refs -> re-snapshot`, plus session/tab/version troubleshooting guidance.

## Quick Start

```bash
camou install
camou open https://example.com
camou snapshot -i
# @e1 a "Learn more"
camou click @e1
camou get title
```

What happens behind the scenes:

1. `camou open` auto-starts the local daemon if needed.
2. Camoufox launches with a persistent profile for the default session.
3. `snapshot -i` returns interactive elements with refs like `@e1`.
4. Later commands reuse the same browser session and profile.

Important ref rule:

- Re-run `snapshot` after navigation or major page changes. Refs are per tab and are invalidated on navigation or a new snapshot.

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
camou open https://example.com
camou snapshot -i
camou click @e1
```

and they automatically use the configured session, tab, browser version, headless mode, and presets unless you override them with flags.

## Use From Node Scripts

Camou can also be used as a Node library, not just a CLI.

The programmatic API is Playwright-based: it launches Camoufox for you and gives you a real Playwright `BrowserContext`, similar in spirit to the Camoufox Python wrapper.

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

If you prefer a scoped helper:

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
- `installCamoufox()`
- `listInstalledBrowsers()`
- `setCurrentBrowser()`
- `doctorCamoufox()`

Notes:

- install a browser first with `camou install` or `installCamoufox()`
- use a dedicated `session` name in scripts if you do not want to share the default CLI profile
- the returned context is a normal Playwright context, so you can use standard Playwright APIs from there

## Recommended Agent Workflow

For agents and automation loops, this is the happy path:

```bash
camou open https://target.site
camou snapshot -i --json
camou click @e3
camou fill @e5 "hello"
camou snapshot -i --json
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
camou open https://github.com --session work
camou open https://mail.google.com --session personal
```

### Tab

A tab is a named page binding inside a session selected with `--tabname <name>`.

- tabs in the same session share browser profile state
- tabs keep separate page bindings and separate ref maps
- named tabs make concurrent agent workflows much safer

Example:

```bash
camou open https://reddit.com --session work --tabname reddit
camou open https://news.ycombinator.com --session work --tabname hn
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
camou open https://github.com/login --session work --tabname github
# log in once in the browser
camou open https://github.com/settings/profile --session work --tabname github
```

Use the same `--session` name later and the login state is still there.

### Multi-tab parallel-safe browsing

```bash
camou open https://reddit.com --session research --tabname reddit
camou open https://news.ycombinator.com --session research --tabname hn

camou snapshot -i --session research --tabname reddit
camou snapshot -i --session research --tabname hn
```

Both tabs share the same browser profile, but each tab has its own page and ref map.

### Install and switch versions

```bash
camou install 135.0.1-beta.24
camou install 135.0.1-beta.23
camou versions
camou use 135.0.1-beta.24
camou doctor --json
```

### Use a specific browser version for one session

```bash
camou open https://example.com --session canary --browser 135.0.1-beta.24
```

### JSON output for automation

```bash
camou snapshot -i --json
camou get title --json
camou doctor --json
```

Errors are also structured when `--json` is enabled.

## Command Reference

### Browser management

```bash
camou install [version]
camou remove [version]
camou use <version>
camou versions
camou presets
camou version
camou path
camou doctor
```

### Page automation

```bash
camou open <url>
camou back
camou forward
camou reload
camou snapshot [-i]
camou click <selectorOrRef>
camou hover <selectorOrRef>
camou fill <selectorOrRef> <text>
camou type <selectorOrRef> <text>
camou check <selectorOrRef>
camou uncheck <selectorOrRef>
camou select <selectorOrRef> <value>
camou press <key>
camou scroll <direction> [amount]
camou scrollintoview <selectorOrRef>
camou wait [selectorOrRef] [--text <text>] [--load <state>]
camou screenshot [path]
camou get url
camou get title
camou get text <selectorOrRef>
camou get value <selectorOrRef>
```

### Sessions and tabs

```bash
camou session list
camou session stop [name]
camou tab list
camou tab new [url]
camou tab close [nameOrIndex]
```

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
    locales: ['en-US', 'fr-FR'],
    screenProfile: 'desktop-fhd',
    windowProfile: 'desktop',
    blockImages: true,
  },
});
```

Supported helper fields include:

- `locales` to keep `navigator.language`, `navigator.languages`, and `Accept-Language` aligned
- `screenProfile` / `windowProfile` for curated screen and window templates
- `screen` / `window` in the Node API for direct helper objects
- `blockImages`, `blockWebRtc`, `blockWebGl`, and `disableCoop` as Python-style toggle helpers
- `fonts` and `fontSpacingSeed` in the Node API for higher-level font config

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
