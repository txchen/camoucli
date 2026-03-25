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

1. `camou open <url>` — start from the target page
2. `camou snapshot -i --json` — capture interactive refs in machine-readable form
3. interact with `@eN` refs using `click`, `fill`, `press`, `get text`, or `wait`
4. re-run `snapshot` after navigation or meaningful page changes

Example:

```bash
camou open https://example.com   # Open the target page
camou snapshot -i                # Capture interactive refs
# @e1 a "Learn more"
camou click @e1                  # Act on the chosen ref
camou snapshot -i                # Refresh refs after page change
```

Important rule:

- refs are per tab and are invalidated by navigation or a new snapshot

## Best Practices

### Use `--session` for login-heavy workflows

Reuse the same session name to keep profile data, cookies, and storage.

```bash
camou open https://github.com/login --session work --tabname github   # Start a named session
# ... login once ...
camou open https://github.com/settings/profile --session work --tabname github # Reuse saved login state
```

### Use `--tabname` for parallel-safe browsing

Tabs in the same session share browser state but keep separate page bindings and ref maps.

```bash
camou open https://reddit.com --session research --tabname reddit       # Shared session, first tab
camou open https://news.ycombinator.com --session research --tabname hn # Shared session, second tab

camou snapshot -i --session research --tabname reddit                   # Inspect the reddit tab
camou snapshot -i --session research --tabname hn                       # Inspect the hn tab
```

### Prefer project defaults when a repo should always use the same session/tab

If the user is working inside one coding project, Camou can resolve defaults automatically.

Precedence is:

1. explicit flags
2. environment variables
3. nearest project config file
4. built-in defaults

Environment variables:

```bash
export CAMOU_SESSION=my-project
export CAMOU_TAB=main
export CAMOU_BROWSER=135.0.1-beta.24
export CAMOU_HEADLESS=true
export CAMOU_PRESET=cache,low-bandwidth
```

Project config files:

- `.camou.json`
- `camou.json`

Example:

```json
{
  "session": "my-project",
  "tabname": "main",
  "browser": "135.0.1-beta.24",
  "headless": true,
  "preset": ["cache", "low-bandwidth"]
}
```

Then agents can just run `camou open ...`, `camou snapshot ...`, and so on without repeating `--session`, `--tabname`, `--browser`, `--headless`, or `--preset` every time.

### Manage stored profiles explicitly

Use `session` for live runtime state and `profile` for disk-backed browser data.

```bash
camou session list            # List live daemon sessions
camou profile list            # List stored profiles on disk
camou profile inspect work    # Show one profile's paths
camou profile remove work     # Delete one profile
camou cookies export work.json # Save cookies to JSON
camou cookies import work.json # Restore cookies from JSON
camou close --all             # Stop every running session
camou daemon stop             # Stop the local daemon process
camou daemon restart          # Restart the local daemon process
camou daemon cleanup          # Stop sessions, stop daemon, kill stray Camoufox processes
```

Prefer `camou profile remove <name>` over raw filesystem deletion so the daemon can stop a running session first when needed. Use `camou daemon restart` after CLI upgrades if an older daemon is still running. Use `camou daemon cleanup` when orphan Camoufox processes remain.

### Eval, cookies, and close-all

Use these when you need lightweight scripting, cookie portability, or fast daemon cleanup.

```bash
camou eval 'document.title'      # Read page state with JS
camou cookies export cookies.json # Save cookies for reuse
camou cookies import cookies.json # Restore cookies into session
camou close --all                # Fast cleanup for all running sessions
```

Guidance:
- `eval` runs in the current tab and should return JSON-serializable values
- `cookies import/export` operate on session/browser-context state, not tab-local state
- `close --all` stops every running daemon-owned session, but does not delete stored profiles on disk

### Use `--json` when output will be parsed

```bash
camou snapshot -i --json         # JSON interactive snapshot
camou get title --json           # JSON scalar output
camou eval 'document.title' --json # JSON eval result
camou cookies export --json      # JSON cookie export
camou doctor --json              # JSON diagnostics
```

Top-level CLI failures are also structured when `--json` is enabled.

### Pin browser versions intentionally

- `camou use <version>` changes the active default browser
- `camou <command> ... --browser <version>` uses a specific installed version without changing the default

