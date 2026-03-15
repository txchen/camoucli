# Camoucli

Camoucli is a Node.js-first CLI and local daemon for driving Camoufox through Playwright.

It is built for local agent-style workflows:

- keep a browser session alive across CLI invocations
- preserve login state with persistent profiles
- target named tabs and sessions
- work with stable `@eN` refs from text snapshots
- install and switch Camoufox versions without the Python SDK

## Requirements

- Node.js `>=20`
- a supported OS for Camoufox releases

## Install

```bash
npm install
npm run build
```

For local development:

```bash
npm run dev -- --help
npm run dev:daemon
```

## Quick Start

Install a browser build:

```bash
npm run dev -- install
```

`install` runs a quick launch probe after download so it can warn if the installed browser does not work with the current `playwright-core` version.
`use` runs the same check when you switch versions.

Open a page and capture refs:

```bash
npm run dev -- open https://example.com
npm run dev -- snapshot -i
```

Use refs in later commands:

```bash
npm run dev -- click @e1
npm run dev -- fill @e2 "hello"
npm run dev -- get title
```

The daemon auto-starts on demand, so later commands reuse the same session and profile.

## What Works Today

### Browser management

- `camoucli install [version]`
- `camoucli remove [version]`
- `camoucli use <version>`
- `camoucli versions`
- `camoucli presets`
- `camoucli version`
- `camoucli path`
- `camoucli doctor`

### Page automation

- `camoucli open <url>`
- `camoucli snapshot [-i]`
- `camoucli click <selectorOrRef>`
- `camoucli fill <selectorOrRef> <text>`
- `camoucli press <key>`
- `camoucli wait <selectorOrRef>`
- `camoucli screenshot [path]`
- `camoucli get url`
- `camoucli get title`
- `camoucli get text <selectorOrRef>`

### Session and tab management

- `camoucli session list`
- `camoucli session stop [name]`
- `camoucli tab list`
- `camoucli tab new [url]`
- `camoucli tab close [nameOrIndex]`

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
- `--preset <name>`
- `--proxy <url>`
- `--locale <locale>`
- `--timezone <timezone>`
- `--width <px>` / `--height <px>`
- `--json`
- `--verbose`

## Example Flows

Use a named session and tab:

```bash
npm run dev -- open https://github.com --session work --tabname github
npm run dev -- snapshot -i --session work --tabname github
```

Install and switch versions:

```bash
npm run dev -- install 135.0.1-beta.24
npm run dev -- install 134.0.0-beta.20
npm run dev -- versions
npm run dev -- use 134.0.0-beta.20
npm run dev -- version
```

Check the current install inventory and launch compatibility:

```bash
npm run dev -- doctor --json
```

Launch a session with an explicit installed browser version without changing the global default:

```bash
npm run dev -- open https://example.com --session canary --browser 135.0.1-beta.24
```

Save a screenshot to the session artifacts directory:

```bash
npm run dev -- screenshot --session work --tabname github
```

## Storage Layout

Camoucli uses platform-specific app directories for its own state and profiles.

- session profiles live under `profiles/<session>/{user-data,downloads,artifacts}`
- daemon state and logs live under the platform state/runtime dirs

Camoufox binaries are stored in the shared cache layout used by the Python library when possible:

- Linux: `~/.cache/camoufox/browsers/official/<version>/`
- macOS: `~/Library/Caches/camoufox/browsers/official/<version>/`
- Windows: `%LOCALAPPDATA%\camoufox\Cache\browsers\official\<version>\`

This lets Camoucli reuse compatible Camoufox installs from the Python ecosystem and vice versa.

## Presets

Built-in presets give you a small layer of tested ergonomics on top of raw config and prefs JSON:

- `default` - baseline launch with no additional overrides
- `cache` - enables the Firefox cache/session prefs used by the Python library
- `low-bandwidth` - blocks images and speculative requests for lighter automation sessions
- `disable-coop` - relaxes Cross-Origin-Opener-Policy isolation for troublesome embedded flows

List them from the CLI:

```bash
npm run dev -- presets
```

Apply one or more presets to a browser command:

```bash
npm run dev -- open https://example.com --preset cache --preset low-bandwidth
```

## Compatibility Matrix

Current local verification with `playwright-core` `1.51.1`:

| Camoufox | Status | Notes |
| --- | --- | --- |
| `135.0.1-beta.24` | launches | smoke-tested successfully |
| `135.0.1-beta.23` | incompatible | `Browser.setContrast` is not supported |

## Notes

- The CLI is intentionally thin; the daemon owns browser lifecycle and persistent state.
- `snapshot` creates per-tab `@eN` refs, and refs are cleared after navigation or a new snapshot.
- Browser installation is explicit; the package does not download Camoufox during `npm install`.
- `install` and `use` include a quick compatibility hint based on a real headless launch probe of the selected version.
- `doctor` reports installed versions, a per-version launch compatibility matrix, shared-library diagnostics, and remediation hints.
- Passing `--json` returns structured machine-readable errors for both top-level CLI failures and daemon responses.

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
