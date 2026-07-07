Status: resolved
Type: research
Blocked by: 01, 02

# Decide Session Tab Launch Parity

## Question

How should Camoucli adapt `agent-browser` session, tab, launch, and global-option behavior without violating its Camoufox-first daemon architecture?

Cover `session id/info/list`, `close --all`, tab switching and labels, window creation, launch-only `open`, `connect`, restore/save policies, profile/state flags, proxy/header/download/user-agent/extension/init-script options, global output controls, and compatibility with existing Camoucli `--session`, `--tabname`, presets, fingerprints, and daemon commands.

## Answer

Camoucli should adopt Agent Browser's local session/tab/launch ergonomics where they fit a local Camoufox persistent-context daemon: `session`, `session id`, `session info`, current-session `close` with `quit`/`exit` aliases, `close --all`, launch-only `open`, `goto`/`navigate` aliases, active-tab switching, tab labels mapped onto Camoucli tab names, `click --new-tab`, and `window new` as a new top-level page.

Camoucli should preserve its existing architecture and naming: `--session`, `--tabname`, Camoufox registry-managed browser versions, project defaults, named profiles under `profiles/<session>`, presets/fingerprints, and daemon commands remain first-class. Agent Browser CDP/provider surfaces (`connect`, `--cdp`, `--auto-connect`, `--provider`) and restore policy flags should stay out of this local parity scope.

Launch options should be added only when they map cleanly to Playwright persistent context or existing Camoufox config: proxy bypass, headers, user agent, ignore HTTPS errors, color scheme/reduced motion, launch-time init scripts, launch-time storage state, and later launch-time video/HAR. Arbitrary executable paths, Chrome extensions, engine switching, action policy, and Agent Browser config/env conventions should not override Camoucli's existing model.

Detailed semantics, compatibility rules, implementation shape, and test guidance are in [Session Tab Launch Parity Decision](../research/06-session-tab-launch-parity.md).