```bash
camou versions                                      # Show installed and active versions
camou use 135.0.1-beta.24                           # Switch the default version
camou open https://example.com --session canary --browser 135.0.1-beta.24 # Pin one run
```

### Run `doctor` when launch fails

```bash
camou doctor --json   # Emit JSON compatibility diagnostics
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
import { Camoufox } from 'camou';

await Camoufox.with({ session: 'script' }, async (camou) => {
  const page = await camou.open('https://example.com');
  console.log(await page.title());
});
```

Useful script exports:

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

## Essential Commands

### Browser management

```bash
camou install [version]           # Install the default or one specific build
camou remove [version]            # Remove an installed Camoufox build
camou use <version>               # Switch the default browser version
camou versions                    # List installed versions and the default
camou presets                     # Show built-in launch presets
camou version                     # Print the active camoucli version
camou path                        # Show the active browser executable path
camou doctor                      # Diagnose install and launch issues
camou profile list                # List stored disk-backed profiles
camou profile inspect <name>      # Show one profile's paths
camou profile remove <name>       # Delete a profile; stops it first if needed
camou cookies export [path]       # Export context cookies as JSON
camou cookies import <path>       # Import cookies into session context
camou close --all                 # Stop all running sessions
camou daemon stop                 # Stop the local daemon process
camou daemon restart              # Restart the local daemon process
camou daemon cleanup              # Stop sessions, stop daemon, kill stray Camoufox processes
```

### Page automation

```bash
camou open <url>                  # Open a URL in the current tab
camou back                        # Go back in the current tab history
camou forward                     # Go forward in the current tab history
camou reload                      # Reload the current page
camou eval <expression>           # Run JavaScript in the current tab
camou snapshot                    # Capture page state and refs
camou snapshot -i                 # Interactive elements only; recommended
camou click <selectorOrRef>       # Click a selector or @eN ref
camou hover <selectorOrRef>       # Hover a selector or @eN ref
camou fill <selectorOrRef> <text> # Set an input value directly
camou type <selectorOrRef> <text> # Type text with key events
camou check <selectorOrRef>       # Check a checkbox or radio input
camou uncheck <selectorOrRef>     # Uncheck a checkbox
camou select <selectorOrRef> <value> # Choose a select option
camou press <key>                 # Press a keyboard key in the page
camou scroll <direction> [amount] # Scroll up, down, left, or right
camou scrollintoview <selectorOrRef> # Scroll until visible
camou wait [selectorOrRef] [--text <text>] [--load <state>] # Wait for element, text, or load
camou screenshot [path]           # Save a screenshot of the current page
camou get url                     # Read the current page URL
camou get title                   # Read the current page title
camou get text <selectorOrRef>    # Read visible text from an element
camou get value <selectorOrRef>   # Read an element's form value
```

### Sessions and tabs

```bash
camou session list                # List running daemon sessions
camou session stop [name]         # Stop one session or the current session
camou tab list                    # List tabs in the current session
camou tab new [url]               # Create a new tab, optionally opening a URL
camou tab close [nameOrIndex]     # Close one tab by name or index
```

## Useful Patterns

### Form flow

```bash
camou open https://example.com/form   # Load the form page
camou snapshot -i                     # Capture interactive refs
camou fill @e1 "user@example.com"   # Fill the email field
camou fill @e2 "password123"        # Fill the password field
camou click @e3                       # Submit the form
camou snapshot -i                     # Refresh refs after the submit
```

### Persistent authenticated session

```bash
camou open https://app.example.com/login --session app --tabname main     # Create the app session
# ... complete login ...
camou open https://app.example.com/dashboard --session app --tabname main # Reuse authenticated state
```

### Machine-readable agent loop

```bash
camou open https://target.site --json   # JSON open result
camou snapshot -i --json                # JSON interactive snapshot
camou click @e2 --json                  # JSON action result
camou snapshot -i --json                # JSON post-action state
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
camou versions              # Inspect installed and active versions
camou doctor --json         # Check compatibility first
camou use 135.0.1-beta.24   # Switch to the target version
```

## Presets

Built-in presets add a small layer of tested defaults on top of raw config and prefs input.

```bash
camou presets                                                  # Show preset names
camou open https://example.com --preset cache --preset low-bandwidth # Launch with two presets
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
