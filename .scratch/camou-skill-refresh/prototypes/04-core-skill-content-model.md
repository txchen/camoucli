# PROTOTYPE - Core Skill Content Model

Question: what should the refreshed `core` skill contain at normal and full fidelity?

This is a throwaway outline for discussion. If accepted, the durable result belongs in the wayfinder ticket answer, and the implementation should create real files under `skills/` and `skill-data/`.

## Recommended Model

Use three tiers:

1. **Installed stub**: `skills/camou/SKILL.md`
2. **Normal runtime guide**: `skill-data/core/SKILL.md`, returned by `camou skills get core`
3. **Full runtime guide plus references/templates**: `skill-data/core/SKILL.md` plus `skill-data/core/references/*` and `skill-data/core/templates/*`, returned by `camou skills get core --full`

## Tier 1: Installed Stub

Target length: about 40-70 lines.

Purpose: bootstrap only. It should not try to be a usage guide.

Frontmatter:

```yaml
---
name: camou
description: Local Camoufox browser automation for AI agents. Use when the user needs to drive websites with the `camou` CLI, preserve login state, interact with pages, switch Camoufox versions, troubleshoot compatibility, or write Node scripts against Camou's Playwright-based API.
allowed-tools: Bash(camou:*), Bash(npx camou:*), Bash(node:*), Bash(npm:*)
hidden: true
---
```

Recommended body:

```markdown
# Camou

Local Camoufox browser automation for AI agents. Node-first CLI plus daemon, Playwright over local Camoufox, persistent sessions/tabs/refs/state.

## Start Here

This file is a discovery stub, not the usage guide. Before running browser commands, load version-matched workflow content from the installed CLI:

```bash
camou skills get core
camou skills get core --full
```

If `camou` is not globally installed:

```bash
npx camou skills get core
npx camou skills get core --full
```

Inside the Camoucli repo:

```bash
npm run dev -- skills get core
npm run dev -- skills get core --full
```

The CLI-served content matches the installed version. Use the first form that works in your environment.

## Emergency Loop

If you cannot load the runtime guide:

```bash
camou open <url>
camou snapshot -i --json
camou click @e1
camou snapshot -i --json
```

Refs are per tab and become stale after navigation or a new snapshot.
```

Explicitly omit:

- full command reference
- detailed Node API examples
- network/debug/state sections
- lengthy troubleshooting
- references/workflows.md pointer

## Tier 2: Normal `core`

Target length: about 250-450 lines. Agent Browser's `core` is about 469 lines; Camou should be similar but probably slightly tighter because Camou has no MCP/dashboard/provider surfaces.

Purpose: enough context for ordinary browser automation and common Camou-specific failure modes without requiring `--full`.

Recommended frontmatter:

```yaml
---
name: core
description: Core Camou usage guide. Read before running Camou browser commands. Covers the open/snapshot/ref workflow, sessions, tabs, profiles, state snapshots, project defaults, network/HAR basics, debug artifacts, Node API split, local Camoufox scope, and troubleshooting.
allowed-tools: Bash(camou:*), Bash(npx camou:*), Bash(node:*), Bash(npm:*)
---
```

Recommended body outline:

```markdown
# Camou Core

Local-first browser automation for AI agents. Camou drives local Camoufox Firefox through Playwright with a daemon that owns persistent sessions, tabs, refs, state, downloads, and artifacts.

## The Core Loop

open -> snapshot -i -> act on @refs -> re-snapshot.

Include:
- JSON-first agent loop
- refs are per tab
- refs clear on navigation and new snapshot
- prefer refs after snapshot, selectors/semantic find when refs are unavailable

## Quickstart

Include:
- install once: `camou install`
- open example.com, snapshot, click/get title
- close/cleanup command
- mention no browser download on npm install

## Reading And Inspecting Pages

Include:
- `snapshot`, `snapshot -i`, `snapshot -i --json`
- `read [url]`, `read --outline`, `read --raw`, `read --filter`
- `get url/title/text/value/html/attr/count/box/styles`
- `is visible/enabled/checked`

## Interacting

Include:
- click/hover/fill/type/check/uncheck/select/press
- dblclick/focus/upload/drag/download
- keyboard and mouse subcommands
- scroll/scrollintoview/scrollinto
- wait variants: time, selector, text, load, URL, fn, download
- screenshot options and artifact default

## Sessions, Tabs, Profiles, And State

This should be first-class in normal core, not buried in full reference.

Define:
- session = live daemon workspace + persistent browser profile selection
- profile = full disk-backed Firefox profile directory
- state = portable Playwright storage-state JSON snapshot
- tab = named page binding inside a session

Include:
- `--session`, `--tabname`
- `session`, `session id`, `session info`, `session list`, `session stop`
- `profile list/inspect/remove`
- `state save/load/list/show/clear/clean/rename`
- `tab [target]`, `tab list/new/close`, `window new`
- caution: `state load` merges cookies/localStorage; it is not a profile reset

## Project Defaults

Include:
- explicit flags > env > `.camou.json` / `camou.json` > built-ins
- CAMOU_SESSION, CAMOU_TAB, CAMOU_BROWSER, CAMOU_HEADLESS, CAMOU_PRESET
- why this matters for repo-local agent workflows

## Network And HAR

Compact but first-class.

Include:
- `network route`
- `network unroute`
- `network requests`
- `network request`
- `network har start/stop`
- lifetime: in-memory per daemon session, clears on stop/daemon exit
- unsupported: provider/CDP response-body inspection

## Debug And Artifacts

Include:
- `console`, `errors`, `highlight`
- `clipboard read/write/copy/paste`
- `trace start/stop`
- `diff snapshot/screenshot/url`
- `vitals`, `web-vitals`
- `pushstate`, `addinitscript`, `removeinitscript`
- artifact directories under `profiles/<session>/artifacts`
- caveat: trace is Playwright tracing, not CDP profiler

## Node API Split

Include:
- use `Camoufox` when you want real Playwright BrowserContext/Page
- use `CamouClient` for daemon-owned sessions/tabs/refs/state/network/artifacts
- one example of each
- CLI-only aliases and unsupported stubs are not Node API methods

## Browser Versions And Fingerprints

Include:
- `install`, `remote-versions`, `versions`, `use`, `path`, `doctor`
- `--browser` for one-off version pinning
- `presets`, `fingerprint-profiles`
- common fingerprint helper flags: locale/locales/region/timezone/screen/window/block toggles

## Local Scope And Migration Caveats

Include:
- Camou is not Agent Browser provider/CDP parity
- unsupported: `connect`, `inspect`, `profiler`, `pdf`
- hidden unsupported flags: `--cdp`, `--provider`, `--executable-path`, `--engine`, `--extension`, `--restore-policy`
- alternatives: open/local session, trace/console/errors/screenshot/get, Playwright direct after smoke testing

## Troubleshooting

Include concise cases:
- command not found -> use npx or repo-local npm run dev
- no browser installed -> `camou install`
- launch compatibility / Browser.setContrast -> `camou doctor --json`, install/use newer version
- old daemon after upgrade -> `camou daemon restart`
- orphan browser processes -> `camou daemon cleanup`
- profile/session locked -> close other process or use different session
- Linux shared libraries -> doctor reports missing libs
- stale @ref -> re-snapshot

## Working Safely

Include:
- use `--json` when parsing output
- avoid destructive browser actions unless user asked
- do not commit cookies/state files
- use dedicated session names for scripts/tests
- clean up sessions when done

## Full Reference

For complete commands, templates, and edge cases:

```bash
camou skills get core --full
```
```

