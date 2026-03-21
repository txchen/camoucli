# Session Profile Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add first-class commands to inspect all stored browser profiles on disk and safely remove selected profiles, while preserving the existing `camou session list` behavior for running daemon sessions.

**Architecture:** Keep `camou session list` as the daemon-runtime view, and introduce a separate top-level `profile` command group for disk-backed profile inventory and deletion. The daemon will enumerate `profilesDir` using the same sanitization/path rules as launches, annotate stored profiles with running-state information from the in-memory session map, and own deletion so cleanup stays aligned with the project’s “daemon owns sessions and persistent state” architecture.

**Tech Stack:** TypeScript, Commander, newline-delimited JSON IPC, Node `fs/promises`, Vitest.

### Task 1: Define the command contract

**Files:**
- Modify: `README.md`
- Modify: `src/cli/program.ts`
- Modify: `src/ipc/protocol.ts`
- Test: `tests/cli-program.test.ts`

**Step 1: Write the failing test**

Add parser tests for these command paths:
- `camou session list`
- `camou profile list`
- `camou profile remove <name>`
- `camou profile remove <name> --json`

The tests should assert that:
- `session list` remains unchanged and still routes to `session.list`
- `profile list` routes to `profile.list`
- `profile remove <name>` routes to `profile.remove` with the provided profile name

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli-program.test.ts`
Expected: FAIL because the new `profile` commands and protocol shapes do not exist yet.

**Step 3: Write minimal implementation**

Update `src/cli/program.ts` with a new top-level `profile` command group:
- `list` — lists all stored profiles on disk
- `remove <name>` — removes the named stored profile

Update `src/ipc/protocol.ts` with request schemas for:
- `profile.list`
- `profile.remove`

In `README.md`, document the split explicitly:
- `session list` = running sessions
- `profile list` = stored profiles on disk
- `profile remove <name>` = delete one stored profile

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli-program.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add README.md src/cli/program.ts src/ipc/protocol.ts tests/cli-program.test.ts
git commit -m "feat: add profile command surface"
```

### Task 2: Add stored-profile inventory in the daemon

**Files:**
- Create: `src/state/session-profiles.ts`
- Modify: `src/browser/manager.ts`
- Modify: `src/daemon/router.ts`
- Test: `tests/session-profiles.test.ts`
- Test: `tests/daemon.integration.test.ts`

**Step 1: Write the failing test**

Add focused tests for a new filesystem helper that scans `profilesDir` and returns one record per stored profile directory. The tests should cover:
- empty `profilesDir`
- one profile directory with `user-data`, `downloads`, and `artifacts`
- ignoring non-directory junk files
- deriving the stored profile name from the sanitized directory name

Add a daemon integration test that asserts `profile.list` returns stored profiles even when they are not currently running.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/session-profiles.test.ts tests/daemon.integration.test.ts`
Expected: FAIL because the helper and daemon action do not exist.

**Step 3: Write minimal implementation**

Create `src/state/session-profiles.ts` with a small helper surface, for example:
- `listStoredSessionProfiles(paths)`
- `resolveStoredSessionProfile(paths, profileName)`

Each returned record should include:
- `profileName` (sanitized/on-disk name)
- `rootDir`
- `profileDir`
- `downloadsDir`
- `artifactsDir`
- `stored: true`

Then extend `BrowserManager` with `listStoredProfiles()` that:
- uses the helper to scan disk
- annotates each stored record with `running: boolean`
- if running, includes the same live metadata already available from `listSessions()` where cheap and obvious

Route the new action in `src/daemon/router.ts`.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/session-profiles.test.ts tests/daemon.integration.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/state/session-profiles.ts src/browser/manager.ts src/daemon/router.ts tests/session-profiles.test.ts tests/daemon.integration.test.ts
git commit -m "feat: add stored profile inventory"
```

### Task 3: Add safe profile deletion

**Files:**
- Modify: `src/state/session-profiles.ts`
- Modify: `src/browser/manager.ts`
- Modify: `src/daemon/router.ts`
- Modify: `src/util/errors.ts`
- Test: `tests/session-profiles.test.ts`
- Test: `tests/daemon.integration.test.ts`

**Step 1: Write the failing test**

