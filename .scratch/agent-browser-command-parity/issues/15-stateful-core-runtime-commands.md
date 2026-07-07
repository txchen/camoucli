Status: done
Type: task

# Stateful Core Runtime Commands

## Parent

.scratch/agent-browser-command-parity/PRD.md

## What to build

Add the core parity commands that require daemon-owned per-session or per-tab runtime coordination: downloads, download waits, runtime settings, frame context, dialogs, and local DOM read. A completed slice should let users perform these workflows through the CLI without custom JavaScript, and should establish clear lifetime rules for page-level state, context-level state, and tab-scoped state.

This slice should rely on the session/tab lifecycle foundation and launch compatibility foundation. It should not implement cookies/storage/state snapshots, network logs/routes, or debug event buffers.

## Acceptance criteria

- [x] `download <target> <path>` waits for a download triggered by clicking the target, saves it through daemon-owned path resolution, creates parent directories as needed, and returns saved path plus browser metadata.
- [x] `wait --download [path]` waits for the next download in the current tab, optionally saves it, and times out with a structured error.
- [x] Runtime `set` commands support the accepted viewport, geolocation, offline, headers, credentials, and media operations with explicit tab-versus-session lifetimes.
- [x] Unsupported runtime setting variants reject clearly instead of silently pretending to apply.
- [x] `frame <selector|ref>` sets tab-scoped active frame context for later selector actions, and `frame main` clears it.
- [x] Frame context clears on navigation, tab close, and session stop.
- [x] Dialog listeners track pending tab dialogs, `dialog status` reports metadata, and `dialog accept|dismiss [text]` resolves the pending dialog or returns a validation error.
- [x] `read [url]` performs local DOM reading, optionally navigates first, supports the accepted raw/outline/filter/timeout/JSON-friendly options, and does not use external reader services.
- [x] The slice includes schema/parser/defaults/output/help/docs coverage plus fake-browser or focused mock tests for downloads, settings, frames, dialogs, and read behavior.
- [x] `npm run build` and `npm test` pass.

## Blocked by

- .scratch/agent-browser-command-parity/issues/13-session-and-tab-lifecycle-parity.md
- .scratch/agent-browser-command-parity/issues/14-launch-option-compatibility.md
