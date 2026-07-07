# Node API Exposure Decision

Baseline:

- `agent-browser`: `/Users/txchen/code/github/agent-browser` at `ed2e105`.
- Camoucli: this workspace after `Plan Command Parity Implementation Slices`.

Primary sources:

- Current public exports: `src/index.ts:1`
- Current Playwright-based API wrapper: `src/api.ts:1`
- Current API docs: `README.md:165`
- Current API tests: `tests/api.test.ts:17`
- Current daemon IPC client: `src/ipc/client.ts:19`
- Current IPC schemas: `src/ipc/protocol.ts:8`
- Current CLI-to-daemon bridge: `src/cli/main.ts:19`
- Current CLI command parser: `src/cli/program.ts:132`
- Current daemon router/runtime boundary: `src/daemon/router.ts:9`, `src/browser/manager.ts:21`
- Launch config schema: `src/camoufox/config.ts:20`
- Accepted core parity: `.scratch/agent-browser-command-parity/research/03-core-automation-parity.md:1`
- Accepted state/storage/network parity: `.scratch/agent-browser-command-parity/research/04-state-storage-network-parity.md:1`
- Accepted debug/artifact parity: `.scratch/agent-browser-command-parity/research/05-debug-artifact-parity.md:1`
- Accepted session/tab/launch parity: `.scratch/agent-browser-command-parity/research/06-session-tab-launch-parity.md:1`
- Implementation slice plan: `.scratch/agent-browser-command-parity/research/08-command-parity-implementation-slices.md:1`

## Decision

Expose accepted parity behavior through two public Node API layers:

1. Keep the existing `Camoufox` / `launchCamoufox` API Playwright-first. It launches Camoufox in-process, returns a real Playwright `BrowserContext`, and should not grow one method per CLI command when Playwright already has the native method.
2. Add a separate typed daemon client for command parity workflows. This client should wrap daemon-owned sessions, tabs, snapshot refs, persistent profiles, state snapshots, network runtime state, and debug artifacts without requiring users to shell out to `camou`.

The important split is ownership:

- If behavior is a launch option or direct Playwright context/page capability, expose it through the existing `Camoufox` launch API only when Camoucli adds value.
- If behavior depends on Camoucli's daemon state, named sessions/tabs, `@eN` refs, managed paths, network/debug buffers, or CLI-compatible session lifecycle, expose it through the new daemon client.
- If behavior is only a CLI spelling, alias, input transport, or human-output concern, keep it CLI-only.

Do not publish raw IPC as the main API. The public API should be typed methods with typed result objects. IPC action names and schemas remain the internal transport contract between CLI/client and daemon.

## Proposed API Shape

Add a new public client module, exported from `src/index.ts`, with names in this direction:

- `CamouClient`
- `createCamouClient()`
- `withCamouClient()`
- `type CamouClientOptions`
- typed input/result interfaces for each exposed command family

Suggested usage:

```ts
import { CamouClient } from 'camou';

const camou = await CamouClient.create({
  session: 'script',
  tabName: 'main',
  headless: false,
});

await camou.open('https://example.com');
const snapshot = await camou.snapshot({ interactive: true });
await camou.click('@e1');
await camou.state.save('logged-in');
await camou.close();
```

The client should:

- Auto-start the daemon by default, mirroring CLI behavior, with an opt-out option for callers that only want to connect.
- Carry default `session`, `tabName`, launch options, paths, timeout, and verbosity.
- Normalize defaults once per request using the same semantics as the CLI where practical.
- Return structured data directly, never formatted human output.
- Surface `CamoucliError` / `IpcError` types already exported by `src/index.ts`.

Keep the existing `Camoufox` API focused on direct Playwright sessions:

```ts
import { Camoufox } from 'camou';

const camou = await Camoufox.launch({ session: 'script', userAgent: '...' });
const page = await camou.open('https://example.com');
await page.locator('button').click();
await camou.close();
```

