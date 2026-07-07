# Agent Browser Migration Notes

Camoucli is not a remote-provider or CDP compatibility layer. It drives local Camoufox Firefox through Playwright, with a local daemon owning persistent browser sessions, tabs, snapshot refs, and artifacts.

## Local Scope

Camoucli launches registry-managed Camoufox builds from the local machine. It does not attach to Browserbase, Chrome DevTools Protocol targets, arbitrary browser engines, extension-hosted browsers, or provider-managed browsers.

Unsupported migration surfaces return structured `unsupported_command` errors where accepting the syntax helps migration:

| Agent Browser surface | Camoucli status | Alternative |
| --- | --- | --- |
| `connect`, `--cdp`, `--provider` | unsupported | Use `camou open` or `CamouClient.open()` with a managed local session. |
| `inspect` | unsupported | Use `trace`, `console`, `errors`, `screenshot`, `get`, or the matching `CamouClient` methods. |
| `profiler` | unsupported | Use Playwright traces through `trace start/stop` or `client.trace.*`. |
| arbitrary executable path / engine / extension / restore policy | unsupported | Use `camou install`, `camou use`, `--browser`, and named sessions/profiles. |
| auth vault, MCP, dashboard, chat, plugins, skills, self-upgrade | out of scope | Handle these outside Camoucli's local browser daemon. |
| `pdf`, video | unsupported until smoke-proven | Use screenshots or direct Playwright only after validating support in your environment. |

## Sessions, Profiles, And State

`--session <name>` selects a persistent Firefox profile directory under Camoucli's managed profile storage. Reusing the same session preserves logins, cookies, cache, and other browser profile data.

`profile` commands manage full persistent Firefox profile directories. `state` commands manage portable Playwright storage-state JSON snapshots. A state file can move cookies and localStorage between sessions, but it is not a full profile restore and does not replace the existing profile directory.

`state load` merges cookies and localStorage into a running session. It is not a pristine profile reset; stop the session or use a new session name when you need a clean browser profile.

## Tabs And Windows

Camoucli tracks tabs by name/id inside a daemon session. Browser commands resolve the target tab from explicit `--tabname`, configured defaults, the daemon active tab, then `main`.

`tab new --label <name>` treats the label as the Camoucli tab name. `tab <target>` can switch by tab name, generated id such as `t2`, or legacy zero-based index.

`window new` creates a new tracked Playwright page. Firefox/Playwright does not guarantee a separate OS-level browser window.

## Snapshot Refs

`snapshot` creates refs such as `@e1` per tab. Refs are invalidated by navigation and by the next snapshot for that tab. Scripts and agents should re-run `snapshot -i` after navigation, submission, modal changes, or major rerenders before using old refs.

## Network

Network parity is Playwright-backed and local-session scoped:

- `network route` and `network unroute` mutate Playwright context routes in the running daemon session.
- `network requests` reads a bounded in-memory request buffer.
- `network har start/stop` captures an in-memory HAR buffer and writes a HAR artifact when stopped.

Routes, request logs, and HAR buffers are not persisted into browser profiles or state snapshots. They clear when the session stops or the daemon exits. CDP Fetch/Network, provider request inspection, persisted network state, and response-body capture are unsupported.

## Debug And Artifacts

`console`, `errors`, `highlight`, `clipboard`, `trace`, `diff`, `vitals`, and init-script commands are daemon-owned runtime workflows. Console/page-error buffers and network buffers live only in the running daemon. Trace, screenshot, HAR, and diff files resolve under per-session artifact directories.

`trace` is Playwright tracing, not a CDP trace/profiler. `removeinitscript` reports Playwright's current-context limitation honestly: registered context init scripts cannot be removed from an already-running context.

## Node API Split

Use the direct Playwright API when you want real Playwright objects:

```ts
import { Camoufox } from 'camou';

const browser = await Camoufox.launch({ session: 'script' });
const page = await browser.open('https://example.com');
await page.locator('button').click();
await browser.close();
```

Use the daemon client when you want command-parity workflows without shelling out:

```ts
import { CamouClient } from 'camou';

const camou = CamouClient.create({ session: 'script', tabName: 'main' });
await camou.open('https://example.com');
const snapshot = await camou.snapshot({ interactive: true });
await camou.click('@e1');
await camou.state.save('logged-in');
await camou.close();
```

`CamouClient` returns structured result objects and raises Camoucli error classes. It intentionally omits CLI-only aliases such as `goto`, `navigate`, `key`, `scrollinto`, `quit`, `exit`, and `web-vitals`, plus unsupported stubs such as `connect`, `inspect`, `profiler`, and `pdf`.
