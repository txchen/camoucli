# Compatibility Matrix Tooling

Camou includes cross-platform CI and a repeatable compatibility-matrix workflow so it is easier to track which Camoufox builds launch with the currently bundled `playwright-core` version.

## GitHub Actions

- CI workflow: `.github/workflows/ci.yml`
  - runs `npm test`, `npm run build`, and `npm pack --dry-run`
  - covers Linux, macOS, and Windows
- Compatibility workflow: `.github/workflows/compatibility-matrix.yml`
  - installs selected Camoufox versions
  - runs `camou doctor --json`
  - uploads a generated markdown matrix artifact

The compatibility workflow is available through:

- manual dispatch
- a weekly scheduled run

## Local Usage

Generate a raw compatibility report:

```bash
node scripts/run-compatibility-report.mjs --output compatibility-report.json
```

Pick explicit versions:

```bash
node scripts/run-compatibility-report.mjs \
  --version 135.0.1-beta.24 \
  --version 135.0.1-beta.23 \
  --output compatibility-report.json
```

Or use an environment variable:

```bash
CAMOUFOX_VERSIONS=135.0.1-beta.24,135.0.1-beta.23 \
node scripts/run-compatibility-report.mjs --output compatibility-report.json
```

Convert one or more reports into markdown:

```bash
node scripts/generate-compatibility-matrix.mjs compatibility-report.json
```

Write the markdown to a file:

```bash
node scripts/generate-compatibility-matrix.mjs \
  compatibility-report-linux.json \
  compatibility-report-macos.json \
  compatibility-report-windows.json \
  --output compatibility-matrix.md
```

## What The Report Contains

Each raw JSON report includes:

- platform and architecture
- Node version
- requested Camoufox versions
- install attempt results
- `camou versions --json` output
- `camou doctor --json` output

The generated markdown matrix summarizes:

- platform
- Node version
- Playwright version
- Camoufox version
- whether it is the active version
- whether it launches successfully
- any install or launch errors
