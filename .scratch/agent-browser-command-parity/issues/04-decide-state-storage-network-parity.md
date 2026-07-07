Status: resolved
Type: research
Blocked by: 01, 02

# Decide State Storage Network Parity

## Question

Which `agent-browser` state, storage, cookie, and network commands should Camoucli adopt, and how should they map onto Camoucli's daemon-owned sessions and profile directories?

Cover `cookies` get/set/clear and cURL import behavior, `storage local/session`, `state save/load/list/clear/show/clean/rename`, network route/unroute/request inspection/HAR commands, request tracking lifetime, and interactions with Camoucli's existing cookies import/export and profile management.

## Answer

Camoucli should adopt cookies get/set/clear with cURL-cookie import, `storage local/session`, portable `state save/load/list/clear/show/clean/rename`, and Playwright-backed network route/unroute/request/HAR commands.

The key adaptation is lifetime: full browser persistence stays in Camoucli profiles under `profiles/<session>`, while `state` is a separate portable Playwright-compatible storage-state snapshot directory. Cookies and storage mutate the current daemon-owned session. Network routes, request logs, and HAR buffers are per-session daemon memory, not profile or state-snapshot data.

Network parity should use Playwright APIs rather than Agent Browser's CDP Fetch/Network implementation. `network route/unroute` and request inspection are accepted. `network har start/stop` is accepted as a portable HAR-from-tracked-events feature; full Playwright `recordHar` with content attachments should be deferred to launch/debug artifact work.

Detailed semantics and implementation notes are in [State Storage Network Parity Decision](../research/04-state-storage-network-parity.md).
