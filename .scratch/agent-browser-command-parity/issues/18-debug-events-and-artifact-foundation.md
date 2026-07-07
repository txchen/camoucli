Status: ready-for-agent
Type: task

# Debug Events And Artifact Foundation

## Parent

.scratch/agent-browser-command-parity/PRD.md

## What to build

Add the portable debug event and artifact foundation for local Camoufox sessions. A completed slice should let users inspect and clear console/page-error buffers, visually highlight targets, operate on browser-page clipboard workflows, start/stop Playwright traces, and rely on consistent daemon-owned artifact path defaults.

This slice should create the common event and artifact runtime needed before later diff, vitals, init-script, PDF, video, or unsupported-command hardening work.

## Acceptance criteria

- [ ] Console event listeners capture per-session console entries with tab/page metadata and bounded memory use.
- [ ] Page-error listeners capture per-session uncaught page errors with useful metadata and bounded memory use.
- [ ] `console` and `errors` list current buffers, and `--clear` clears them with count metadata.
- [ ] Buffers clear on session stop or daemon shutdown and do not persist into profiles, states, traces, or HARs.
- [ ] `highlight <target>` resolves selectors and snapshot refs and applies a temporary portable page overlay or outline.
- [ ] Clipboard read/write operate through browser-page clipboard APIs where available, and copy/paste synthesize platform shortcuts with clear permission/secure-context/focus errors.
- [ ] `trace start` and `trace stop [path]` use Playwright context tracing and write trace zip artifacts through daemon-owned path resolution.
- [ ] Default artifact paths are consistent for screenshots, traces, HARs, diffs, PDFs, videos, and future artifact families where applicable.
- [ ] The slice includes schema/parser/defaults/output/help/docs coverage and fake-browser or focused mock tests for events, highlight, clipboard, trace, and artifact paths.
- [ ] `npm run build` and `npm test` pass.

## Blocked by

- .scratch/agent-browser-command-parity/issues/13-session-and-tab-lifecycle-parity.md
