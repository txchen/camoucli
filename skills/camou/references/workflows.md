# Camou Workflows

## Snapshot And Ref Lifecycle

- `snapshot` creates refs like `@e1`, `@e2`, `@e3`
- refs belong to one tab only
- refs are cleared on navigation
- refs are also cleared when a new snapshot is taken for that tab

Practical implication:

```bash
camou snapshot -i
camou click @e1
camou snapshot -i
```

Do not assume old refs survive after a click that navigates, submits, opens a modal, or rerenders the page.

## Sessions vs Tabs

### Session

Use `--session <name>` when the user wants:

- login persistence
- a separate browser workspace
- isolated downloads and artifacts

Session data is stored persistently under that session name.

### Tab

Use `--tabname <name>` when the user wants:

- more than one page in the same session
- parallel-safe automation
- separate ref maps for different pages

Tabs in the same session share profile state but keep separate pages and refs.

## Version Selection

Use these commands when browser compatibility matters:

```bash
camou versions
camou use <version>
camou doctor --json
```

For one-off testing without changing the default:

```bash
camou open https://example.com --browser <version>
```

## CLI vs Node API

### Prefer the CLI when

- the user wants quick one-off browser interactions
- the workflow is naturally step-by-step in the shell
- `snapshot -i` and `@eN` refs are the easiest control surface

### Prefer the Node API when

- the user explicitly wants a script, test, or reusable module
- the workflow needs loops, branching, retries, or composition with other Node code
- the user wants direct Playwright access after launch

Core programmatic helpers:

```ts
import { Camoufox, launchCamoufox, withCamoufox } from 'camou';
```

The Node API returns a real Playwright `BrowserContext`, so standard Playwright methods work after launch.

High-level wrapper pattern:

```ts
const camou = await Camoufox.launch({ session: 'script' });
const page = await camou.open('https://example.com');
await camou.close();
```

## Common Failure Patterns

### Launch compatibility failure

Symptom:

- `doctor` shows a version as not launchable
- the error mentions unsupported protocol methods like `Browser.setContrast`

Action:

- switch to a newer installed version with `camou use <version>`
- or install a newer version, then rerun `doctor`

### Profile/session locked

Symptom:

- launch fails because the profile is locked or already in use

Action:

- stop the other browser process using that session
- or pick a different `--session` name

### Linux shared library failure

Symptom:

- browser executable exists but still fails to launch

Action:

- run `camou doctor --json`
- install the missing shared libraries reported in the diagnostics

## Good Default Playbook For Agents

When the user says "use the browser" or "test the site":

1. if needed, run `camou doctor --json` or `camou versions`
2. if they want shell-driven automation, `camou open <url> --json`
3. `camou snapshot -i --json`
4. choose refs from the snapshot
5. interact with `click`, `fill`, `press`, `wait`
6. re-snapshot after page changes
7. keep the same `--session` if the workflow depends on login state
8. if they want a reusable Node script instead, switch to the package API and use `launchCamoufox()` or `withCamoufox()`
