# Changelog

All notable changes to this project will be documented in this file.

The format is loosely based on Keep a Changelog and uses semantic versioning.

## [0.6.1] - 2026-03-21

### Fixed

- Fixed `camou remote-versions` so missing fallback GitHub repos returning `404` no longer break remote version discovery.
- Preserved real GitHub API failures while skipping absent fallback repos during remote release scans.


## [0.6.0] - 2026-03-21

### Added

- Added `camou remote-versions` to list remotely available Camoufox releases that are compatible with the current machine.
- Added `listRemoteCamoufoxReleases()` to the public package exports for Node-side tooling and scripts.

### Changed

- Refactored Camoufox release discovery so remote version listing and `camou install` share the same compatibility filtering rules.
- Updated `README.md` with `remote-versions` examples, including a `--json` + `jq` automation snippet.

## [0.5.0] - 2026-03-16

### Added

- Added higher-level fingerprint helpers for CLI and Node usage, including multi-locale handling, screen/window profiles, helper JSON inputs, and Python-style toggle helpers.
- Added built-in screen profiles (`laptop-hd`, `desktop-fhd`, `desktop-qhd`, `retina-mac`) and window profiles (`laptop`, `desktop`, `desktop-large`, `retina`).
- Added `camou fingerprint-profiles` plus curated region profiles for locale/timezone/geolocation helper bundles.

### Changed

- Made `locale`-style launches keep `navigator.language`, `navigator.languages`, and `Accept-Language` aligned through the new helper layer.
- Extended CLI defaults so project config files and `CAMOU_*` environment variables can preconfigure fingerprint helper settings.
- Expanded the helper layer with region-aware defaults as a first step toward fuller geo-aware fingerprint helpers.

## [0.4.0] - 2026-03-16

### Added

- Added project-level CLI defaults via environment variables and local config files.
- Added support for default browser version, headless mode, and presets in `.camou.json` / `camou.json` and `CAMOU_*` environment variables.

### Changed

- Updated `README.md` and skill docs to document project defaults for vibe-coding workflows.
- Expanded default resolution precedence to explicit flags -> environment -> project config -> built-in defaults.

### Fixed

- Preserved explicit CLI overrides while applying session, tab, browser, headless, and preset defaults automatically.

## [0.3.1] - 2026-03-16

### Fixed

- Fixed the packaged `camou` CLI so it runs correctly when executed through npm-installed bin symlinks on Linux and macOS.
- Added regression coverage for symlinked bin execution to prevent silent no-op CLI failures in future releases.
- Made the new CLI bin regression test path-independent so it works correctly in CI and other checkout locations.

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
