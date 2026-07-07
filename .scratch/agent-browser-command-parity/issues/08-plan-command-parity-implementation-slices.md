Status: resolved
Type: research
Blocked by: 03, 04, 05, 06

# Plan Command Parity Implementation Slices

## Question

How should the accepted `agent-browser` parity commands be grouped into independently implementable Camoucli tickets?

Produce an implementation-ready sequence that respects Camoucli's architecture: thin CLI, typed IPC, daemon-owned sessions/tabs/refs/state/artifacts, Node >=20 ESM, Playwright Core over local Camoufox, no Python SDK, and no Bun-specific runtime behavior.

Cover vertical slices across CLI parsing, IPC schemas, daemon runtime/state, browser manager behavior, output formatting, and focused tests. Separate low-risk parser/Playwright-native additions from changes that alter session/tab lifecycle, launch compatibility, persistent state, network tracking, debug artifacts, or runtime command state.

## Answer

Implement Agent Browser CLI parity as vertical CLI+IPC+daemon+output+test slices, rather than command-family rewrites. Start with low-risk aliases and direct Playwright automation, then add the runtime foundations that heavier command families depend on.

Recommended implementation sequence:

1. Core aliases and CLI-only parsing.
2. Direct Playwright locator/input/get/wait commands.
3. Session and tab lifecycle foundation.
4. Launch options and compatibility foundation.
5. Stateful runtime commands: downloads, frames, dialogs, read, and runtime `set`.
6. Cookies, storage, and portable state snapshots.
7. Network route, request log, and HAR.
8. Debug events and artifact foundation.
9. Diff, vitals, pushstate, init scripts, and explicit unsupported commands.
10. Polish, compatibility hardening, docs-ready help, and smoke coverage.

The first implementation tickets should be:

1. Implement core aliases and eval input modes.
2. Implement direct Playwright locator/input/get/wait commands.
3. Implement screenshot selector/format/quality and richer waits.

Detailed slice boundaries, dependencies, exit criteria, and test guidance are in [Command Parity Implementation Slices](../research/08-command-parity-implementation-slices.md).
