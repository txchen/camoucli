# Skill Refresh Implementation Slices

## Question

How should the accepted skill refresh be split into independently implementable work?

## Summary

Implement the refresh in five vertical slices:

1. Add the no-daemon `camou skills` CLI runtime.
2. Add packaged skill data and rewrite the installed stub.
3. Author the normal `core` runtime guide.
4. Add `core --full` references/templates.
5. Update README/changelog and package verification.

This sequence keeps the CLI contract testable before content is large, then adds content in layers, then updates public docs and packaging verification. Each slice can be implemented and verified independently, but the published feature is complete only after all five.

## Slice 1: No-Daemon `camou skills` CLI Runtime

### What To Build

Add the `camou skills` command surface with fixture-backed tests before introducing production content.

Commands:

```bash
camou skills
camou skills list
camou skills get <name>
camou skills get <name> --full
camou skills get --all
camou skills path [name]
```

### Files To Touch

- `src/cli/skills.ts` - new module for discovery, frontmatter parsing, content loading, JSON/plain output data, and path resolution.
- `src/cli/program.ts` - command parsing and handler interface additions, or direct command action if the repo pattern fits better.
- `src/cli/main.ts` - wire the command so it does not call `runDaemonAction`, `ensureDaemonRunning`, browser install checks, or registry lookup.
- `tests/cli-program.test.ts` - parser/handler coverage.
- New focused tests, recommended `tests/cli-skills.test.ts`, for discovery and formatting behavior.

### Acceptance Criteria

- `camou skills` behaves exactly like `camou skills list`.
- `list` excludes `hidden: true` skills.
- `get <name>` can fetch hidden skills directly.
- `get --all` excludes hidden skills.
- `get <name> --full` appends/readies `references/` and `templates/` content.
- `path` prints searched directories; `path <name>` prints one skill directory.
- `--json` uses the agreed `{ "success": true, "data": ... }` envelope.
- JSON errors use `{ "success": false, "error": "..." }` and exit code `1`.
- Human errors are simple and match the decided strings:
  - `Skill not found: node`
  - `Unknown skills subcommand: foo`
  - `No skill name provided. Usage: camou skills get <name>`
  - `Skills directory not found. Set CAMOU_SKILLS_DIR or reinstall camou.`
- `CAMOU_SKILLS_DIR` overrides discovery and points at one fixture directory containing skill subdirectories.
- The command does not start the daemon or touch browser/session state.

### Verification

```bash
npm run build
npm test -- tests/cli-program.test.ts tests/cli-skills.test.ts
```

## Slice 2: Package Data Layout And Installed Stub

### What To Build

Introduce the production package data directories and rewrite the external installed skill as a short hidden stub.

### Files To Touch

- `skills/camou/SKILL.md` - replace long static guide with hidden bootstrap stub.
- `skills/camou/references/workflows.md` - delete after absorbing useful content into later runtime docs, or remove the `references/` directory entirely.
- `skill-data/core/SKILL.md` - add a minimal placeholder runtime guide sufficient for Slice 1 commands to return real content.
- `package.json` - add `skills` and `skill-data` to `files`.
- `tests/cli-skills.test.ts` - add production-path smoke coverage if not already present.

### Acceptance Criteria

- `skills/camou/SKILL.md` frontmatter includes:
  - `name: camou`
  - existing description intent
  - `allowed-tools: Bash(camou:*), Bash(npx camou:*), Bash(node:*), Bash(npm:*)`
  - `hidden: true`
- Stub body says it is a discovery stub, not the usage guide.
- Stub body shows:
  - `camou skills get core`
  - `camou skills get core --full`
  - `npx camou skills get core`
  - `npx camou skills get core --full`
  - `npm run dev -- skills get core`
  - `npm run dev -- skills get core --full`
- Stub includes only a tiny emergency loop and ref-staleness warning.
- Stub no longer contains the long command reference, Node API guide, network/debug/state sections, or lengthy troubleshooting.
- `skills/camou/references/workflows.md` is no longer a live reference file under the stub.
- `camou skills list` shows only `core`.
- `camou skills get camou` still works by direct hidden fetch.
- `npm pack --dry-run --json` includes `skills/camou/SKILL.md` and `skill-data/core/SKILL.md`.

### Verification

```bash
npm run build
npm test -- tests/cli-skills.test.ts
npm pack --dry-run --json
```

## Slice 3: Normal `core` Runtime Guide

### What To Build

Replace the minimal `skill-data/core/SKILL.md` placeholder with the approved normal runtime guide.

### Files To Touch

- `skill-data/core/SKILL.md`
- Possibly `tests/cli-skills.test.ts` for key-content assertions.

### Acceptance Criteria

`skill-data/core/SKILL.md` is roughly 250-450 lines and includes:

- frontmatter:
  - `name: core`
  - description for core Camou usage
  - `allowed-tools: Bash(camou:*), Bash(npx camou:*), Bash(node:*), Bash(npm:*)`
- core `open -> snapshot -i -> act on @refs -> re-snapshot` workflow
- JSON-first agent examples
- ref lifecycle: per-tab, cleared by navigation and new snapshot
- install/quickstart basics and explicit browser download note
- reading/inspection commands
- common interactions, waits, screenshots, downloads, keyboard/mouse, upload, and drag
- session/tab/profile/state/project-default guidance
- network/HAR basics and in-memory lifetime
- debug/artifact basics and artifact paths
- Node API split between `Camoufox` and `CamouClient`
- browser version, preset, fingerprint, and `doctor` troubleshooting guidance
- local Camoufox scope and unsupported migration stubs
- safe-working rules
- pointer to `camou skills get core --full`

