# Agent Browser Command Parity

Camoucli supports selected `agent-browser` workflows through a local Camoufox Firefox browser controlled by Playwright. Compatibility aliases may exist in the CLI, but browser lifecycle, sessions, tabs, snapshot refs, profiles, state files, network buffers, and artifacts remain daemon-owned.

Statuses: `supported`, `adapted`, `deferred`, `unsupported`, and `out of scope`.

## Matrix

| Agent Browser command | Camoucli command | Status | Slice | Node API surface | Notes | Test coverage |
| --- | --- | --- | --- | --- | --- | --- |
| `open [url]` | `open [url]` | adapted | 11 core aliases | `CamouClient.open()` | Ensures the session/tab exists; optional URL navigation uses the daemon active-tab model. | parser, defaults, schema, fake browser, output, integration, API |
| `goto <url>`, `navigate <url>` | `goto <url>`, `navigate <url>` | supported | 11 core aliases | CLI only alias | Aliases send the canonical open action after CLI URL normalization. | parser, defaults, integration |
| `batch <commands...>` | `batch <commands...>` | supported | 11 core aliases | CLI only wrapper | Accepts one or more JSON arrays of command argv and executes them sequentially through the normal CLI parser. Batch-level shared browser flags apply unless a child command overrides them. | parser, output, executor |
| `eval <expression>` | `eval <expression>` | supported | 11 core aliases | `CamouClient.evaluate()` | Programmatic API accepts the expression directly. CLI-only stdin/base64 transports are not duplicated in Node. | parser, schema, fake browser, output, API |
| `snapshot [-i]` | `snapshot [-i]` | adapted | existing plus hardening | `CamouClient.snapshot()` | Creates per-tab `@eN` refs; refs clear on navigation or the next snapshot. | schema, fake browser, output, integration, API |
| `click`, `hover`, `fill`, `check`, `uncheck`, `press` | same | supported | existing plus 12 direct automation | `CamouClient.click()`, `hover()`, `fill()`, `check()`, `uncheck()`, `press()` | Targets are CSS selectors or current-tab refs. CLI alias `key` remains CLI-only. | parser, defaults, schema, fake browser, output, integration, API |
| `dblclick`, `focus`, `type`, `select` | same | supported | 12 direct automation | `doubleClick()`, `focus()`, `type()`, `select()` | Node uses idiomatic `doubleClick()` rather than the CLI spelling. | parser, schema, fake browser, output, API |
| `keyboard *`, `mouse *`, `scroll`, `scrollintoview` | same | supported | 12 direct automation | `keyboard.*`, `mouse.*`, `scroll()`, `scrollIntoView()` | CLI alias `scrollinto` remains CLI-only. | parser, schema, fake browser, output, API |
| `upload`, `drag`, `wait`, `wait --download`, `download` | same | supported | 12 direct automation and 15 runtime | `upload()`, `drag()`, `wait()`, `waitForDownload()`, `download()` | Relative download paths resolve under the session downloads directory. | parser, schema, fake browser, output, integration, API |
| `screenshot` | `screenshot [targetOrPath] [path]` | adapted | 12 direct automation | `CamouClient.screenshot()` | Relative paths resolve under `profiles/<session>/artifacts/screenshots/`. | parser, schema, fake browser, output, API |
| `get *`, `is *`, `find *` | same | supported | 12 direct automation | `get.*`, `is.*`, `find()` | Find helpers execute narrow daemon actions; they do not return Playwright locators across IPC. | parser, schema, fake browser, output, API |
| `session`, `session id`, `session info`, `session list` | same | adapted | 13 session/tab lifecycle | `client.session.current()`, `id()`, `info()`, `list()` | `session id` is local deterministic name generation; `session info` can inspect daemon/runtime state. | parser, defaults, output, integration, API |
| `close`, `close --all`, `quit`, `exit` | same | adapted | 13 session/tab lifecycle | `close()`, `closeAll()`, `client.session.stop()`, `stopAll()` | `quit` and `exit` are CLI-only aliases. | parser, schema, fake browser, output, integration, API |
| `tab`, `tab list`, `tab new`, `tab close` | same | adapted | 13 session/tab lifecycle | `tab.list()`, `tab.new()`, `tab.switch()`, `tab.close()` | Targets can be tab names, generated ids, or legacy zero-based indexes. | parser, schema, fake browser, output, integration, API |
| `window new` | `window new` | adapted | 13 session/tab lifecycle | `window.new()` | Creates a tracked Playwright page; Firefox does not guarantee a separate OS window. | parser, schema, fake browser, output, API |
| headed/headless, proxy, headers, UA, media, init script, storage state | shared launch flags | adapted | 14 launch compatibility | `Camoufox` launch API and `CamouClient` defaults | Direct Playwright API stays launch/context/page focused; daemon client carries defaults for daemon-owned workflows. | config, defaults, launcher, API |
| executable path, browser engine, CDP/provider, extensions, restore policy | hidden migration flags | unsupported | 14 and 19 unsupported surfaces | none | Accepted only as migration-facing syntax that returns `unsupported_command`. | parser, JSON error, compatibility docs |
| `set viewport`, `set geolocation`, `set offline`, `set headers`, `set credentials`, `set media` | same | supported | 15 stateful runtime | `set.viewport()`, `set.geolocation()`, `set.offline()`, `set.headers()`, `set.credentials()`, `set.media()` | Context-scoped and tab-scoped lifetimes follow Playwright capabilities. | parser, schema, fake browser, output, API |
| `frame`, `dialog`, `read` | same | supported | 15 stateful runtime | `frame.*`, `dialog.*`, `read()` | Frame state is tab-scoped and clears on navigation/tab/session teardown. | parser, schema, fake browser, output, API |
| `cookies get/set/clear/import/export` | same | supported | 16 cookies/storage/state | `cookies.*` | Human output avoids values; JSON and Node results preserve structured data. | parser, schema, fake browser, output, integration, API |
| `storage local/session get/set/clear` | same | supported | 16 cookies/storage/state | `storage.local.*`, `storage.session.*` | Operates on current-origin storage in the active page/frame. | parser, schema, fake browser, output, API |
| `state save/load/list/show/clear/clean/rename` | same | adapted | 16 cookies/storage/state | `state.*` | State files are portable Playwright storage-state snapshots, not full Firefox profiles. | parser, schema, fake browser, output, integration, API |
| `network route/unroute/requests/request` | same | supported | 17 network/HAR | `network.route()`, `unroute()`, `requests()`, `request()` | Playwright-backed in-memory session routes and request ring buffer; no CDP response-body capture. | parser, schema, fake browser, output, API |
| `network har start/stop` | same | supported | 17 network/HAR | `network.har.start()`, `network.har.stop()` | HAR buffers are in-memory until stopped; relative paths resolve under `artifacts/har/`. | parser, schema, fake browser, output, API |
| `console`, `errors`, `highlight`, `clipboard *` | same | adapted | 18 debug/artifacts | `console.*`, `errors.*`, `highlight()`, `clipboard.*` | Buffers are daemon runtime state; clipboard uses browser-page APIs and permissions. | parser, schema, fake browser, output, API |
| `trace start/stop` | same | supported | 18 debug/artifacts | `trace.start()`, `trace.stop()` | Playwright trace zip artifacts, not CDP traces. | parser, schema, fake browser, output, API |
| `diff snapshot/screenshot/url` | same | adapted | 19 diff/vitals/init | `diff.*` | Screenshot diff is byte/header comparison, not perceptual image diff. | parser, schema, fake browser, output, API |
| `vitals`, `web-vitals` | same | supported | 19 diff/vitals/init | `vitals()` | `web-vitals` is a CLI-only alias; implementation uses browser Performance APIs. | parser, schema, fake browser, output, API |
| `pushstate`, `addinitscript`, `removeinitscript` | same | adapted | 19 diff/vitals/init | `pushState()`, `initScripts.*` | Removing context init scripts reports Playwright's current-context limitation instead of pretending removal occurred. | parser, schema, fake browser, output, API |
| `connect`, `inspect`, `profiler`, `pdf` | same migration stubs | unsupported | 19 unsupported surfaces | none | Return stable structured unsupported errors with alternatives. PDF stays disabled until real Camoufox smoke coverage proves support. | parser, JSON error, help |
| auth vault, MCP, dashboard, chat, plugins, skills, self-upgrade, remote provider control | none | out of scope | n/a | none | These are integration/provider surfaces, not local Camoufox daemon workflows. | docs |

