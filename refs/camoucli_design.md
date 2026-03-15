# Camoucli Design

## 1. Overview

Camoucli is a Node.js-first CLI and local daemon for driving Camoufox directly through Playwright, without depending on the Camoufox Python SDK.

The product goal is to feel similar to `agent-browser` and `agent-browser-session` for local agent workflows:

- launch and keep a browser session alive,
- operate it through short CLI commands,
- preserve login state across runs,
- expose a clean internal architecture that can later grow into richer automation or server modes.

Camoucli is published to npm as regular JavaScript. Node users can run it with `npm`, `npx`, or global install. Bun users can also run the same package because the runtime target is plain Node-compatible JavaScript.

## 2. Goals

### Primary goals

- Node.js runtime only for production use.
- No dependency on the Camoufox Python SDK.
- Local CLI UX similar to `agent-browser` style commands.
- Persistent browser profiles and durable login sessions.
- Named tabs for parallel-safe agent workflows.
- Local daemon process so browser state survives individual CLI invocations.
- Managed Camoufox binary installation and version selection.
- Clean npm distribution that works for both Node and Bun users.

### Secondary goals

- Strong TypeScript typing internally.
- Reusable core modules for future server or SDK packages.
- Optional future support for remote Playwright access.

## 3. Non-goals for v1

- Full feature parity with the Camoufox Python package.
- Re-implementing BrowserForge-grade fingerprint generation on day one.
- Pair-browsing, live streaming, or remote control over CDP.
- Distributed worker orchestration.
- Native single-binary packaging.
- Manager-owned Playwright WebSocket sessions that survive arbitrary external clients disconnecting.

## 4. Key Design Decisions

- Use Node.js as the only production runtime.
- Publish plain JavaScript to npm, not a Bun binary and not a compiled native executable.
- Use TypeScript for source, compiled to JavaScript for release.
- Use `playwright-core` with the `firefox` browser type and `executablePath` pointing to Camoufox.
- Use a local daemon plus newline-delimited JSON IPC rather than one-shot browser launches for every command.
- Use `launchPersistentContext` for the main session model.
- Keep v1 local-first and CLI-first.
- Start with config-driven Camoufox launches, then add curated presets, then add more advanced automatic fingerprint generation later.
- Avoid Bun-specific APIs so the same package works under Node and Bun.

## 5. Product Shape

Camoucli has two local-facing parts:

- `camoucli`: the CLI entrypoint users run.
- `camoucli-daemon`: an internal long-lived process started automatically on demand.

The daemon owns browser lifecycle, profile directories, tab bindings, refs, and session state. The CLI is a thin command parser and IPC client.

## 6. User Experience Model

The intended v1 flow is:

1. User installs the npm package.
2. User runs `camoucli install` to fetch a Camoufox browser build.
3. User runs commands such as:
   - `camoucli open https://example.com`
   - `camoucli snapshot -i`
   - `camoucli click @e4`
   - `camoucli fill @e5 "hello"`
4. The first command auto-starts the local daemon and launches Camoufox if needed.
5. Later commands reuse the same running session.
6. Login state persists through the profile directory.

Named sessions and tabs support concurrent agent workflows:

- `--session work`
- `--tabname github`

## 7. High-Level Architecture

```text
 +------------------+
 |   CLI process    |
 | camoucli command |
 +--------+---------+
          |
          | JSON over local IPC
          v
 +--------+---------+
 |  Local daemon    |
 | session manager  |
 | command router   |
 +--------+---------+
          |
          | Playwright API
          v
 +--------+---------+
 | Browser manager  |
 | tabs, refs, wait |
 | snapshots, state |
 +--------+---------+
          |
          | firefox.launchPersistentContext
          v
 +--------+---------+
 | Camoufox binary  |
 | executablePath   |
 | env + prefs      |
 +------------------+
```

## 8. Why This Is Not a Direct Fork of agent-browser-session

`agent-browser-session` is useful as an architecture reference, but not as an engine implementation reference.

We should borrow these ideas:

- local daemon model,
- CLI to daemon protocol,
- persistent profile handling,
- named tab isolation,
- snapshot refs,
- command-oriented UX.

We should not inherit these assumptions:

- Chromium-first engine design,
- CDP-heavy features,
- Patchright-specific abstractions,
- streaming and input injection built around CDP,
- browser features that only exist in the Chromium path.

Camoucli should be Firefox and Playwright protocol first.

## 9. Runtime and Packaging

### Runtime target

- Node.js `>=20`.
- ESM-first package.
- Plain JavaScript output in `dist/`.

### Distribution

- Publish to npm.
- Expose `bin` in `package.json`.
- Do not ship the Camoufox browser inside the npm tarball.
- Download browser builds through explicit install commands.

