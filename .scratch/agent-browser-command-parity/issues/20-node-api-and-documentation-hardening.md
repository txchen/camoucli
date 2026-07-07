Status: ready-for-agent
Type: task

# Node API And Documentation Hardening

## Parent

.scratch/agent-browser-command-parity/PRD.md

## What to build

Stabilize the completed local command parity surface for programmatic use, migration, and external documentation. A completed slice should expose daemon-owned workflows through a typed Node daemon client, keep the existing direct Playwright launch API focused on real browser contexts and pages, publish command-parity and migration docs, update help text and README coverage, and add final compatibility hardening tests.

This is the final polish and API slice. It should not be used to discover or implement large missing command families from earlier slices.

## Acceptance criteria

- [ ] The existing direct Playwright Node API remains focused on launching Camoufox and returning real Playwright context/page access.
- [ ] A typed daemon client exposes canonical methods for implemented session, tab, ref, state, network, and artifact workflows without requiring users to shell out.
- [ ] CLI-only aliases and shell transports are not duplicated as unnecessary first-class Node API methods.
- [ ] Public daemon-client input and result types are exported and avoid raw untyped IPC exposure.
- [ ] Node API tests cover method shape, defaults, timeout/path propagation, structured results, and error normalization.
- [ ] A command-parity matrix documents Agent Browser command, Camoucli command, status, slice, Node API surface, notes, and test coverage.
- [ ] Migration notes explain local Camoufox scope, sessions/profiles/state, tabs/windows, network, debug, video/PDF caveats, Node API split, and unsupported commands.
- [ ] README and command help are audited for every implemented, adapted, deferred, unsupported, and out-of-scope command family.
- [ ] Unsupported commands consistently return stable structured error codes and useful alternatives in human and JSON output.
- [ ] Agent-facing workflow docs are updated only for commands that are stable enough for agents to use.
- [ ] Opt-in real Camoufox smoke coverage is documented or added for engine-sensitive behavior such as init scripts, state, route/unroute, trace, clipboard, PDF if attempted, video if implemented, and HAR.
- [ ] `npm run build` and `npm test` pass.

## Blocked by

- .scratch/agent-browser-command-parity/issues/11-core-aliases-and-eval-input-modes.md
- .scratch/agent-browser-command-parity/issues/12-direct-playwright-automation-commands.md
- .scratch/agent-browser-command-parity/issues/13-session-and-tab-lifecycle-parity.md
- .scratch/agent-browser-command-parity/issues/14-launch-option-compatibility.md
- .scratch/agent-browser-command-parity/issues/15-stateful-core-runtime-commands.md
- .scratch/agent-browser-command-parity/issues/16-cookies-storage-and-state-snapshots.md
- .scratch/agent-browser-command-parity/issues/17-network-route-request-log-and-har.md
- .scratch/agent-browser-command-parity/issues/18-debug-events-and-artifact-foundation.md
- .scratch/agent-browser-command-parity/issues/19-diff-vitals-pushstate-init-and-unsupported-commands.md
