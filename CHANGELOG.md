# Changelog

All notable changes to this project will be documented in this file.

The format is loosely based on Keep a Changelog and uses semantic versioning.

## [0.3.0] - 2026-03-16

### Added

- Added Linux/macOS GitHub Actions CI for test, build, and package validation.
- Added compatibility-matrix workflows and local scripts for probing Camoufox vs `playwright-core` compatibility.
- Added broader browser automation commands including navigation, hover, type, check/uncheck, select, scroll, `get value`, and richer wait modes.
- Added higher-level Node API wrappers including `Camoufox`, `AsyncCamoufox`, and `resolveCamoufoxLaunchSpec()`.

### Changed

- Updated `README.md`, skill docs, and compatibility docs to reflect the first-class Node API and expanded command surface.
- Improved CI reliability by removing slow spawned `tsx` subprocesses from the CLI JSON tests.

### Fixed

- Fixed the macOS installer integration test to use platform-aware asset names and executable paths.

## [0.2.0] - 2026-03-15

### Added

- Added a public Node API so `camou` can be used from scripts, not just the CLI.
- Added `launchCamoufox()`, `launchCamoufoxContext()`, and `withCamoufox()` for Playwright-based programmatic control.
- Exported browser management helpers from the package root for script usage.

### Changed

- Documented the new Node script workflow in `README.md`.
- Updated the `camou` skill to explain when to use the CLI vs the Node API and how to drive Camou from scripts.

## [0.1.1] - 2026-03-15

### Added

- Added `skills/camou/` with a reusable Camou skill and workflow reference for AI assistants.
- Added this `CHANGELOG.md` so future releases have a maintained change history.

### Changed

- Reworked `README.md` to be more useful for npm users, first-time visitors, and agent-style workflows.
- Improved default non-JSON CLI output for common commands so everyday use is easier to scan.

### Fixed

- Fixed `camou session list` and `camou tab list` to print human-readable output instead of raw JSON when `--json` is not enabled.
- Added a readable non-JSON summary for `camou doctor` while preserving the full structured payload under `--json`.
- Cleaned up non-JSON output for actions like `open`, `click`, `fill`, `press`, `wait`, `session stop`, `tab new`, and `tab close`.

## [0.1.0] - 2026-03-15

### Added

- Initial public release of the `camou` npm package.
- Local CLI and daemon for driving Camoufox through Playwright without the Python SDK.
- Camoufox install, remove, version switching, compatibility probes, and doctor diagnostics.
- Persistent sessions, named tabs, snapshot refs, JSON output mode, presets, and integration tests.
