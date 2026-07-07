Status: resolved
Type: grilling
Blocked by: 01

# Decide Parity Scope Boundaries

## Question

Given the inventory, which categories of `agent-browser` commands count as desired Camoucli parity, and which are intentionally outside Camoucli's product boundary?

Resolve the scope boundary for at least these areas: Chromium/CDP/provider-only flows, MCP server, dashboard/chat/plugin/skills management, iOS/mobile-provider commands, local Camoufox-compatible browser automation commands, saved browser state, and debugging/artifact commands.

## Answer

Scope is **Local Browser Automation CLI Parity**: compatibility with `agent-browser` command-line workflows that can run through Camoucli's local Camoufox/Playwright daemon without adopting unrelated Agent Browser product surfaces.

In scope:

- Local Camoufox-compatible browser automation commands, even when they require new daemon IPC/actions: `read`, `dblclick`, `focus`, `drag`, `upload`, `download`, richer `wait`, richer `get`, `is`, semantic `find`, mouse/keyboard expansion, runtime `set`, tabs/windows/frames/dialogs, and CLI aliases like `goto`, `navigate`, `key`, and `scrollinto`.
- Saved local browser state: `state save/load/list/clear/show/clean/rename`, `storage local/session get/set/clear`, and richer `cookies get/set/clear`, including cURL-cookie import behavior.
- Debugging and artifact commands when they are portable to local Camoufox/Playwright: console/page errors, highlight, clipboard, richer screenshot, feasible recording, Playwright-style tracing, and possibly diff.

Out of scope for this effort:

- CDP/provider-only flows: `connect`, `stream`, provider abstractions, Browserbase-style remote providers, iOS/provider commands like `tap`, `swipe`, `device list`, and Chromium-specific profiler/DevTools behavior.
- Agent Browser integration surfaces: `mcp`, `dashboard`, `chat`, `plugin`/`plugins`, and `skills`.
- Agent Browser auth vault or plugin-backed credential flows. Local state/cookie/storage commands remain in scope.

Future efforts can revisit MCP, plugins, dashboard, or provider integrations independently, but they should not block the command-parity plan for the local automation CLI.
