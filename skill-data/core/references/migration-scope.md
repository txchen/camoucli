# Agent Browser Migration Scope

Camou takes inspiration from Agent Browser but targets a different runtime: local Camoufox through Playwright Firefox with a Node CLI and local daemon.

## Supported Or Adapted

These map well:

- page navigation
- accessibility-style snapshots with `@eN` refs
- click/fill/type/check/select/hover/focus
- waits, screenshots, downloads, uploads, drag
- named sessions and tabs
- cookies, storage, and Playwright storage-state
- network routing, request inspection, and HAR capture
- console, page errors, traces, vitals, and init scripts
- JSON output for agent loops

Some names are adapted:

- `goto` and `navigate` route through `open`
- `key` aliases `press`
- `scrollinto` aliases `scrollintoview`
- `web-vitals` aliases `vitals`

## Local Camoufox Scope

Camou launches installed Camoufox builds from the local registry. Browser binaries live in the shared Camoufox cache layout for compatibility with the Python ecosystem, while Camoucli keeps its own registry and session data.

The daemon owns browser lifecycle, sessions, tabs, refs, and runtime buffers. The CLI stays a thin IPC client except for local commands such as `install`, `doctor`, and `skills`.

## Unsupported Or Out Of Scope

Camou does not currently implement:

- Chrome CDP attach mode
- arbitrary browser engine switching
- remote/cloud browser providers
- Electron desktop app automation
- Slack-specific automation commands
- auth vault
- hosted dashboard
- video recording
- PDF export
- extension loading as a stable user-facing feature

Unsupported migration flags and commands should fail explicitly with structured errors rather than silently degrading behavior.

## Migration Playbook

1. Replace Agent Browser install/setup with `npm install -g camou` and `camou install`.
2. Replace cloud/provider assumptions with local session names.
3. Replace persistent auth vault usage with Camou profiles, cookies, or storage-state snapshots.
4. Use `camou doctor --json` for launch failures.
5. Use the current skill content from `camou skills get core --full` instead of stale copied command tables.
