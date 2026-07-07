Status: ready-for-agent
Type: task

# Network Route, Request Log, And HAR

## Parent

.scratch/agent-browser-command-parity/PRD.md

## What to build

Add portable Playwright-backed network parity for local Camoufox sessions. A completed slice should let users route or unroute matching requests, inspect an in-memory request buffer, fetch request details, and capture a portable HAR artifact, all scoped to the current daemon-owned session.

Do not implement CDP Fetch/Network, provider request inspection, persisted network state, or response body capture beyond what is explicitly accepted for this first local parity pass.

## Acceptance criteria

- [ ] `network route <url>` supports abort or fulfill-body behavior with optional resource-type filters and rejects no-op routes.
- [ ] `network unroute [url]` removes one route or all relevant routes for the current session.
- [ ] Network routes are scoped to the session context, apply to current and future tabs, and clear on session stop or daemon shutdown.
- [ ] Request/response/failure listeners populate a per-session in-memory request ring buffer.
- [ ] `network requests` returns filtered request summaries and supports clearing the buffer.
- [ ] `network request <requestId>` returns useful request, response, failure, timing, and tab/page metadata for one buffered request.
- [ ] `network har start` starts a per-session HAR buffer, and `network har stop [path]` writes a HAR 1.2 JSON artifact through daemon-owned path resolution.
- [ ] Network logs, routes, and HAR buffers do not persist into profiles or state snapshots.
- [ ] The slice includes schema/parser/defaults/output/help/docs coverage, request filter tests, HAR shape tests, and fake-browser route/request tests.
- [ ] `npm run build` and `npm test` pass.

## Blocked by

- .scratch/agent-browser-command-parity/issues/13-session-and-tab-lifecycle-parity.md