That API should continue to expose `context`, `pages()`, `newPage()`, `open()`, launch metadata, and `close()`. It can gain launch option fields as parity adds them, but it should not duplicate every CLI command as a `CamoufoxSession` method.

## Expose Through Existing Launch API

Expose accepted launch options through `LaunchCamoufoxOptions`, `resolveCamoufoxLaunchSpec()`, `Camoufox.launch()`, `launchCamoufox()`, and daemon-client default launch options:

- `headed` / `headless`
- `proxy`, `proxyBypass`
- `extraHTTPHeaders` or `headers`
- `userAgent`
- `ignoreHTTPSErrors`
- `colorScheme`
- `reducedMotion`
- launch-time init scripts
- launch-time storage state
- launch-time record video if implemented
- launch-time record HAR if implemented

Prefer Playwright-style option names in the Node API when the underlying option is directly Playwright-shaped:

- `extraHTTPHeaders` over CLI `--headers`
- `ignoreHTTPSErrors` over CLI `--ignore-https-errors`
- `storageState` over CLI `--state`
- `recordVideo` / `recordHar` over CLI flag names

This keeps the Node API idiomatic while CLI flags can remain migration-friendly.

Do not expose Agent Browser launch surfaces that were ruled out:

- CDP connect/provider options
- arbitrary executable path
- browser engine switching
- Chrome extension loading
- restore-policy flags
- model/chat/action-policy flags

## Expose Through Daemon Client

Expose canonical semantic methods for daemon-owned parity actions. Do not expose every CLI alias as its own method.

Core browser workflow:

- `open(url?)`
- `navigate(url)` or `goto(url)` as one canonical method, not both unless compatibility pressure is strong
- `back()`, `forward()`, `reload()`
- `snapshot(options?)`
- `click(target, options?)`
- `hover(target)`
- `fill(target, text)`
- `type(target, text, options?)`
- `check(target)`, `uncheck(target)`
- `select(target, values)`
- `press(key)`, `keyDown(key)`, `keyUp(key)`
- `scroll(options?)`, `scrollIntoView(target)`
- `doubleClick(target)`, `focus(target)`
- `keyboard.type(text)`, `keyboard.insertText(text)`
- `mouse.move/down/up/wheel(...)`
- `upload(target, files)`
- `drag(source, target)`
- `wait(options)`
- `evaluate(expression, options?)`
- `screenshot(options?)`
- `get.url()`, `get.title()`, `get.text(target)`, `get.value(target)`, `get.html(target)`, `get.attr(target, attr)`, `get.count(target)`, `get.box(target)`, `get.styles(target)`
- `is.visible(target)`, `is.enabled(target)`, `is.checked(target)`
- `find.*(...)` helpers only if they return a reusable locator descriptor or execute a narrow command through the daemon; avoid pretending they are Playwright `Locator` objects.

Session, tab, profile, and close behavior:

- `session.current()`, `session.id(options?)`, `session.info()`, `session.list()`, `session.stop(name?)`
- `close()`, `closeAll()`
- `tab.list()`, `tab.new(options?)`, `tab.switch(target)`, `tab.close(target?)`
- `window.new(options?)`, documented as a new Playwright page, not a guaranteed OS window
- `profile.list()`, `profile.inspect(name)`, `profile.remove(name)` if keeping profile management discoverable from Node

State, storage, cookies:

- `cookies.get(urls?)`, `cookies.set(cookie)`, `cookies.setFromCurl(input)`, `cookies.clear()`
- existing `cookies.export(path?)`, `cookies.import(path)`
- `storage.local.get(key?)`, `storage.local.set(key, value)`, `storage.local.clear()`
- `storage.session.get(key?)`, `storage.session.set(key, value)`, `storage.session.clear()`
- `state.save(nameOrPath)`, `state.load(nameOrPath)`, `state.list()`, `state.show(nameOrPath)`, `state.clear(nameOrPath | { all: true })`, `state.clean(options)`, `state.rename(oldNameOrPath, newName)`

Network:

- `network.route(url, options)`
- `network.unroute(url?)`
- `network.requests(options?)`
- `network.request(id)`
- `network.har.start(options?)`
- `network.har.stop(path?)`

Debug and artifacts:

- `console.list()`, `console.clear()`
- `errors.list()`, `errors.clear()`
- `highlight(target, options?)`
- `clipboard.read()`, `clipboard.write(text)`, `clipboard.copy()`, `clipboard.paste()`
- `trace.start(options?)`, `trace.stop(path?)`
- `diff.snapshot(options?)`, `diff.screenshot(options?)`, `diff.url(url1, url2, options?)`
- `vitals(options?)`
- `pushState(url)`
- `initScripts.add(scriptOrPath, options?)`, `initScripts.remove(id)`

Downloads, frames, dialogs, read:

- `download(target, path, options?)`
- `waitForDownload(options?)`
- `set.viewport(...)`, `set.geolocation(...)`, `set.offline(...)`, `set.headers(...)`, `set.credentials(...)`, `set.media(...)`
- `frame.use(selectorOrRef)`, `frame.main()`, `frame.current()`
- `dialog.status()`, `dialog.accept(text?)`, `dialog.dismiss()`
- `read(options?)`

These wrappers are useful because they operate on daemon state that is otherwise not accessible through a raw Playwright `BrowserContext` returned by `Camoufox.launch()`.

## Keep CLI-Only

Keep these out of the first-class Node API:

- Pure aliases: `goto` plus `navigate` as separate names, `key`, `scrollinto`, `quit`, `exit`, `web-vitals`.
- CLI input transports: `eval --stdin`, `eval --base64`, `--json`, human output flags, shell-oriented path disambiguation.
- Help/docs compatibility commands.
- Unsupported compatibility stubs for `connect`, `inspect`, `profiler`, provider flags, CDP flags, restore-policy flags, and chat/MCP/plugin surfaces.

The daemon client can have one canonical method where a CLI alias exists. For example, expose `press()` but not `key()`, and expose `scrollIntoView()` but not `scrollinto()`.

## Type And Stability Rules

Implementation tickets should add Node API wrappers in the same vertical slice as the underlying daemon actions when the action is classified above as public.

Rules:

- Define exported input/result interfaces for public methods.
- Keep raw `DaemonRequest` and low-level `sendDaemonRequest()` internal unless a future advanced API is intentionally designed.
- Public result types should match JSON output semantics, not human CLI formatting.
- Avoid `unknown` result data in public wrappers; parse or narrow responses before returning.
- Do not expose Playwright `Locator` through the daemon client. A locator is process-bound to a `Page`; the daemon client crosses an IPC boundary.
- Where a method maps to an optional path, return the resolved absolute path chosen by the daemon.
- Where a method mutates active tab/session state, return enough metadata for scripts to continue deterministically: session name, tab name/id, URL, title, artifact path, request id, or script id as appropriate.

Testing:

- Add API unit tests alongside each exposed client family.
- Mock `ensureDaemonRunning` and `sendDaemonRequest` for method-shape tests.
- Add one integration-style test per major namespace that verifies defaults, timeout propagation, and error normalization.
- Keep existing `Camoufox` API tests for direct launch behavior separate from daemon-client tests.

## Rationale

The current public API is intentionally Playwright-based: it launches Camoufox and hands the caller a real `BrowserContext`. That is the right interface for direct Node scripts that want page and locator control.

Agent Browser command parity is different. Most accepted parity features are valuable because Camoucli owns persistent sessions, tab names, snapshot refs, managed profile/state/artifact paths, in-memory network routes, request logs, dialogs, console buffers, and traces. A Node user cannot reliably reach that state by calling Playwright directly in a separate process.

A dedicated daemon client keeps both use cases clean:

- `Camoufox` remains the direct Playwright wrapper.
- `CamouClient` becomes the typed programmatic equivalent of the CLI command surface.
- CLI aliases and shell conveniences do not clutter the package API.
- The daemon remains the single owner of browser lifecycle and persistent runtime state.