Add tests covering deletion behavior:
- removing a stopped stored profile deletes its root directory
- removing a missing profile returns a clear “not found” result
- removing a running profile stops the session first, then deletes it
- repeated removal is idempotent enough for CLI usability

Choose one explicit contract and lock it in the tests. My recommendation: return a structured success payload with `removed: false` for missing profiles instead of throwing.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/session-profiles.test.ts tests/daemon.integration.test.ts`
Expected: FAIL because the delete path does not exist.

**Step 3: Write minimal implementation**

Add `removeStoredSessionProfile(paths, profileName)` in `src/state/session-profiles.ts`.

Then add `BrowserManager.removeStoredProfile(profileName)` that:
- resolves the sanitized profile directory using the same logic as launches
- checks whether the corresponding session is running in the in-memory map
- if running, calls `stopSession(profileName)` first
- removes the profile root directory recursively
- returns a structured payload like:

```ts
{
  profileName: string,
  removed: boolean,
  stopped: boolean,
  rootDir: string,
}
```

Only introduce a new dedicated error in `src/util/errors.ts` if the result shape cannot express a real failure cleanly.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/session-profiles.test.ts tests/daemon.integration.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/state/session-profiles.ts src/browser/manager.ts src/daemon/router.ts src/util/errors.ts tests/session-profiles.test.ts tests/daemon.integration.test.ts
git commit -m "feat: add stored profile removal"
```

### Task 4: Add CLI output for humans and scripts

**Files:**
- Modify: `src/cli/output.ts`
- Modify: `src/cli/main.ts`
- Test: `tests/output.test.ts`
- Test: `tests/cli-json.integration.test.ts`

**Step 1: Write the failing test**

Add output tests for:
- `profile.list` with zero stored profiles
- `profile.list` with a mix of running/stopped stored profiles
- `profile.remove` success output
- `profile.remove` missing-profile output

Add one JSON integration test to verify the CLI preserves the structured payload under `--json`.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/output.test.ts tests/cli-json.integration.test.ts`
Expected: FAIL because the output cases do not exist.

**Step 3: Write minimal implementation**

In `src/cli/output.ts`:
- keep `session.list` wording as “running sessions” only
- add `profile.list` output with clear stored/running labels
- add `profile.remove` output with deleted path and whether the session had to be stopped first

In `src/cli/main.ts`, no new special handler should be needed if the commands continue to flow through `onDaemonAction`; only add custom handling if output shape needs special normalization.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/output.test.ts tests/cli-json.integration.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli/output.ts src/cli/main.ts tests/output.test.ts tests/cli-json.integration.test.ts
git commit -m "feat: add profile CLI output"
```

### Task 5: Document safe cleanup workflow

**Files:**
- Modify: `README.md`
- Modify: `/home/txchen/.agents/skills/camou/SKILL.md`

**Step 1: Write the failing doc checklist**

Create a short checklist for the docs update:
- explain the difference between runtime sessions and stored profiles
- show how to inspect disk-backed profiles
- show how to remove one safely
- note that profile names are based on sanitized session names on disk

**Step 2: Update docs**

Add examples such as:

```bash
camou session list
camou profile list
camou profile remove work
camou profile list --json
```

In the skill file, add one concise note so agents stop suggesting raw `rm -rf` as the default path.

**Step 3: Verify docs are accurate**

Run the command help if needed:
`npm run dev -- profile --help`

Expected: the new commands appear with accurate descriptions.

**Step 4: Commit**

```bash
git add README.md /home/txchen/.agents/skills/camou/SKILL.md
git commit -m "docs: document stored profile management"
```

### Task 6: Final verification

**Files:**
- Modify: none

**Step 1: Run targeted profile-management tests**

Run:
```bash
npm test -- tests/cli-program.test.ts tests/session-profiles.test.ts tests/daemon.integration.test.ts tests/output.test.ts tests/cli-json.integration.test.ts
```

Expected: PASS

**Step 2: Run the full suite**

Run:
```bash
npm test
```

Expected: PASS, or unrelated existing failures only.

**Step 3: Manual sanity check**

Run:
```bash
npm run dev -- profile list --json
npm run dev -- profile remove default --json
```

Expected: structured output, no daemon/protocol crashes, and deletion semantics match the tests.
