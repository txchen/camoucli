Status: ready-for-agent
Type: task

# Cookies, Storage, And State Snapshots

## Parent

.scratch/agent-browser-command-parity/PRD.md

## What to build

Add local browser data parity while keeping persistent Firefox profiles distinct from portable Playwright storage-state snapshots. A completed slice should let users inspect and mutate cookies, import cookies from cURL-shaped inputs, operate on localStorage/sessionStorage for the active page origin, and manage portable state snapshot files without confusing them with full Camoucli profiles.

The daemon should own secret-bearing parsing and filesystem writes. Non-JSON human output should avoid leaking cookie values or other sensitive state.

## Acceptance criteria

- [ ] `cookies` and `cookies get [url...]` list current session cookies.
- [ ] `cookies set` adds cookies using URL or domain/path inputs and can safely default to the current HTTP(S) page where specified.
- [ ] `cookies set --curl <file>` imports supported JSON-array, cURL command, and bare Cookie header shapes without echoing secret values in errors.
- [ ] `cookies clear` clears current session cookies.
- [ ] Existing cookie import/export file commands continue to work.
- [ ] `storage local` and `storage session` support get, set, and clear for the current page origin, with string values and clear errors for unusable origins.
- [ ] `state save`, `load`, `list`, `show`, `clear`, `clear --all`, `clean`, and `rename` manage portable Playwright-compatible storage-state snapshots in a managed state directory or explicit paths.
- [ ] Running-session `state load` is implemented and documented as an import/merge operation, not a pristine profile reset.
- [ ] `profile` commands remain full persistent profile management and are not replaced or affected by `state` cleanup.
- [ ] Launch-time `--state` integrates with the launch option contract if not already completed.
- [ ] The slice includes schema/parser/defaults/output/help/docs coverage, redaction tests, path resolution tests, cURL parser tests, and fake-browser cookie/storage/state tests.
- [ ] `npm run build` and `npm test` pass.

## Blocked by

- .scratch/agent-browser-command-parity/issues/13-session-and-tab-lifecycle-parity.md
- .scratch/agent-browser-command-parity/issues/14-launch-option-compatibility.md
