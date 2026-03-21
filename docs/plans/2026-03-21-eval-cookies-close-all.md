# Eval, Cookies, and Close-All Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the three highest-value command gaps relative to `camoufox-cli`: page `eval`, cookie import/export, and a public CLI path for closing all running sessions.

**Architecture:** Keep the existing split where the thin CLI maps commands onto daemon IPC actions, and the daemon/browser manager owns all browser-context behavior. Add one new browser-scoped action (`eval`), one session-scoped command group for cookies (`cookies import` / `cookies export`), and one explicit runtime-management command for closing every live session (`close --all`, implemented on top of the existing `stopAllSessions()` manager capability). Reuse current session/tab defaults where appropriate, but keep close-all intentionally outside session defaulting.

**Tech Stack:** TypeScript, Commander, newline-delimited JSON IPC, Playwright browser contexts/pages, Node `fs/promises`, Vitest.

### Task 1: Lock the command contract

**Files:**
- Modify: `README.md`
- Modify: `src/cli/program.ts`
- Modify: `src/ipc/protocol.ts`
- Test: `tests/cli-program.test.ts`

**Step 1: Write the failing test**

Add parser tests for these new command paths:
- `camou eval <expression>`
- `camou cookies export [path]`
- `camou cookies import <path>`
- `camou close --all`

The tests should assert that:
- `eval` routes to `eval`
- `cookies export` routes to `cookies.export`
- `cookies import` routes to `cookies.import`
- `close --all` routes to `session.stopAll`
- `close` without `--all` fails parsing, so the command surface stays explicit and doesn’t overlap with existing `session stop [name]`

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli-program.test.ts`
Expected: FAIL because the new commands and IPC request shapes do not exist yet.

**Step 3: Write minimal implementation**

Update `src/cli/program.ts` with:
- top-level `eval <expression>`
- top-level `close` with required `--all`
- top-level `cookies` command group with `export [path]` and `import <path>`

Update `src/ipc/protocol.ts` with request schemas for:
- `eval`
- `cookies.export`
- `cookies.import`
- `session.stopAll`

Update `README.md` with the exact intended command model:
- `eval` runs in the current tab
- cookies are session/context state, not tab state
- `close --all` stops every running daemon-owned session

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli-program.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add README.md src/cli/program.ts src/ipc/protocol.ts tests/cli-program.test.ts
git commit -m "feat: add eval cookies and close-all command surface"
```

### Task 2: Extend fake browser support for eval and cookies

**Files:**
- Modify: `tests/helpers/fake-browser.ts`
- Test: `tests/daemon.integration.test.ts`
- Test: `tests/session-profiles.test.ts`

**Step 1: Write the failing test**

Add daemon integration tests that describe the desired behavior in the fake browser:
- `eval` can read page values such as title or URL from the current tab
- cookie export returns the current session cookies
- cookie import hydrates cookies into the current session/browser context
- `close --all` stops all running sessions so `session list` becomes empty afterward

Keep the eval contract intentionally small for the first version:
- expression returns a JSON-serializable value
- no argument passing beyond the expression string itself

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/daemon.integration.test.ts`
Expected: FAIL because fake browser contexts/pages do not yet model cookies or generic eval behavior.

**Step 3: Write minimal implementation**

Extend `tests/helpers/fake-browser.ts` with just enough runtime behavior to support the production contract:
- `FakePage.evaluate(...)` should handle the eval action path in addition to snapshot internals
- `FakeBrowserContext` should track cookies in memory
- add helpers that mimic the subset of Playwright APIs the real implementation will call, such as `context.cookies()` and `context.addCookies()`

If needed, persist fake cookies in the existing profile store alongside page state so restart semantics are deterministic in tests.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/daemon.integration.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/helpers/fake-browser.ts tests/daemon.integration.test.ts
git commit -m "test: extend fake browser for eval and cookies"
```

### Task 3: Add browser-manager support for eval

**Files:**
- Modify: `src/browser/manager.ts`
- Modify: `src/daemon/router.ts`
- Test: `tests/daemon.integration.test.ts`
- Test: `tests/output.test.ts`

**Step 1: Write the failing test**

Add or tighten tests so `eval` is locked to this first-version behavior:
- runs against the current tab in the selected session
- returns a structured payload like:

```ts
{
  sessionName: string,
  tabName: string,
  expression: string,
  result: unknown,
}
```

- supports `--json` naturally
- prints a human-readable/plain result for non-JSON output

Prefer a narrow supported syntax for the first iteration, such as evaluating simple expressions through `page.evaluate` with a function wrapper around the expression string.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/daemon.integration.test.ts tests/output.test.ts`
Expected: FAIL because the manager/router/output path does not exist.

**Step 3: Write minimal implementation**

Add `BrowserManager.eval(...)` that:
- resolves the current session/tab with existing helpers
- executes the expression in page context
- returns only JSON-serializable data
- converts execution failures into existing structured CLI/IPC errors

Route `eval` in `src/daemon/router.ts`.

Add a non-JSON output path in `src/cli/output.ts` that:
- prints scalars directly when practical
- falls back to pretty JSON for objects/arrays

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/daemon.integration.test.ts tests/output.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/browser/manager.ts src/daemon/router.ts src/cli/output.ts tests/daemon.integration.test.ts tests/output.test.ts
git commit -m "feat: add eval command"
```

