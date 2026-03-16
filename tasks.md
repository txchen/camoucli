# Tasks

Living task tracker for the remaining Camoucli work.

## Current Priorities

- [x] Add CI and compatibility matrix automation
  - run build/test/package validation on Linux, macOS, and Windows
  - add repeatable compatibility-matrix tooling for Camoufox vs `playwright-core`
- [x] Broaden the automation surface
  - expand navigation, interaction, wait, and data-extraction commands beyond the initial v1 set
- [x] Make the Node API first-class
  - provide a stronger programmatic wrapper on top of the current Playwright-based API
  - improve docs and examples for script-driven usage

## Recently Completed

- [x] Tighten Camoufox compatibility with the Python library launch contract
  - verify env chunking, prefs, release metadata assumptions, and broader version compatibility
- [x] Add integration tests for real workflows
  - cover install + launch, daemon startup/shutdown, profile reuse, tab isolation, snapshot refs, and version switching
- [x] Return structured JSON errors consistently when `--json` is enabled
  - make top-level CLI failures machine-readable, not just daemon responses
- [x] Expand `doctor` diagnostics
  - include missing shared library checks, system dependency hints, and clearer platform-specific remediation
- [x] Harden daemon and session lifecycle edge cases
  - stale PID/socket cleanup, external browser close/crash recovery, and profile lock handling
- [x] Improve config UX
  - add curated presets and stronger validation on top of raw config/prefs JSON
- [x] Finish docs and release prep
  - npm publishing polish, more usage examples, and a simple compatibility matrix

## Deferred / Later

- [ ] Add semantic locator commands
  - support patterns like `find role`, `find text`, and `find label`
- [ ] Add richer artifacts and debugging tools
  - capture console logs, page errors, HTML dumps, and optional traces
- [ ] Add optional remote or attach mode
  - let external Playwright clients connect to a `camou`-managed browser
- [ ] Optional remote Playwright or server mode
- [ ] BrowserForge-style higher-level fingerprint helpers
- [ ] CDP-heavy or streaming features