The guide should not duplicate every full command table; exhaustive reference belongs in Slice 4.

### Verification

```bash
npm run build
npm test -- tests/cli-skills.test.ts
npm run dev -- skills get core
```

Manual check:

```bash
npm run dev -- skills get core | sed -n '1,80p'
```

## Slice 4: `core --full` References And Templates

### What To Build

Add the supplementary reference and template files returned by `camou skills get core --full`.

### Files To Touch

- `skill-data/core/references/commands.md`
- `skill-data/core/references/sessions-state.md`
- `skill-data/core/references/network-debug-artifacts.md`
- `skill-data/core/references/node-api.md`
- `skill-data/core/references/migration-scope.md`
- `skill-data/core/templates/form-automation.sh`
- `skill-data/core/templates/authenticated-session.sh`
- `skill-data/core/templates/network-har-capture.sh`
- `tests/cli-skills.test.ts`

### Acceptance Criteria

- `commands.md` contains the complete command reference, including:
  - browser management
  - shared browser flags
  - navigation and aliases
  - snapshot/ref commands
  - read/get/is/find
  - interactions
  - keyboard/mouse
  - wait/download/screenshot
  - sessions/tabs/windows
  - profiles/cookies/storage/state
  - runtime settings/frame/dialog
  - network/HAR
  - debug/artifacts
  - diff/vitals/init scripts
  - Node API mapping
  - unsupported/out-of-scope surfaces
- `sessions-state.md` defines session/profile/state/tab and includes persistence/security/cleanup guidance.
- `network-debug-artifacts.md` covers lifetimes, buffers, artifact paths, and caveats.
- `node-api.md` covers `Camoufox`, `CamouClient`, method families, result/error shape, and CLI-only aliases.
- `migration-scope.md` covers supported/adapted/unsupported/out-of-scope Agent Browser migration framing.
- Templates are shell-oriented, editable, and include comments where agents should fill refs/URLs/session names.
- `camou skills get core --full` prints separators like `--- references/commands.md ---`.
- `camou skills get core --full --json` includes a `files` array with `{ "path", "content" }` entries.

### Verification

```bash
npm run build
npm test -- tests/cli-skills.test.ts
npm run dev -- skills get core --full
npm run dev -- --json skills get core --full
```

Manual checks:

```bash
npm run dev -- skills get core --full | rg '^--- (references|templates)/'
npm run dev -- --json skills get core --full | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s); if(!j.success || !j.data[0].files?.length) process.exit(1);})'
```

## Slice 5: README, Changelog, Package Verification

### What To Build

Update public docs and release notes after the runtime behavior and content exist.

### Files To Touch

- `README.md`
- `CHANGELOG.md`
- `package.json` if not completed in Slice 2
- Existing docs only if needed; no separate migration doc is required.

### Acceptance Criteria

README:

- Install section mentions `camou skills get core` and `camou skills get core --full`.
- `Install The Skill` explains the two-layer model:
  - `npx skills add txchen/camoucli --skill camou` installs a thin stub
  - the stub points to `camou skills get core`
  - CLI-served content matches installed Camou version
  - users with old installed static skill should reinstall
- Command reference has a `Skills` subsection covering:
  - `camou skills`
  - `camou skills list`
  - `camou skills get <name>`
  - `camou skills get <name> --full`
  - `camou skills get --all`
  - `camou skills path [name]`
  - `CAMOU_SKILLS_DIR`
  - no-daemon/no-browser-side-effects behavior
- Development section includes repo-local skill commands.

CHANGELOG:

- Adds `camou skills` to the relevant version's Added section.
- Notes the static skill guide was replaced by a short discovery stub in Changed.

Package verification:

- `npm pack --dry-run --json` includes `skills/camou/SKILL.md`, `skill-data/core/SKILL.md`, references, and templates.

### Verification

```bash
npm run build
npm test
npm pack --dry-run --json
```

Manual checks:

```bash
npm run dev -- skills list
npm run dev -- skills get core
npm run dev -- skills get core --full
npm run dev -- --json skills list
```

## Dependency Order

```text
Slice 1: CLI runtime
  -> Slice 2: package data + stub
      -> Slice 3: normal core guide
          -> Slice 4: full references/templates
              -> Slice 5: public docs/release verification
```

Slice 3 and Slice 4 can be drafted in parallel once Slice 2 creates the directory structure, but they should land after Slice 1 so the content can be exercised through the real command.

## Implementation Notes

- Keep the CLI thin. Skills commands are local file reads and formatting only; they should not involve IPC or the daemon.
- Prefer a small reusable `src/cli/skills.ts` API over embedding logic inside `program.ts`.
- Use standard Node APIs only: `node:fs/promises`, `node:path`, and `import.meta.url`.
- Preserve Node `>=20` ESM compatibility.
- Avoid adding dependencies for YAML parsing; the required frontmatter fields are simple enough for a constrained parser matching Agent Browser's behavior.
- Do not add specialized skills in this implementation. Only visible runtime skill is `core`; hidden `camou` remains fetchable directly.
- Keep exhaustive command text in `core --full` references rather than bloating the installed stub or normal `core`.

## Done Definition

The refresh is implementation-complete when:

- `camou skills get core` works in repo-local, built local, global install, and `npx` package layouts.
- `camou skills get core --full` includes the agreed references/templates.
- `camou skills list` shows `core` and not hidden `camou`.
- `camou skills get camou` fetches the hidden stub.
- JSON output and JSON errors match the chosen Agent Browser-style envelope.
- The daemon is not started by any `skills` command.
- README and changelog explain the new two-layer model.
- `npm run build`, `npm test`, and `npm pack --dry-run --json` pass.
