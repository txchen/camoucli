# Agent Browser Command Parity PRD

Labels: ready-for-agent
Status: ready-for-agent

## Problem Statement

Users who know `agent-browser` expect a broad command-line browser automation surface, but Camoucli currently exposes a narrower local Camoufox workflow. The gap makes migration uncertain: some commands already exist under Camoucli names, some should be adapted to Camoucli's local daemon and persistent Firefox profile model, and some belong to Agent Browser's CDP, provider, MCP, dashboard, chat, plugin, skills, or mobile-provider products and should not be copied.

The user needs an implementation-ready product plan for local browser automation command parity. The plan must preserve Camoucli's architecture: Node >=20, plain JavaScript output, thin CLI, typed newline-delimited JSON IPC, daemon-owned browser lifecycle, session/tab/snapshot-ref state, Playwright Core over an installed Camoufox Firefox executable, centralized platform paths, persistent session profiles, and no Python SDK or Bun-specific core runtime behavior.

## Solution

Add Agent Browser command parity as **Local Browser Automation CLI Parity**: command-line workflows that can run through Camoucli's local Camoufox/Playwright daemon. The CLI should gain compatible spelling and ergonomics where useful, while the daemon continues to own browser state, filesystem writes, sessions, tabs, refs, routes, logs, artifacts, and launch compatibility.

The feature should be implemented as vertical slices. Each slice adds the CLI command surface, default handling, typed IPC schema, daemon route, browser manager/runtime behavior, output formatting, docs/help updates, and tests together. Start with low-risk aliases and direct Playwright actions, then add session/tab foundations, launch options, stateful runtime commands, state/storage/network, debug artifacts, Node API wrappers, documentation, and smoke coverage.

Commands that depend on Chromium CDP, remote providers, MCP, dashboard/chat/plugin/skills management, mobile-provider behavior, Agent Browser restore policies, or an auth vault are out of scope. If syntax is accepted for migration, it should return a structured unsupported error with a useful local alternative.

## User Stories

