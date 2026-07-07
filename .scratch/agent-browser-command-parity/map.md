# Agent Browser Command Parity Map

Labels: wayfinder:map

## Destination

Decide which user-facing `agent-browser` CLI commands should be added to Camoucli, which should be adapted to Camoucli's local Camoufox/Playwright architecture, and which should stay out of scope. The endpoint is an implementation-ready command-parity plan, not the implementation itself.

## Notes

- Use the `wayfinder` skill for this effort; use `domain-modeling` when terms like "parity", "compatibility", "provider", "session", "state", or "profile" become ambiguous.
- Source baseline for `agent-browser`: `/Users/txchen/code/github/agent-browser` at `ed2e105`, especially `cli/src/commands.rs`, `cli/src/main.rs`, and `skill-data/core/references/commands.md`.
- Source baseline for Camoucli: this repo's `src/cli/program.ts`, `src/ipc/protocol.ts`, daemon router/runtime, and tests under `tests/`.
- Preserve Camoucli's architecture from `AGENTS.md`: Node >=20, thin CLI, daemon-owned browser lifecycle/sessions/tabs/refs/state, newline-delimited JSON IPC, Playwright Core over Camoufox Firefox, no Python SDK dependency, no Bun-specific runtime behavior.
- Initial comparison found Camoucli already covers install/remove/use/versions/remote-versions/path/version/doctor, core navigation, snapshot, click/hover/fill/type/check/uncheck/select/press/scroll/scrollintoview/screenshot/wait, eval, cookies import/export, session/profile/daemon basics, and tab list/new/close.
- Scope is Local Browser Automation CLI Parity: command-line workflows that can run through Camoucli's local Camoufox/Playwright daemon without adopting unrelated Agent Browser product surfaces.

## Decisions so far

- [Inventory Agent Browser Command Gaps](issues/01-inventory-agent-browser-command-gaps.md) — Camoucli covers the narrow core automation path, but `agent-browser` has many partial variants and absent command families; the detailed inventory is in [Command Gap Inventory](research/01-command-gap-inventory.md).
- [Decide Parity Scope Boundaries](issues/02-decide-parity-scope-boundaries.md) — In scope: local automation commands, local saved state/storage/cookies, and portable debugging/artifacts; out of scope: CDP/provider-only flows and Agent Browser integration surfaces.
- [Decide Core Automation Parity](issues/03-decide-core-automation-parity.md) — First core slice should be direct Playwright-native CLI parity; stateful local commands like launch-only open, downloads, runtime settings, frames, dialogs, and read remain accepted but later.
- [Decide State Storage Network Parity](issues/04-decide-state-storage-network-parity.md) — Adopt cookies/storage/state and Playwright-backed network route/request/HAR parity with Camoucli lifetimes: profiles persist browser data, state files are portable snapshots, network data is in-memory per session.
- [Decide Debug Artifact Parity](issues/05-decide-debug-artifact-parity.md) — Adopt portable console/errors/highlight/clipboard/trace/screenshot/diff/vitals/pushstate/init-script commands; exclude CDP profiler/DevTools inspect and defer record/PDF until Camoufox-safe semantics are proven.
- [Decide Session Tab Launch Parity](issues/06-decide-session-tab-launch-parity.md) — Adopt Camoufox-safe session/tab/launch ergonomics while preserving Camoucli `--session`/`--tabname`, profiles, presets, fingerprints, and daemon model; exclude CDP/provider/restore-policy surfaces.
- [Plan Command Parity Implementation Slices](issues/08-plan-command-parity-implementation-slices.md) — Implement parity as vertical CLI+IPC+daemon+output+test slices, starting with low-risk aliases/direct Playwright commands before session/tab, launch, state, network, and debug runtimes.
- [Decide Node API Exposure](issues/09-decide-node-api-exposure.md) — Keep `Camoufox` as the direct Playwright launch API, and add a separate typed daemon client for command-parity workflows that need Camoucli sessions, tabs, refs, state, network, and artifacts.
- [Plan Docs Help Test Strategy](issues/10-plan-docs-help-test-strategy.md) — Ship docs, help text, command-parity matrix updates, migration notes, and focused tests with each implementation slice; keep real Camoufox smoke tests opt-in for engine-dependent behavior.

## Not yet specified

- None. The remaining planning work has graduated into open child tickets.

## Out of scope

- Implementing parity commands during this charting session.
- [Decide Integration Surfaces](issues/07-decide-integration-surfaces.md) — MCP, dashboard, chat, plugin/skills management, and provider abstractions are outside this local browser automation CLI parity effort.