### Why Node-first

- Users without Bun can run the package directly.
- Bun users can still use it because the runtime output is standard Node-compatible JavaScript.
- Avoids a split feature matrix between a Bun-only tool and a Node-compatible tool.

## 10. Proposed Module Layout

```text
src/
  cli/
    main.ts
    commands/
  daemon/
    daemon.ts
    router.ts
  ipc/
    protocol.ts
    client.ts
    server.ts
  browser/
    manager.ts
    tabs.ts
    snapshot.ts
    actions.ts
  camoufox/
    installer.ts
    registry.ts
    launcher.ts
    config.ts
    env.ts
    prefs.ts
  state/
    paths.ts
    store.ts
  util/
    log.ts
    errors.ts
    platform.ts
```

## 11. Storage Layout

Suggested local layout:

```text
~/.camoucli/
  runtime/
    daemon.sock
    daemon.pid
    sessions/
  browsers/
    official/
      135.0.1-beta.24/
      current
  profiles/
    default/
      user-data/
      downloads/
      artifacts/
    work/
      user-data/
      downloads/
      artifacts/
  presets/
  logs/
```

The exact base path should follow platform conventions:

- Linux: XDG-compatible if practical.
- macOS and Windows: platform cache or app-data conventions.

## 12. Session Model

### Session

A session is the daemon-owned browser runtime for a named workspace.

Each session has:

- `sessionName`
- `status`: `stopped | starting | running | error`
- `browserVersion`
- `profileDir`
- `downloadsDir`
- `artifactsDir`
- `headless`
- optional proxy and launch settings

### Tab binding

Each named tab has:

- `tabName`
- `page`
- `refMap`
- `lastSnapshot`
- optional frame state

The daemon maps `sessionName + tabName` to a specific `Page`.

## 13. Browser Launch Strategy

The core launch path is:

```ts
await firefox.launchPersistentContext(userDataDir, {
  executablePath: camoufoxPath,
  headless,
  env: camoufoxEnv,
  firefoxUserPrefs,
  proxy,
});
```

Important consequences:

- We do not need Python to control Camoufox.
- We do need to replicate the launch contract expected by Camoufox.
- We should stay on the Playwright Firefox path, not CDP.

## 14. Camoufox Integration Strategy

Camoufox is not just a Firefox executable. The Python package also prepares launch inputs.

The Node implementation must reproduce the useful parts of that contract:

- resolve the browser executable path,
- build Camoufox config,
- split config across `CAMOU_CONFIG_N` environment variables,
- set `firefoxUserPrefs` when required,
- pass proxy, locale, headless, and related options correctly.

### v1 strategy

Support these input layers in priority order:

1. explicit config file path,
2. explicit JSON config string,
3. curated built-in presets,
4. a small set of ergonomic flags that map to config and prefs.

This keeps the implementation practical without blocking advanced users.

## 15. Config and Fingerprint Strategy

### v1

V1 should focus on correctness and transparency, not on cloning the full Python feature surface.

Support:

- raw config JSON,
- raw `firefoxUserPrefs` JSON,
- proxy settings,
- locale and timezone overrides,
- basic window and headless options,
- a handful of tested presets.

### v1.1 and later

Add higher-level helpers for:

- geoip-driven locale and timezone selection,
- curated OS presets,
- screen and window templates,
- better validation against Camoufox property definitions.

### Explicit non-goal for first release

Do not block release on full BrowserForge parity.

## 16. Environment Variable Handling

The Python package chunks config JSON into environment variables. Camoucli should mirror that behavior so the browser receives the same class of input.

Recommended approach:

- serialize config JSON once,
- split into `CAMOU_CONFIG_1`, `CAMOU_CONFIG_2`, and so on,
- match the Python chunking behavior as closely as practical,
- keep this logic in a dedicated module with tests.

This module is one of the most important compatibility points in the entire design.

## 17. Command Surface

### Core browser commands

- `open <url>`
- `snapshot`
- `click <selectorOrRef>`
- `fill <selectorOrRef> <text>`
- `press <key>`
- `screenshot [path]`
- `get url`
- `get title`
- `get text <selectorOrRef>`
- `wait <selector>`

### Session and tab commands

- `session list`
- `session stop [name]`
- `tab list`
- `tab new [url]`
- `tab close [nameOrIndex]`

### Browser management commands

- `install`
- `remove`
- `path`
- `version`
- `doctor`

### Common global flags

- `--session <name>`
- `--tabname <name>`
- `--headless`
- `--config <path>`
- `--prefs <path>`
- `--proxy <url>`
- `--json`

## 18. IPC Protocol

### Transport