1. As a user migrating from Agent Browser, I want Camoucli to support familiar local browser automation commands, so that I can reuse workflows without switching products.
2. As a shell automation author, I want command aliases like `goto`, `navigate`, `key`, and `scrollinto`, so that simple Agent Browser scripts need fewer edits.
3. As a CLI user, I want bare domains normalized to HTTPS for navigation commands, so that quick commands behave like browser automation tools I already use.
4. As a CLI user, I want existing `open <url>` behavior to keep working, so that current Camoucli scripts do not regress.
5. As a CLI user, I want `open` without a URL to start the session and tab without navigating, so that I can configure routes, cookies, storage, init scripts, tracing, or state before first navigation.
6. As a CLI user, I want `goto` and `navigate` to require URLs, so that command intent stays clear.
7. As an automation author, I want `eval` to accept base64 input, so that I can pass scripts safely through shell quoting.
8. As an automation author, I want `eval` to read from stdin, so that I can pipe larger scripts into the current tab.
9. As an automation author, I want double-click and focus commands, so that common locator actions are available without writing JavaScript.
10. As an automation author, I want `type` to support clearing and key delay, so that text entry can match real browser behavior more closely.
11. As an automation author, I want multi-value select support, so that multi-select fields can be automated.
12. As an automation author, I want keydown, keyup, keyboard type, and insert-text commands, so that keyboard workflows do not require custom evaluation.
13. As an automation author, I want mouse move, down, up, and wheel commands, so that pointer-specific interactions can be scripted.
14. As an automation author, I want selector-scoped scrolling, so that I can scroll nested panes instead of only the page viewport.
15. As an automation author, I want upload and drag commands, so that file inputs and drag-and-drop interfaces can be exercised.
16. As an automation author, I want wait-by-time, wait-by-URL, and wait-by-function, so that scripts can synchronize with browser behavior beyond selectors and load states.
17. As an automation author, I want existing wait selector, text, and load-state behavior preserved, so that current Camoucli workflows remain stable.
18. As an automation author, I want selector screenshots, viewport screenshots, full-page screenshots, format options, and JPEG quality, so that artifacts can be generated for multiple workflows.
19. As an automation author, I want richer `get` commands for HTML, attributes, counts, bounding boxes, and computed styles, so that I can inspect pages without writing JavaScript.
20. As an automation author, I want `is visible`, `is enabled`, and `is checked`, so that scripts can branch on element state.
21. As an automation author, I want semantic locator helpers for role, text, label, placeholder, alt text, title, test id, first, last, and nth, so that robust locators are available from the CLI.
22. As an agent using snapshots, I want new commands to accept `@eN` refs where they accept targets, so that snapshot-driven workflows stay consistent.
23. As a user with multiple browser tasks, I want `session` to print the current resolved session, so that scripts can discover their active context.
24. As a user with project-specific automation, I want `session id` to generate stable session names from a worktree, cwd, or git root, so that profiles can be reused predictably.
25. As a user diagnosing state, I want `session info`, so that I can inspect daemon status, profile paths, browser version, launch config summary, active tab, and tabs.
26. As a user, I want `close` to stop the current session, so that it matches the expected Agent Browser convenience behavior.
27. As an existing Camoucli user, I want `close --all` to keep stopping all running sessions, so that existing cleanup scripts still work.
28. As a user migrating scripts, I want `quit` and `exit` aliases, so that close-style scripts are easier to port.
29. As a tab-heavy automation author, I want `tab` to list tabs, so that the common tab command is concise.
30. As a tab-heavy automation author, I want `tab new`, `tab new --label`, `tab <target>`, and `tab close`, so that I can create, name, switch, and close tabs directly.
31. As an existing Camoucli user, I want explicit `--tabname` behavior preserved, so that deterministic named-tab workflows keep priority over active-tab convenience.
32. As an automation author, I want active-tab fallback when no explicit tab is configured, so that short commands operate on the tab I selected.
33. As an automation author, I want `click --new-tab`, so that popup/new-page workflows can be captured and tracked.
34. As an automation author, I want `window new` to create a tracked page, so that Agent Browser-style window workflows have a local Camoufox equivalent.
35. As a user, I want `window new` documented as a tracked Playwright page rather than a guaranteed OS window, so that expectations match Firefox behavior.
36. As a launch-configuration user, I want compatible launch globals for headed mode, proxy bypass, headers, user agent, HTTPS errors, color scheme, reduced motion, init scripts, and storage state, so that migrated scripts can configure sessions up front.
37. As a Camoucli user, I want Camoufox-native launch globals to remain preferred, so that browser registry, presets, fingerprint, locale, screen, window, and blocking behavior stay stable.
38. As a user, I want launch compatibility errors when immutable launch options change on a running session, so that scripts do not silently reuse incompatible browser state.
39. As an automation author, I want downloads to be coordinated by the daemon, so that files are saved reliably with resolved paths and created directories.
40. As an automation author, I want `wait --download`, so that I can synchronize with downloads triggered by the current page.
41. As an automation author, I want runtime `set` commands for viewport, geolocation, offline, headers, credentials, and media, so that session/page state can be changed without relaunching when Playwright supports it.
42. As an automation author, I want frame context commands, so that subsequent selector actions can target an iframe until reset to main.
43. As an automation author, I want dialog status, accept, and dismiss commands, so that alert, confirm, and prompt workflows can be automated.
44. As an agent, I want `read [url]` implemented as deterministic local DOM reading, so that page content can be consumed without depending on external reader services.
45. As a user, I want `read` to support raw, outline, filter, timeout, and JSON-friendly output, so that it works for both humans and agents.
46. As a user, I want `cookies` and `cookies get` to list current session cookies, so that I can inspect browser state.
47. As a user, I want `cookies set` and `cookies clear`, so that I can mutate browser cookies from scripts.
48. As a migrating user, I want cURL-cookie import support, so that copied Cookie headers or cURL commands can seed a session.
49. As a security-conscious user, I want cookie parse errors not to echo secret values, so that logs do not leak credentials.
50. As a user, I want existing cookie import/export file commands preserved, so that current Camoucli cookie workflows remain stable.
51. As an automation author, I want localStorage and sessionStorage get, set, and clear commands for the active page origin, so that web storage can be scripted.
52. As a user, I want storage commands to reject unusable origins clearly, so that operations on blank or file pages do not appear to succeed incorrectly.
53. As a user, I want `state save`, `load`, `list`, `show`, `clear`, `clean`, and `rename`, so that portable Playwright storage-state snapshots can be managed.
54. As a user, I want state snapshots kept separate from persistent Firefox profiles, so that profile cleanup and portable auth transfer remain distinct.
55. As a user, I want running-session state loads documented as merge/import operations, so that I do not mistake them for pristine profile resets.
56. As a network-debugging user, I want route and unroute commands backed by Playwright, so that local request interception works with Camoufox Firefox.
57. As a network-debugging user, I want request logs and request detail commands, so that I can inspect what the session loaded.
58. As a network-debugging user, I want request filters for text, type, method, and status, so that large request buffers are usable.
59. As a network-debugging user, I want HAR start and stop commands, so that I can capture portable request artifacts.
60. As a user, I want routes, request logs, and HAR capture to be in-memory per session, so that they do not pollute persistent profiles or state snapshots.
61. As a debugging user, I want console and page-error event buffers, so that page issues can be inspected after interactions.
62. As a debugging user, I want console and error buffers to be clearable, so that repeated test runs start from a known point.
63. As a debugging user, I want highlight by selector or snapshot ref, so that I can confirm what a target points to in headed or screenshot workflows.
64. As a browser-page user, I want clipboard read, write, copy, and paste commands, so that clipboard workflows can be automated through the page.
65. As a debugging user, I want Playwright trace start and stop, so that I can capture trace zips for local diagnosis.
66. As an artifact user, I want artifact paths chosen by the daemon when omitted, so that screenshots, traces, HARs, diffs, PDFs, or videos land in session artifacts consistently.
67. As a comparison user, I want snapshot, screenshot, and URL diff commands, so that page regressions can be inspected from the CLI.
68. As a performance user, I want framework-agnostic web vitals, so that basic loading and interaction metrics can be collected in local Camoufox.
69. As an SPA automation author, I want `pushstate`, so that same-document navigation can be simulated without network navigation.
70. As an automation author, I want init scripts added before future documents load, so that pages can be instrumented consistently.
71. As an automation author, I want init script removal semantics to be honest about Playwright limitations, so that I do not rely on impossible active-context removal.
72. As a Node developer, I want direct Playwright launch behavior to stay available through the existing API, so that code needing real `BrowserContext` and `Page` objects remains simple.
73. As a Node developer, I want a typed daemon client for command-parity workflows, so that I can use sessions, tabs, refs, state, network logs, and artifacts without shelling out.
74. As a Node developer, I want CLI aliases kept out of the canonical Node API, so that the package API stays idiomatic and compact.
75. As a documentation reader, I want a command-parity matrix, so that I can see which Agent Browser commands are supported, adapted, deferred, unsupported, or out of scope.
76. As a migrating user, I want migration notes explaining Camoucli's local Camoufox model, so that differences from CDP/provider Agent Browser behavior are explicit.
77. As an agent implementing a slice, I want tests, help text, docs, and output behavior shipped with each command family, so that partial parity does not become undocumented drift.
78. As a user, I want unsupported commands to fail with structured error codes and alternatives, so that automation can handle unsupported local-scope features predictably.