## Tier 3: `core --full`

Target shape: normal `core` plus supplementary files. Keep the normal guide readable; put exhaustive lists and templates here.

Recommended initial files:

```text
skill-data/core/references/commands.md
skill-data/core/references/sessions-state.md
skill-data/core/references/network-debug-artifacts.md
skill-data/core/references/node-api.md
skill-data/core/references/migration-scope.md
skill-data/core/templates/form-automation.sh
skill-data/core/templates/authenticated-session.sh
skill-data/core/templates/network-har-capture.sh
```

### `references/commands.md`

Purpose: complete command reference.

Sections:

- Browser management
- Global/shared browser flags
- Navigation and aliases
- Snapshot and refs
- Read/get/is/find
- Interactions
- Keyboard/mouse
- Wait/download/screenshot
- Sessions/tabs/windows
- Profiles/cookies/storage/state
- Runtime settings/frame/dialog
- Network/HAR
- Debug/artifacts
- Diff/vitals/init scripts
- Node API mapping
- Unsupported/out of scope

This should largely derive from README command reference and `docs/agent-browser-command-parity.md`.

### `references/sessions-state.md`

Purpose: explain the Camou state model in detail.

Sections:

- Session vs profile vs state vs tab
- Project defaults
- Persistence rules
- Auth/session reuse
- Portable state snapshots
- Cleanup
- Security: don't commit state/cookie files

This can absorb the useful parts of current `skills/camou/references/workflows.md`.

### `references/network-debug-artifacts.md`

Purpose: lifetimes, artifact paths, and caveats.

Sections:

- Network routes/request buffer/HAR lifetime
- Console/errors buffers
- Trace artifacts
- Screenshot/HAR/trace/diff paths
- Clipboard caveats
- CDP/provider limitations

### `references/node-api.md`

Purpose: script authors and tests.

Sections:

- `Camoufox` direct Playwright API
- `CamouClient` daemon API
- method families
- error/result shape
- when not to shell out
- CLI-only aliases not mirrored in Node

### `references/migration-scope.md`

Purpose: Agent Browser migration.

Sections:

- supported/adapted/unsupported/out-of-scope definitions
- unsupported migration stubs and alternatives
- local Camoufox-only scope
- links/summary from `docs/agent-browser-migration.md`

### Templates

Keep templates shell-oriented and agent-editable:

- `form-automation.sh`: open, snapshot, fill, click, wait, snapshot
- `authenticated-session.sh`: stable session/tab, login reuse, profile/state notes
- `network-har-capture.sh`: route, open, requests, har start/stop, cleanup

## Content Placement Decisions

### Always-loaded Stub

Only:

- what Camou is
- how to load `core` and `core --full`
- global/npx/repo-local forms
- tiny emergency loop

### Normal `core`

Include workflows an agent is likely to need before acting:

- core loop
- ref lifecycle
- sessions/tabs/profile/state distinction
- project defaults
- common interaction/read/wait commands
- network/HAR basics
- debug/artifact basics
- Node API split
- browser version/doctor troubleshooting
- local scope/unsupported surfaces

### Full Reference

Include material too long for normal `core`:

- exhaustive command list
- command-family matrices
- detailed state and artifact lifetimes
- templates
- migration tables
- more complete Node API mapping

## Recommendation

Approve this model as the implementation target, with one adjustment: do not decide specialized skills here. The normal `core` should contain enough network/debug/node/migration guidance for 0.11.0; the later specialized-skill ticket should decide whether any of those deserve separate runtime skills.
