Status: ready-for-agent
Type: task

# Launch Option Compatibility

## Parent

.scratch/agent-browser-command-parity/PRD.md

## What to build

Add Camoufox-safe Agent Browser launch option compatibility for local persistent-context sessions. A completed slice should let users pass compatible launch-time options through CLI and Node launch surfaces, have those options applied before first navigation, and receive clear compatibility errors when trying to change immutable launch options on an already-running session.

Keep Camoucli's registry-managed Camoufox executable, centralized named profiles, and existing Camoufox-native launch controls. Do not add CDP/provider, arbitrary executable path, browser engine switching, Chrome extension, or restore-policy launch surfaces.

## Acceptance criteria

- [ ] Compatible launch globals are accepted for headed/headless behavior, proxy bypass, extra headers, user agent, HTTPS error handling, color scheme, reduced motion if included, launch-time init scripts, and launch-time storage state where supported by the state snapshot contract.
- [ ] Accepted options map to Playwright persistent-context options or existing Camoufox launch configuration.
- [ ] Launch-time init scripts are registered before first real navigation.
- [ ] Launch-time state snapshots are applied only for new sessions and reject clearly when the session is already running.
- [ ] Existing Camoufox-native browser, config, prefs, fingerprint, preset, locale, region, timezone, screen, window, and blocking launch controls remain preferred and compatible.
- [ ] Running-session compatibility checks cover every new immutable launch option.
- [ ] Unsupported launch surfaces produce structured errors if accepted for migration.
- [ ] Direct Playwright Node launch options gain idiomatic names where the existing public launch API needs to expose the accepted options.
- [ ] The slice includes schema/parser/defaults/output/help/docs coverage and launch compatibility tests.
- [ ] `npm run build` and `npm test` pass.

## Blocked by

- .scratch/agent-browser-command-parity/issues/13-session-and-tab-lifecycle-parity.md