## Implementation Decisions

- Scope is **Local Browser Automation CLI Parity**. Implement commands that can run through Camoucli's local Camoufox/Playwright daemon; do not adopt Agent Browser's CDP/provider, MCP, dashboard, chat, plugin, skills, mobile-provider, auth-vault, or restore-policy product surfaces.
- Preserve the architecture boundary: the CLI parses intent and applies defaults; typed IPC validates requests; the daemon owns browser lifecycle, sessions, tabs, refs, profile paths, state files, routes, logs, downloads, artifacts, and all browser interaction.
- Implement parity as vertical slices. Every slice should include CLI parsing, default handling, typed IPC schemas, daemon routing, daemon/browser behavior, human and JSON output, help/docs updates, and focused tests.
- Start with parser-only or low-state changes: navigation aliases, URL normalization, key and scroll aliases, base64 eval, and stdin eval.
- Add direct Playwright-native commands next: double-click, focus, richer type/select, keyboard, mouse, scoped scroll, upload, drag, richer waits, richer getters, predicates, semantic find helpers, and expanded screenshots.
- Reuse the selector-or-ref target model for target-taking commands so snapshot `@eN` refs work consistently.
- Use specific typed IPC actions for semantic operations. Do not introduce broad untyped "action" payloads just to move faster.
- Add stateful core commands only after the needed runtime contracts exist: URL-less open, downloads, runtime settings, frame context, dialogs, and local DOM read.
- Add session and tab lifecycle foundations before commands that rely on active tabs or popup tracking. Preserve explicit `--session` and `--tabname` workflows, then layer active-tab convenience on top.
- Treat tab labels as Camoucli tab names. If stable generated tab ids are added, tab names remain the primary public label.
- Implement `click --new-tab` by waiting for a new page or popup, tracking it in the same session, assigning a deterministic tab name or label, switching active tab, and returning old/new tab metadata.
- Implement `window new` as a new tracked Playwright page. Do not promise a separate operating-system browser window.
- Add launch options only when they map cleanly to Playwright persistent-context options or existing Camoufox launch configuration. Keep registry-managed Camoufox executable selection and centralized named profiles.
- Reject launch-time options that conflict with an already-running session rather than silently reusing incompatible state.
- Keep profile management and state snapshot management separate. Profiles are full persistent Firefox profile directories. State snapshots are portable Playwright-compatible storage-state JSON files.
- Add a managed state snapshot directory. Resolve safe managed names under it and allow explicit filesystem paths where specified.
- Define running-session state load as an import/merge into the current context, not a pristine profile reset.
- Keep cookie import/export. Add cookie get/set/clear and cURL-cookie import without echoing secret values in errors.
- Treat web storage as a current-tab origin operation. Values remain strings; commands should reject pages without a usable origin.
- Implement network route/unroute, request logs, request detail, and HAR through Playwright APIs. Routes, logs, and HAR buffers are in-memory per session and clear on session stop or daemon shutdown.
- Implement debug event commands through daemon-owned page listeners. Console and page-error buffers are per session, in memory, clearable, and not persisted to profiles, states, traces, or HARs.
- Implement highlight, clipboard, trace, diff, vitals, pushstate, and init scripts with portable Playwright/Firefox semantics. Document permission and engine limitations where relevant.
- Only add PDF generation if a real Camoufox smoke test proves Playwright Firefox support works. If not, expose an unsupported error rather than a fake workaround.
- Do not add mid-session video recording as Agent Browser-style `record` parity in the first pass. If video is added, prefer launch/session options that map to Playwright video support.
- Accept unsupported compatibility syntax only when it materially helps migration. Unsupported commands must return structured errors naming the local Camoufox scope boundary and an alternative.
- Expose accepted parity behavior through two Node API layers: keep the existing direct Playwright Camoufox API focused on launch/context/page access, and add a separate typed daemon client for session/tab/ref/state/network/artifact workflows.
- Keep pure CLI aliases, shell input transports, human output flags, and unsupported compatibility stubs out of the first-class Node API.
- Add documentation with each slice: command help, README updates where appropriate, a command-parity matrix, migration notes, and Node API docs when the daemon client lands.
- Update agent-facing workflow docs only after implemented commands are stable enough for agents to use.

