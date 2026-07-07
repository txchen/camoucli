---
name: core
description: Core Camou browser automation for AI agents. Use when driving websites with the `camou` CLI, preserving local Camoufox sessions, working with snapshot `@eN` refs, collecting network/debug artifacts, switching Camoufox versions, or writing Node scripts with Camoufox and CamouClient.
allowed-tools: Bash(camou:*), Bash(npx camou:*), Bash(node:*), Bash(npm:*)
---

# Camou Core

Camou is a Node.js CLI and local daemon for driving Camoufox through Playwright. It is local-first: browser processes, profiles, downloads, network buffers, and artifacts live on this machine.

Use `camou ...` when the package is installed globally. Use `npx camou ...` for one-off installed-package runs. Inside the Camoucli repo, use `npm run dev -- ...`.

## Start Here

Install the browser explicitly before browser automation:

```bash
camou install
camou doctor --json
```

Installing the npm package does not download Camoufox. `camou install` downloads a compatible Camoufox build and runs a quick headless launch probe.

For almost every page task, use this loop:

```bash
camou open https://example.com --json
camou snapshot -i --json
camou click @e1 --json
camou snapshot -i --json
```

Read the snapshot, choose an `@eN` ref, act on it, then refresh the snapshot after navigation or DOM changes.

## Ref Lifecycle

`snapshot` creates element refs such as `@e1`, `@e2`, and `@e3`.

Rules:

- refs belong to one tab only
- refs are cleared when that tab navigates
- refs are cleared when a new snapshot is taken for that tab
- refs should not be reused after clicks, submits, SPA route changes, modal opens, or rerenders unless a fresh snapshot confirms them

Prefer `snapshot -i` for interactive work. Use raw selectors only when the page structure is known and refs are unavailable.

## JSON-First Agent Loop

Use `--json` whenever another program or agent will parse output:

```bash
camou open https://target.site --session work --tabname main --json
camou snapshot -i --session work --tabname main --json
camou fill @e2 "user@example.com" --session work --tabname main --json
camou click @e5 --session work --tabname main --json
camou wait --load domcontentloaded --session work --tabname main --json
camou snapshot -i --session work --tabname main --json
```

Top-level CLI errors are structured with `--json`. The `skills` command uses `{ "success": true, "data": ... }` and `{ "success": false, "error": "..." }` envelopes.

## Reading And Inspection

Use these commands to understand the current page:

```bash
camou snapshot -i
camou read --outline
camou get url
camou get title
camou get text @e1
camou get value @e2
camou get html '#main'
camou get attr '#next' href
camou get count button
camou get box @e1
camou get styles @e1
camou is visible @e1
camou find role button --name Save
```

Use `read [url]` for lightweight page reading. Use `open` plus `snapshot -i` when you need to interact.

## Common Interactions

Use refs from the latest snapshot:

```bash
camou click @e1
camou dblclick @e1
camou hover @e1
camou focus @e2
camou fill @e2 "text"
camou type @e2 "typed text" --clear --delay 25
camou check @e3
camou uncheck @e3
camou select @e4 option-value
camou press Enter
camou key Escape
```

Keyboard and mouse families are available when a page needs lower-level input:

```bash
camou keyboard type "hello"
camou keydown Shift
camou keyup Shift
camou mouse move 200 300
camou mouse down
camou mouse up
camou mouse wheel 500
```

Use waits instead of fixed sleeps:

```bash
camou wait @e1 --timeout 5000
camou wait --text "Saved"
camou wait --load networkidle
camou wait --url "/dashboard"
camou wait --fn "document.readyState === 'complete'"
```

Downloads and files:

```bash
camou download @e7 reports/export.csv --timeout 10000
camou wait --download --path reports/export.csv
camou upload @e4 ./avatar.png
camou drag @e2 @e5
```

Screenshots:

```bash
camou screenshot
camou screenshot page.png
camou screenshot '#chart' chart.png
camou screenshot page.jpg --format jpeg --quality 80
```

Relative screenshot paths are written under the session artifact directory.

## Sessions, Tabs, Profiles, And State

Use `--session <name>` to choose a persistent browser workspace. Reuse the same session to keep cookies, localStorage, downloads, and artifacts.

Use `--tabname <name>` to choose a named page within a session. Tabs in one session share browser profile state but have separate page bindings and ref maps.

```bash
camou open https://github.com/login --session work --tabname github
camou open https://mail.example.com --session work --tabname mail
camou snapshot -i --session work --tabname github
camou snapshot -i --session work --tabname mail
```

Live sessions and persistent profiles are different:

```bash
camou session list
camou session info --session work
camou session stop work
camou profile list
camou profile inspect work
camou profile remove work
```

`profile remove` deletes disk-backed browser profile data. Stop or inspect before deleting profiles that may contain login state.