- Unix: Unix domain socket.
- Windows: localhost TCP.

### Format

- newline-delimited JSON,
- request/response model,
- request id for correlation,
- strict schema validation with `zod`.

### Example request

```json
{
  "id": "req_123",
  "action": "navigate",
  "session": "default",
  "tabName": "main",
  "url": "https://example.com"
}
```

### Example response

```json
{
  "id": "req_123",
  "success": true,
  "data": {
    "url": "https://example.com"
  }
}
```

## 19. Browser Manager Responsibilities

The browser manager owns:

- launch and shutdown,
- session state,
- page and tab creation,
- snapshot generation,
- ref resolution,
- command execution,
- cleanup on crash or external close.

It should not own:

- package installation,
- release discovery,
- CLI formatting,
- long-term metadata persistence beyond its runtime scope.

## 20. Snapshot and Ref Model

V1 should include a snapshot system similar to agent-browser style tools.

Requirements:

- stable textual snapshot output,
- interactive-only snapshot mode,
- refs like `@e1`, `@e2`,
- per-tab ref maps,
- ref invalidation on navigation or new snapshot generation.

This feature is important because it makes the CLI useful for agents, not just humans.

## 21. Binary Management

Camoucli needs a first-party browser manager because npm should not directly carry large browser payloads.

### Responsibilities

- discover available Camoufox releases,
- download selected release assets,
- cache versions locally,
- mark a current default version,
- print the resolved executable path.

### Recommended behavior

- `camoucli install` installs the current default release,
- `camoucli install <version>` installs an explicit release,
- `camoucli path` prints the resolved browser executable,
- `camoucli doctor` validates install, shared libraries, and launchability.

### Recommendation

Do not auto-download the browser during npm install. Keep browser installation explicit.

## 22. Error Handling

The CLI should return human-readable errors by default and machine-readable JSON when `--json` is enabled.

Common error classes:

- browser not installed,
- daemon failed to start,
- browser crashed,
- invalid selector or ref,
- invalid config or prefs,
- profile lock conflict,
- unsupported platform or missing system libraries.

## 23. Observability

V1 observability should be simple but useful:

- daemon logs to a session log file,
- optional verbose CLI mode,
- last launch command summary,
- version and path reporting,
- doctor command for environment diagnostics.

## 24. Security Model

V1 is local-only by design.

Security basics still matter:

- bind IPC only to local machine,
- reject accidental HTTP traffic on the local socket,
- create runtime directories with owner-only permissions where practical,
- do not expose remote ports by default,
- avoid executing arbitrary shell snippets from CLI flags.

## 25. Testing Strategy

### Unit tests

- CLI argument parsing,
- IPC schema parsing,
- config chunking,
- path resolution,
- preset mapping,
- binary registry logic.

### Integration tests

- daemon startup and shutdown,
- launch Camoufox with a fixture config,
- persistent profile reuse,
- named tab isolation,
- snapshot and ref commands.

### Manual verification

- login persistence on a real site,
- proxy configuration behavior,
- headless and headed modes,
- Linux shared library diagnostics.

## 26. Phased Roadmap

### Phase 0: foundation

- project skeleton,
- CLI entrypoint,
- daemon IPC,
- basic install and path commands.

### Phase 1: useful local CLI

- persistent context launch,
- open, snapshot, click, fill, press,
- named tabs,
- config and prefs input,
- basic browser version management.

### Phase 2: compatibility depth

- stronger config validation,
- more curated presets,
- better proxy and locale helpers,
- improved diagnostics.

### Phase 3: optional expansion

- optional remote Playwright or automation server mode,
- richer artifacts,
- session export and import,
- additional agent-facing commands.

## 27. Main Risks

### Risk 1: launch compatibility

The hardest part is not the CLI. It is reproducing enough of the Camoufox launch contract to make the browser behave correctly without Python.

### Risk 2: profile behavior

Persistent profiles are good for login state, but they can conflict with identity rotation expectations. The product must clearly separate persistent workflows from rotation-heavy workflows.

### Risk 3: over-scoping v1

Trying to ship BrowserForge parity, remote Playwright server mode, rich streaming, and full multi-version management all at once would slow the project down significantly.

## 28. Recommendation Summary

The recommended v1 is:

- Node.js runtime,
- npm-distributed JavaScript CLI,
- local daemon plus JSON IPC,
- `playwright-core.firefox` plus `executablePath` to Camoufox,
- persistent contexts for login-heavy workflows,
- config-first compatibility strategy,
- no Python dependency,
- no Bun runtime dependency,
- no CDP-heavy features in the critical path.

This gives the project the right shape for both Node and Bun users while keeping the actual runtime and support matrix simple.