## Testing Decisions

- The main test seam is the highest useful external behavior seam: CLI command parsing and defaults produce typed IPC requests, the daemon routes those requests, and the browser manager returns structured results. Prefer this seam over testing private helpers directly.
- Use fake Playwright/browser tests for most browser behavior. Extend the fake harness only for the Playwright methods Camoucli depends on; do not turn it into a second browser engine.
- Add pure unit tests for deterministic helpers: URL normalization, eval input decoding/reading, state name/path resolution, cURL-cookie parsing, request filtering, artifact path generation, text diff formatting, and unsupported error construction.
- Add schema tests for every new typed IPC action so valid payloads pass and invalid payloads fail.
- Add parser tests for every new command spelling, alias, option, default action name, and invalid command shape.
- Add defaults tests for session, tab, active-tab fallback, launch options, and immutable launch compatibility.
- Add output tests for every result family. Human output should be concise; JSON output should remain structured data.
- Add redaction tests for non-JSON cookie/state output and for cURL-cookie parsing errors.
- Add daemon or manager integration tests for session/tab state, popup tracking, frame state, dialog state, downloads, network buffers, HAR capture, console/error buffers, trace state, and artifact paths.
- Add targeted help tests for command families whose adapted semantics are easy to regress: open, close, session, tab, state, network, trace, window, unsupported commands, and init-script removal.
- Keep spawned CLI integration tests limited to workflows that need CLI defaults plus daemon state, such as open/snapshot/ref interaction, URL-less open before setup, active tab switching, and unsupported JSON errors.
- Add Node API tests for the daemon client as each public method family lands. Mock daemon startup and IPC sending for method-shape tests, and keep direct Playwright launch API tests separate.
- Add opt-in real Camoufox smoke tests for engine-sensitive behavior: URL-less open before setup, launch-time init scripts, launch-time state, route/unroute, trace, clipboard, PDF if attempted, video if implemented, and HAR if implemented.
- Required verification for implementation slices remains `npm run build` and `npm test`, with real Camoufox smoke tests opt-in unless a ticket explicitly targets engine compatibility.

