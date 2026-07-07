Status: resolved
Type: research
Blocked by: 08, 09

# Plan Docs Help Test Strategy

## Question

What documentation, help text, compatibility-matrix updates, and test strategy should accompany the accepted command-parity implementation?

Cover command help, README/API docs, migration notes from Agent Browser terminology to Camoucli semantics, unsupported-command messaging, unit tests, fake Playwright tests, integration tests, and real Camoufox smoke tests.

## Answer

Docs and tests should ship with each vertical implementation slice, not as a deferred cleanup pass. Add a separate Agent Browser command-parity matrix instead of overloading the existing Camoufox/Playwright compatibility matrix.

Recommended documentation:

- `docs/agent-browser-command-parity.md` for command-by-command status: supported, adapted, deferred, unsupported, or out of scope.
- `docs/agent-browser-migration.md` for terminology and semantic differences: sessions, profiles vs state, tabs/labels, window behavior, network/debug limitations, and unsupported CDP/provider surfaces.
- Expanded README sections by command family, with the full matrix linked rather than pasted.
- Node API docs that keep `Camoufox` Playwright-first and introduce `CamouClient` for daemon command-parity workflows once implemented.

Recommended test strategy:

- Parser/help/defaults/schema/output unit tests for every added command shape.
- Fake Playwright daemon tests for browser behavior and daemon-owned runtime state.
- `CamouClient` API tests alongside exposed daemon-client methods.
- Sparse spawned CLI integration tests for shell/error/defaults workflows.
- Opt-in real Camoufox smoke tests for features whose support depends on actual Firefox/Camoufox behavior, especially PDF, video, clipboard, trace, launch-time state/init scripts, route/HAR, downloads, and popup tracking.

Detailed docs, help wording, matrix columns, migration topics, test placement, smoke coverage, and future ticket acceptance criteria are in [Docs, Help, And Test Strategy](../research/10-docs-help-test-strategy.md).
