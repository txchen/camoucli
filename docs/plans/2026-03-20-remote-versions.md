# Remote Versions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `camou remote-versions` command that lists only remotely available Camoufox versions compatible with the current machine.

**Architecture:** Refactor release discovery in `src/camoufox/installer.ts` into a reusable listing helper that applies the same platform asset filtering used by install resolution. Wire a new top-level CLI command through `src/cli/program.ts`, `src/cli/main.ts`, and `src/cli/output.ts`, then cover behavior with focused installer, parser, and output tests.

**Tech Stack:** TypeScript, Commander, Vitest, GitHub Releases API.

### Task 1: Add parser and output expectations

**Files:**
- Modify: `tests/cli-program.test.ts`
- Modify: `tests/output.test.ts`

**Step 1: Write the failing test**

Add a CLI parsing test that verifies `camou remote-versions --json` routes to a new handler. Add output tests for human-readable and JSON-compatible remote version listings.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli-program.test.ts tests/output.test.ts`
Expected: FAIL because `remote-versions` and its output handler do not exist.

**Step 3: Write minimal implementation**

Add only enough parser and output support scaffolding to satisfy the test contracts once the handler exists.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli-program.test.ts tests/output.test.ts`
Expected: PASS

### Task 2: Add remote release listing helper

**Files:**
- Modify: `tests/install.integration.test.ts`
- Modify: `src/camoufox/installer.ts`

**Step 1: Write the failing test**

Add installer tests that mock GitHub releases and assert the new listing helper returns only machine-compatible versions and preserves metadata used by the CLI.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/install.integration.test.ts`
Expected: FAIL because the helper does not exist.

**Step 3: Write minimal implementation**

Factor shared GitHub release scanning into a reusable helper, export a machine-filtered `listRemoteCamoufoxReleases()` function, and refactor `resolveRelease()` to build on it.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/install.integration.test.ts`
Expected: PASS

### Task 3: Wire CLI command end-to-end

**Files:**
- Modify: `src/cli/program.ts`
- Modify: `src/cli/main.ts`
- Modify: `src/cli/output.ts`
- Modify: `README.md`

**Step 1: Write the failing test**

Use the parser/output/installer tests from Tasks 1-2 as the contract for the new command.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli-program.test.ts tests/output.test.ts tests/install.integration.test.ts`
Expected: FAIL until the command is fully wired.

**Step 3: Write minimal implementation**

Add the `remote-versions` command, handler plumbing, human-readable output, and brief README docs.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli-program.test.ts tests/output.test.ts tests/install.integration.test.ts`
Expected: PASS

### Task 4: Verify targeted behavior

**Files:**
- Modify: none

**Step 1: Run targeted tests**

Run: `npm test -- tests/cli-program.test.ts tests/output.test.ts tests/install.integration.test.ts`
Expected: PASS with no unrelated regressions in these files.

**Step 2: Run a broader sanity check**

Run: `npm test`
Expected: PASS, or unrelated existing failures only.
