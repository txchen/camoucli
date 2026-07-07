Status: resolved
Type: research
Blocked by: 03, 04, 05, 06

# Decide Node API Exposure

## Question

Which accepted parity commands should be exposed through Camoucli's first-class Node API wrappers rather than CLI-only daemon actions?

Consider current `src/index.ts` exports, existing API wrapper style, typed request/response ergonomics, browser-heavy behavior, and whether parity users need programmatic access for sessions, tabs, state, network, debug artifacts, and launch options.

## Answer

Expose parity behavior through two Node API layers:

1. Keep the existing `Camoufox` / `launchCamoufox` API Playwright-first. It should gain accepted launch options, but it should not duplicate every CLI/browser action that users can already perform on the returned Playwright `BrowserContext` or `Page`.
2. Add a separate typed daemon client, tentatively `CamouClient`, for command-parity workflows that depend on Camoucli-owned sessions, tabs, `@eN` refs, profiles, portable state snapshots, network routes/logs/HAR, debug buffers, artifacts, dialogs, frames, and active-tab behavior.

Implementation tickets should expose canonical semantic daemon-client methods alongside the typed IPC actions for accepted parity commands. Keep pure CLI aliases, shell input transports, human output flags, and unsupported CDP/provider/chat surfaces out of the public Node API.

Detailed method classification, API shape, typing rules, and test guidance are in [Node API Exposure Decision](../research/09-node-api-exposure.md).
