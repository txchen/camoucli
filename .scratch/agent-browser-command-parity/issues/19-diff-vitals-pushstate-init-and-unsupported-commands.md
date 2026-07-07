Status: ready-for-agent
Type: task

# Diff, Vitals, Pushstate, Init Scripts, And Unsupported Commands

## Parent

.scratch/agent-browser-command-parity/PRD.md

## What to build

Complete the remaining portable debug/artifact parity commands and add honest unsupported behavior for excluded Agent Browser surfaces. A completed slice should let users compare snapshots or screenshots, compare two URLs, collect framework-agnostic web vitals, perform History API pushState navigation, manage init scripts within Playwright's limits, and receive structured unsupported errors for CDP/provider commands if accepted for migration.

Do not fake unsupported browser capabilities. Only add PDF if a real Camoufox smoke test proves it works; otherwise expose a clear unsupported result.

## Acceptance criteria

- [ ] `diff snapshot` captures the current snapshot and compares it with a baseline file or inline text using structured and human-readable diff output.
- [ ] `diff screenshot` compares a current screenshot with a baseline image only after an explicit small Node-compatible image diff approach is chosen.
- [ ] `diff url` serially captures two URLs, reports any final active URL mutation, and supports snapshot or screenshot comparison as accepted.
- [ ] `vitals` and `web-vitals` collect framework-agnostic metrics through portable browser performance APIs and return structured data.
- [ ] `pushstate <url>` performs same-document History API navigation and reports browser errors clearly for invalid or cross-origin URLs.
- [ ] `addinitscript <js>` registers daemon-owned init scripts for future documents.
- [ ] `removeinitscript <id>` either implements the accepted limited registry behavior or is deferred with clear docs if that limitation is too surprising.
- [ ] Unsupported compatibility commands and flags such as CDP/provider connect, inspect, profiler, and related excluded surfaces return structured unsupported errors with alternatives.
- [ ] PDF support is either smoke-tested and implemented narrowly or left as a structured unsupported command.
- [ ] The slice includes schema/parser/defaults/output/help/docs coverage, structured JSON error tests, and targeted fake-browser/helper tests for diff, vitals, pushstate, and init scripts.
- [ ] `npm run build` and `npm test` pass.

## Blocked by

- .scratch/agent-browser-command-parity/issues/14-launch-option-compatibility.md
- .scratch/agent-browser-command-parity/issues/18-debug-events-and-artifact-foundation.md