### Task 4: Add cookie export/import

**Files:**
- Modify: `src/browser/manager.ts`
- Modify: `src/daemon/router.ts`
- Modify: `src/cli/output.ts`
- Test: `tests/daemon.integration.test.ts`
- Test: `tests/output.test.ts`
- Test: `tests/cli-json.integration.test.ts`

**Step 1: Write the failing test**

Add tests that define the cookie contract:
- `cookies export` returns an array of cookies from the current session/browser context
- `cookies export [path]` writes JSON to disk and returns the path plus count
- `cookies import <path>` reads JSON from disk and injects cookies into the current session/browser context
- import/export use the current session selection semantics, but do not require a tab target
- malformed cookie JSON fails with a structured validation-style error

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/daemon.integration.test.ts tests/output.test.ts tests/cli-json.integration.test.ts`
Expected: FAIL because cookie actions do not exist.

**Step 3: Write minimal implementation**

Add `BrowserManager.exportCookies(...)` and `BrowserManager.importCookies(...)` that:
- ensure or resolve the target session using existing session helpers
- use browser-context cookie APIs
- optionally write/read a JSON file on disk
- return structured payloads such as:

```ts
// export
{
  sessionName: string,
  count: number,
  cookies: Cookie[]
}
```

```ts
// export to file
{
  sessionName: string,
  count: number,
  path: string
}
```

```ts
// import
{
  sessionName: string,
  imported: number,
  path: string
}
```

Add output helpers in `src/cli/output.ts` so non-JSON mode is readable:
- export without a path prints JSON to stdout
- export with a path prints a concise summary
- import prints imported count and source path

Route the new actions in `src/daemon/router.ts`.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/daemon.integration.test.ts tests/output.test.ts tests/cli-json.integration.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/browser/manager.ts src/daemon/router.ts src/cli/output.ts tests/daemon.integration.test.ts tests/output.test.ts tests/cli-json.integration.test.ts
git commit -m "feat: add cookie import and export commands"
```

### Task 5: Add public close-all support

**Files:**
- Modify: `src/browser/manager.ts`
- Modify: `src/daemon/router.ts`
- Modify: `src/cli/output.ts`
- Modify: `src/cli/defaults.ts`
- Test: `tests/daemon.integration.test.ts`
- Test: `tests/output.test.ts`
- Test: `tests/cli-program.test.ts`

**Step 1: Write the failing test**

Add tests that define `close --all` as:
- stopping all running sessions
- returning a structured payload such as:

```ts
{
  stopped: number,
  sessionNames: string[]
}
```

- not applying session/tab/browser defaults
- printing a clear non-JSON summary like `Stopped 2 sessions`

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli-program.test.ts tests/daemon.integration.test.ts tests/output.test.ts`
Expected: FAIL because the action and output path do not exist.

**Step 3: Write minimal implementation**

Add `BrowserManager.stopAllSessions()` return metadata instead of `void`, or wrap it with a new method that gathers the names before stopping.

Route a new `session.stopAll` IPC action from the router.

Update `src/cli/defaults.ts` so the new action does not accidentally inherit session/tab defaults.

Add a dedicated non-JSON output branch in `src/cli/output.ts`.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli-program.test.ts tests/daemon.integration.test.ts tests/output.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/browser/manager.ts src/daemon/router.ts src/cli/output.ts src/cli/defaults.ts tests/cli-program.test.ts tests/daemon.integration.test.ts tests/output.test.ts
git commit -m "feat: add close-all command"
```

### Task 6: Documentation and skill updates

**Files:**
- Modify: `README.md`
- Modify: `/home/txchen/.agents/skills/camou/SKILL.md`

**Step 1: Write the doc checklist**

Document these points:
- `eval` runs in the current tab and returns JSON-serializable results
- `cookies import/export` operate on session/browser-context state
- `close --all` stops all live daemon sessions
- examples for normal and `--json` usage

**Step 2: Update docs**

Add examples such as:

```bash
camou eval 'document.title'
camou cookies export cookies.json
camou cookies import cookies.json
camou close --all
```

Update the skill doc so agents know these are now first-class commands and don’t suggest ad-hoc workarounds first.

**Step 3: Verify docs are accurate**

Run:
```bash
npm run dev -- --help
npm run dev -- cookies --help
npm run dev -- close --help
```

Expected: all new commands appear with accurate descriptions.

**Step 4: Commit**

```bash
git add README.md /home/txchen/.agents/skills/camou/SKILL.md
git commit -m "docs: add eval cookies and close-all workflows"
```

### Task 7: Final verification

**Files:**
- Modify: none

**Step 1: Run focused tests**

Run:
```bash
npm test -- tests/cli-program.test.ts tests/daemon.integration.test.ts tests/output.test.ts tests/cli-json.integration.test.ts
```

Expected: PASS

**Step 2: Run full suite**

Run:
```bash
npm test
```

Expected: PASS, or unrelated existing failures only.

**Step 3: Manual sanity checks**

Run:
```bash
npm run dev -- eval 'document.title' --session default --tabname main
npm run dev -- cookies export --json --session default
npm run dev -- close --all --json
```

Expected: structured output, no IPC/protocol crashes, and command behavior matches the tests.