Use cookies and Playwright storage-state snapshots for portable state:

```bash
camou cookies get
camou cookies export cookies.json
camou cookies import cookies.json
camou state save auth
camou state load auth
camou state list
camou state show auth --json
camou state clear auth
```

`state load` merges storage into a running session. It is not a clean profile reset.

## Project Defaults

Avoid repeating flags in one repo by setting defaults.

Resolution order:

1. explicit CLI flags
2. environment variables
3. nearest `.camou.json` or `camou.json`
4. built-in defaults: `session=default`, `tabname=main`

Environment variables:

```bash
export CAMOU_SESSION=my-project
export CAMOU_TAB=main
export CAMOU_BROWSER=135.0.1-beta.24
export CAMOU_HEADLESS=true
export CAMOU_PRESET=cache,low-bandwidth
```

Config file:

```json
{
  "session": "my-project",
  "tabname": "main",
  "browser": "135.0.1-beta.24",
  "headless": true,
  "preset": ["cache", "low-bandwidth"]
}
```

## Network And HAR

Network state is daemon-owned and in memory. It clears when the session stops or the daemon exits.

```bash
camou network route '**/api/mock' --body '{"ok":true}' --content-type application/json
camou network route '**/*.png' --abort --resource-type image
camou network requests --filter api --json
camou network request net_1 --json
camou network unroute '**/api/mock'
camou network har start
camou reload
camou network har stop capture.har
```

HAR output is written under `profiles/<session>/artifacts/har/` for relative paths.

## Debug And Artifacts

Console messages, page errors, network requests, HAR buffers, and traces are daemon runtime buffers.

```bash
camou console --json
camou console --clear
camou errors --json
camou errors --clear
camou highlight @e1 --duration 750
camou trace start --screenshots --sources
camou trace stop trace.zip
camou diff snapshot --text "old snapshot" --interactive
camou diff screenshot --baseline baseline.png --selector '#app'
camou vitals --json
```

Relative artifacts land under `profiles/<session>/artifacts/` by family: screenshots, traces, HARs, and future diff/PDF/video-style outputs.

Use daemon cleanup when processes are stale:

```bash
camou daemon restart
camou daemon cleanup
```

## Browser Versions, Presets, And Fingerprints

Manage local Camoufox builds:

```bash
camou remote-versions
camou install 135.0.1-beta.24
camou versions
camou use 135.0.1-beta.24
camou open https://example.com --browser 135.0.1-beta.24
camou remove 135.0.1-beta.23
```

`use` changes the default version. `--browser` pins one command without changing the default.

Presets and fingerprint helpers:

```bash
camou presets
camou fingerprint-profiles
camou open https://example.com --preset cache --preset low-bandwidth
camou open https://example.com --screen-profile desktop-fhd --window-profile desktop
camou open https://example.com --locale en-US --timezone America/Los_Angeles
```

Use `camou doctor --json` when launch fails. It checks installed builds, launch compatibility, Playwright protocol mismatches, damaged bundles, and Linux shared-library failures.

## Node API

Use `Camoufox` for direct Playwright access:

```ts
import { Camoufox } from 'camou';

await Camoufox.with({ session: 'script', headless: true }, async (camou) => {
  const page = await camou.open('https://example.com');
  console.log(await page.title());
});
```

Use `CamouClient` for daemon-owned sessions, tabs, refs, state, network buffers, and artifacts:

```ts
import { CamouClient } from 'camou';

const camou = CamouClient.create({ session: 'script', tabName: 'main' });
await camou.open('https://example.com');
await camou.snapshot({ interactive: true });
await camou.click('@e1');
await camou.close();
```

`CamouClient` uses canonical method names. CLI-only aliases such as `key`, `scrollinto`, and `web-vitals` are not the primary Node surface.

## Local Scope And Migration Notes

Camou targets local Camoufox through Playwright. It does not implement Agent Browser cloud providers, Chrome CDP attach, Electron app automation, Slack-specific flows, video recording, PDF export, auth vault, or dashboard hosting.

Unsupported compatibility flags and commands fail with structured migration errors. Use `docs/agent-browser-command-parity.md` when porting Agent Browser scripts.

## Safe Working Rules

- Confirm the browser is installed before assuming launch failures are page failures.
- Use `--json` for parsed output.
- Prefer `snapshot -i` and fresh refs.
- Re-snapshot after navigation or page mutation.
- Use named sessions for login persistence and separate sessions for isolation.
- Use named tabs for parallel pages.
- Avoid deleting profile directories directly.
- Treat network/debug buffers as in-memory daemon state.
- Use `doctor --json` before guessing at compatibility problems.
- Prefer `CamouClient` over repeated shell calls in reusable Node scripts that need daemon state.

For exhaustive command reference and editable shell templates, run:

```bash
camou skills get core --full
```