## Node API Split

Use `Camoufox`, `launchCamoufox()`, or `launchCamoufoxContext()` when a script needs a real Playwright `BrowserContext`/`Page` and will call Playwright APIs directly. This API remains focused on launching Camoufox and exposing real Playwright objects.

Use `CamouClient` when a script needs daemon-owned command parity: named sessions and tabs, active tab behavior, snapshot refs, managed state files, request buffers, HAR and trace artifacts, and structured daemon results. CLI-only aliases, shell transports, human output flags, and unsupported compatibility stubs are intentionally not first-class Node methods.

## Smoke Coverage Guidance

Most parity behavior is covered by parser/defaults/schema tests plus fake Playwright daemon integration tests. Engine-sensitive behavior should also be smoke-tested against a real installed Camoufox before support is broadened:

- init scripts and launch storage state
- runtime state mutation such as viewport, geolocation, offline mode, headers, credentials, and media
- `network route`, `network unroute`, request logging, and HAR start/stop
- trace start/stop
- browser-page clipboard read/write/copy/paste
- PDF and video before either is enabled

Run the normal verification with `npm run build` and `npm test`. For real-browser smoke work, install a compatible browser with `camou install`, run `camou doctor --json`, then exercise the feature in an isolated `--session smoke-<feature>` profile and stop it with `camou close --all`.
