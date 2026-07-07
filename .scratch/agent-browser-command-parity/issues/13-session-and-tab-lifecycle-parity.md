Status: ready-for-agent
Type: task

# Session And Tab Lifecycle Parity

## Parent

.scratch/agent-browser-command-parity/PRD.md

## What to build

Add the session, close, tab, URL-less open, popup, and window/page lifecycle foundation needed by later stateful parity commands. A completed slice should let users start a session without navigating, inspect and stop the current session, switch active tabs, create labeled tabs, close tabs, capture new tabs from clicks, and create tracked pages through `window new` while preserving explicit `--session` and `--tabname` workflows.

This slice establishes the daemon-owned active-tab model. It should make later commands able to rely on deterministic tab selection without breaking current named-tab scripts.

## Acceptance criteria

- [ ] `open` without a URL ensures the resolved session and tab exist and returns session/tab/page metadata without navigating.
- [ ] `goto` and `navigate` still require URLs.
- [ ] `session` prints the resolved current session name.
- [ ] `session id` generates stable sanitized session names for worktree, cwd, and git-root scopes without starting the daemon.
- [ ] `session info` reports useful runtime state when running and profile/path state when not running.
- [ ] `close` stops the resolved current session, `close --all` keeps stopping all running sessions, and `quit`/`exit` are aliases for current-session close.
- [ ] `tab` lists tabs, `tab new` creates tabs, `tab new --label` maps to Camoucli tab names, `tab <target>` switches active tab, and `tab close [target]` closes the target or active tab.
- [ ] Browser commands select tabs by explicit tab name first, then configured defaults, then daemon active tab, then the existing main-tab fallback.
- [ ] Closing the active tab selects a deterministic remaining active tab.
- [ ] `click --new-tab` tracks a newly opened page, assigns a deterministic tab name or requested label, switches active tab, and reports timeout clearly when no page opens.
- [ ] `window new` creates a tracked page and documents that it is not guaranteed to be an OS window.
- [ ] The slice includes schema/parser/defaults/output/help/docs coverage and fake-browser tests for active-tab and popup behavior.
- [ ] `npm run build` and `npm test` pass.

## Blocked by

- .scratch/agent-browser-command-parity/issues/11-core-aliases-and-eval-input-modes.md
