---
name: migration
description: Agent Browser to Camou migration guidance. Use when porting agent-browser commands, scripts, skills, or workflows to Camoucli, explaining supported/adapted/unsupported command families, replacing provider/CDP/Electron/Slack/cloud assumptions, or choosing Camou alternatives for local Camoufox automation.
allowed-tools: Bash(camou:*), Bash(npx camou:*), Bash(node:*), Bash(npm:*)
---

# Camou Migration

Use this skill when converting Agent Browser workflows to Camou. Camou is not a drop-in provider layer. It is a local Camoufox + Playwright daemon with persistent profiles, named sessions, named tabs, snapshot refs, network buffers, and artifacts.

## First Commands

```bash
camou install
camou doctor --json
camou skills get core --full
```

Use `docs/agent-browser-command-parity.md` in this repo for the full matrix when working inside Camoucli.

## Good Mappings

These usually map directly or with small naming changes:

```bash
agent-browser open <url>          -> camou open <url>
agent-browser goto <url>          -> camou goto <url>
agent-browser navigate <url>      -> camou navigate <url>
agent-browser snapshot -i         -> camou snapshot -i
agent-browser click @e1           -> camou click @e1
agent-browser fill @e2 text       -> camou fill @e2 text
agent-browser type @e2 text       -> camou type @e2 text
agent-browser press Enter         -> camou press Enter
agent-browser key Enter           -> camou key Enter
agent-browser scrollintoview @e1  -> camou scrollintoview @e1
agent-browser scrollinto @e1      -> camou scrollinto @e1
agent-browser screenshot page.png -> camou screenshot page.png
agent-browser close --all         -> camou close --all
```

After every navigation or page mutation, run `camou snapshot -i` again. Refs are per tab and clear on navigation or a new snapshot.

## Sessions And State

Agent Browser session ideas map to Camou sessions and profiles, but Camou uses local Firefox persistent profiles:

```bash
camou open https://app.example.com --session work --tabname main
camou state save auth --session work
camou state load auth --session other
camou profile inspect work
```

Definitions:

- `--session`: local browser workspace and persistent Firefox profile.
- `--tabname`: named page inside a session.
- `profile`: full persistent browser data on disk.
- `state`: portable Playwright storage-state JSON, not a full profile.

## Network And Debug

Use Playwright-backed local network/debug commands:

```bash
camou network route '**/api' --body '{"ok":true}' --content-type application/json
camou network requests --json
camou network har start
camou network har stop capture.har
camou console --json
camou errors --json
camou trace start --screenshots --sources
camou trace stop trace.zip
```

Routes, request logs, HAR buffers, console buffers, and page-error buffers live in the daemon process. They do not persist into profiles or state files.

## Node Scripts

Replace shell-heavy scripts with one of two Node APIs.

Use `Camoufox` for direct Playwright:

```ts
import { Camoufox } from 'camou';

await Camoufox.with({ session: 'script' }, async (camou) => {
  const page = await camou.open('https://example.com');
  await page.locator('button').click();
});
```

Use `CamouClient` for daemon command parity:

```ts
import { CamouClient } from 'camou';

const camou = CamouClient.create({ session: 'script', tabName: 'main' });
await camou.open('https://example.com');
await camou.snapshot({ interactive: true });
await camou.click('@e1');
await camou.close();
```

Prefer canonical Node method names. CLI-only aliases such as `key`, `scrollinto`, `web-vitals`, `goto`, and `navigate` are compatibility conveniences.

## Unsupported Surfaces

Do not port these as if Camou supports them:

- Chrome CDP attach
- Browserbase or other provider browsers
- arbitrary browser engines
- Electron desktop automation
- Slack-specific automation
- Vercel Sandbox browser orchestration
- AWS Bedrock AgentCore browsers
- auth vault
- dashboard
- video recording
- PDF export
- MCP/plugin/chat/self-upgrade surfaces

Camou exposes migration stubs for some unsupported commands and flags so errors are explicit:

```bash
camou connect --cdp 9222 --json
camou inspect --json
camou profiler --json
camou pdf out.pdf --json
```

Use local alternatives such as `open`, `trace`, `console`, `errors`, `screenshot`, `network`, and `CamouClient`.

## Migration Checklist

1. Install Camou and a compatible Camoufox build.
2. Replace provider/CDP assumptions with named local sessions.
3. Replace auth vault use with profiles, cookies, or storage-state files.
4. Replace video evidence with screenshots and traces.
5. Replace Chrome-specific debugging with Playwright trace, console, errors, network, and HAR.
6. Re-run snapshot after every page-changing action.
7. Run `camou doctor --json` before diagnosing browser launch failures.
