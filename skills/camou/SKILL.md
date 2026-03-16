---
name: camou
description: Local Camoufox browser automation for AI agents. Use when the user needs to drive websites with the `camou` CLI, preserve login state, interact with pages, switch Camoufox versions, troubleshoot compatibility, or write Node scripts against Camou's Playwright-based API.
allowed-tools: Bash(camou:*), Bash(npx camou:*), Bash(node:*), Bash(npm:*)
---

# Browser Automation with Camou

Camou is a local CLI + daemon for driving Camoufox through Playwright.

Use it when you need:

- persistent login sessions
- named sessions and named tabs
- stable `@eN` refs from page snapshots
- machine-readable browser automation via `--json`
- Camoufox version install/switch/diagnostics
- programmatic control from Node scripts using a real Playwright `BrowserContext`

If `camou` is not installed globally, use `npx camou ...`.
If you are working inside the Camoucli repo itself, use `npm run dev -- ...`.

If the user wants a reusable Node script, test, or automation module, prefer importing from the `camou` package instead of shelling out to the CLI for every step.

## Core Workflow

Most tasks should follow this loop:

1. `camou open <url>`
2. `camou snapshot -i --json`
3. interact with `@eN` refs using `click`, `fill`, `press`, `get text`, or `wait`
4. re-run `snapshot` after navigation or meaningful page changes

Example:

```bash
camou open https://example.com
camou snapshot -i
# @e1 a "Learn more"
camou click @e1
camou snapshot -i
```

Important rule:

- refs are per tab and are invalidated by navigation or a new snapshot

## Best Practices

### Use `--session` for login-heavy workflows

Reuse the same session name to keep profile data, cookies, and storage.

```bash
camou open https://github.com/login --session work --tabname github
# ... login once ...
camou open https://github.com/settings/profile --session work --tabname github
```

### Use `--tabname` for parallel-safe browsing

Tabs in the same session share browser state but keep separate page bindings and ref maps.

```bash
camou open https://reddit.com --session research --tabname reddit
camou open https://news.ycombinator.com --session research --tabname hn

camou snapshot -i --session research --tabname reddit
camou snapshot -i --session research --tabname hn
```

### Use `--json` when output will be parsed

```bash
camou snapshot -i --json
camou get title --json
camou doctor --json
```

Top-level CLI failures are also structured when `--json` is enabled.

### Pin browser versions intentionally

- `camou use <version>` changes the active default browser
- `camou <command> ... --browser <version>` uses a specific installed version without changing the default

```bash
camou versions
camou use 135.0.1-beta.24
camou open https://example.com --session canary --browser 135.0.1-beta.24
```

### Run `doctor` when launch fails

```bash
camou doctor --json
```

`doctor` helps with:

- per-version launch compatibility
- missing or damaged browser bundles
- Linux shared-library issues
- version mismatch hints

### Use the Node API for scripts and test code

If the user wants code instead of one-off shell commands, use the package API.

```ts
import { Camoufox } from 'camou';

const camou = await Camoufox.launch({
  session: 'script',
  headless: false,
});

const page = await camou.open('https://example.com');
console.log(await page.title());

await camou.close();
```

Scoped helper:

```ts
import { withCamoufox } from 'camou';

await withCamoufox({ session: 'script' }, async ({ context }) => {
  const page = await context.newPage();
  await page.goto('https://example.com');
});
```

Useful script exports:

- `Camoufox.launch()`
- `Camoufox.with()`
- `launchCamoufox()`
- `launchCamoufoxContext()`
- `resolveCamoufoxLaunchSpec()`
- `withCamoufox()`
- `installCamoufox()`
- `listInstalledBrowsers()`
- `setCurrentBrowser()`
- `doctorCamoufox()`

## Essential Commands

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

## Useful Patterns

### Form flow

```bash
camou open https://example.com/form
camou snapshot -i
camou fill @e1 "user@example.com"
camou fill @e2 "password123"
camou click @e3
camou snapshot -i
```

### Persistent authenticated session

```bash
camou open https://app.example.com/login --session app --tabname main
# ... complete login ...
camou open https://app.example.com/dashboard --session app --tabname main
```

### Machine-readable agent loop

```bash
camou open https://target.site --json
camou snapshot -i --json
camou click @e2 --json
camou snapshot -i --json
```

### Programmatic Node automation

```ts
import { Camoufox } from 'camou';

await Camoufox.with({ session: 'agent-script', headless: true }, async (camou) => {
  const page = await camou.open('https://example.com');
  console.log(await page.title());
});
```

### Diagnose compatibility

```bash
camou versions
camou doctor --json
camou use 135.0.1-beta.24
```

## Presets

Built-in presets add a small layer of tested defaults on top of raw config and prefs input.

```bash
camou presets
camou open https://example.com --preset cache --preset low-bandwidth
```

Available presets in the current CLI:

- `default`
- `cache`
- `low-bandwidth`
- `disable-coop`

## Rules Of Thumb

- start with `snapshot -i`, not raw selectors, when an agent needs to inspect a page
- re-snapshot after navigation or any action that likely changed the DOM
- use the same `--session` when the user wants login persistence
- use different `--tabname` values when multiple pages should stay isolated
- use `--browser <version>` for canary testing or compatibility checks
- use `doctor --json` before guessing at launch failures
- if the user wants a reusable script, import `camou` and use the Node API instead of spawning the CLI repeatedly

See `references/workflows.md` for more concrete workflow guidance and troubleshooting patterns.
