---
name: camou
description: Local Camoufox browser automation for AI agents. Use when the user needs to drive websites with the `camou` CLI, preserve login state, interact with pages, switch Camoufox versions, troubleshoot compatibility, or write Node scripts against Camou's Playwright-based API.
allowed-tools: Bash(camou:*), Bash(npx camou:*), Bash(node:*), Bash(npm:*)
hidden: true
---

# camou

This file is a discovery stub, not the usage guide. Load the version-matched skill content from the installed CLI before running Camou commands:

```bash
camou skills get core
camou skills get core --full
npx camou skills get core
npx camou skills get core --full
npm run dev -- skills get core
npm run dev -- skills get core --full
```

The CLI-served skill content ships with the installed `camou` version, so command guidance stays aligned with the local CLI.

Emergency loop:

```bash
camou doctor --json
camou open <url> --json
camou snapshot -i --json
camou click @e1 --json
camou snapshot -i --json
```

Refs such as `@e1` are per tab and become stale after navigation or a new snapshot. Re-run `snapshot -i` before reusing refs.
