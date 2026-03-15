# Changelog

All notable changes to this project will be documented in this file.

The format is loosely based on Keep a Changelog and uses semantic versioning.

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