## Out of Scope

- Implementing any parity command as part of this PRD creation.
- MCP server, dashboard, chat, plugin or skills management.
- CDP attach, Chrome DevTools proxy, provider browser launch, Browserbase-style remote providers, stream commands, and Chromium-specific profiler behavior.
- iOS/mobile-provider commands such as tap, swipe, and device list.
- Agent Browser auth vault or plugin-backed credential flows.
- Agent Browser restore policies and arbitrary profile path launch.
- Switching Camoucli away from local Camoufox Firefox, Playwright Core, registry-managed browser installs, centralized profile paths, or the daemon-owned state model.
- Adding a Python SDK dependency, Bun-specific core runtime behavior, or non-Node publish artifacts.
- Replacing existing Camoucli commands, profiles, cookie import/export, session naming, or named-tab workflows with Agent Browser semantics.
- Promising PDF, video, extension loading, separate OS windows, or current-context init-script removal before smoke-tested or API-supported semantics exist.

## Further Notes

- The implementation slice order from the map should be preserved: core aliases; direct Playwright automation; session/tab lifecycle; launch options; stateful core runtime; cookies/storage/state; network/HAR; debug events/artifact foundation; diff/vitals/pushstate/init/unsupported commands; polish and compatibility hardening.
- The first three recommended implementation tickets are core aliases and eval input modes, direct Playwright locator/input/get/wait commands, and screenshot selector/format/quality plus richer waits.
- The command-parity docs should use statuses `supported`, `adapted`, `deferred`, `unsupported`, and `out of scope`.
- The migration story should be explicit that Camoucli is local Camoufox automation, not a drop-in implementation of Agent Browser's provider and integration ecosystem.
- Any implementation agent should consult the existing map and research files for detailed command-by-command decisions before starting a slice.
