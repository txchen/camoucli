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
- `--config <path>`
- `--config-json <json>`
- `--prefs <path>`
- `--prefs-json <json>`
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
npm run dev -- use 134.0.0-beta.20
npm run dev -- version
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

## Notes

- The CLI is intentionally thin; the daemon owns browser lifecycle and persistent state.
- `snapshot` creates per-tab `@eN` refs, and refs are cleared after navigation or a new snapshot.
- Browser installation is explicit; the package does not download Camoufox during `npm install`.

## Development

```bash
npm install
npm run build
npm test
```
