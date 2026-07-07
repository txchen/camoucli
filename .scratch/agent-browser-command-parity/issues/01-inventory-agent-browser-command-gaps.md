Status: resolved
Type: research
Blocked by:

# Inventory Agent Browser Command Gaps

## Question

What is the exact current command and option gap between `agent-browser` and Camoucli, grouped by command family and by whether Camoucli already has an equivalent, a partial equivalent, or no equivalent?

The answer should cite local source paths and include enough detail to drive later decisions without reopening the whole `agent-browser` parser. Use `agent-browser` at `/Users/txchen/code/github/agent-browser` commit `ed2e105` and Camoucli in this workspace as the comparison baseline.

## Answer

Resolved in [Command Gap Inventory](../research/01-command-gap-inventory.md).

The current gap is not just missing top-level commands. Camoucli's user-facing surface is narrower and its IPC schema only supports the existing daemon actions, so most parity work will require daemon protocol and browser-manager changes as well as CLI aliases.

Inventory result:

- Covered or close: install/version helpers, core back/forward/reload navigation, basic element actions, basic snapshot, basic `get`, basic `wait`, screenshot, eval, cookie file import/export, session/profile management, and basic tab list/new/close.
- Partial equivalents: `open`, `close`, `click`, `type`, `select`, `scroll`, `scrollintoview`, `snapshot`, `wait`, `screenshot`, `eval`, `cookies`, tabs, session/profile semantics, and global launch options.
- Missing automation families: `read`, `dblclick`, `focus`, `drag`, `upload`, `download`, keyboard expansion, richer `get`, `is`, semantic `find`, mouse control, runtime `set`, windows, frames, dialogs, and mobile/provider commands.
- Missing state/network/debug/integration families: web storage, saved state, network route/request/HAR, auth vault, confirm/deny, inspect/connect/stream, PDF/video/trace/profiler, console/errors/highlight/clipboard, diff, batch, React/vitals/pushstate, remove init script, MCP, dashboard, plugins, skills, chat, and self-upgrade.

No new Wayfinder ticket is needed from this inventory; the existing blocked tickets cover the follow-up decisions.
