# Skill Content Packaging

## Question

Where should CLI-served skill content live in the source tree and npm package, and how should the build publish it?

## Decision

Use Agent Browser's data-directory pattern:

- `skills/` remains the external skill-install directory. `skills/camou/SKILL.md` becomes the short bootstrap stub and should carry `hidden: true`.
- Add `skill-data/` for CLI-served runtime skills. The initial runtime skill should live at `skill-data/core/SKILL.md`, with optional `skill-data/core/references/` and `skill-data/core/templates/`.
- Add both `skills` and `skill-data` to `package.json` `files`, alongside `dist`, `README.md`, `CHANGELOG.md`, and `LICENSE*`.
- Implement runtime discovery by reading Markdown files from package data directories using Node `fs` APIs. Do not embed large Markdown strings in TypeScript.
- Do not add a build copy step for the initial implementation. Keep `npm run build` as `tsc -p tsconfig.json`; `npm pack` should include the source Markdown directories directly.

## Why

Agent Browser explicitly splits skill content into `skills/` discovery stubs and `skill-data/` runtime skill content. Its npm package includes both directories, and its `skills` command discovers `SKILL.md` files across them. Hidden stubs are excluded from `skills list` and `skills get --all`, but remain fetchable directly by name. This matches the command contract already chosen for Camou.

Camou's current npm package does not include `skills/`, and `npm pack --dry-run --json` confirms the packed tarball currently contains `dist`, `README.md`, `CHANGELOG.md`, `package.json`, and compiled files only. The current `package.json` `files` list also includes only `dist`, `README.md`, `CHANGELOG.md`, and `LICENSE*`.

Camou's TypeScript config compiles only `src/**/*.ts` from `src` to `dist`, with `rootDir: "src"` and `outDir: "dist"`. Markdown under `skill-data/` or `skills/` will not be copied by `tsc`. That makes a source-data packaging approach cleaner than pretending the TypeScript build owns Markdown assets.

## Rejected Options

### Embed Markdown In TypeScript

Reject this. Embedding large skill documents in `.ts` constants would make content edits noisier, make `--full` supplementary files awkward, and blur source/content ownership. It would also make the eventual skill content harder to compare with Agent Browser's `skill-data/*/SKILL.md` pattern.

### Copy Markdown Into `dist/`

Reject for the initial implementation. A copy step would work, but it adds build machinery just to publish static files. Camou currently has no asset-copy pipeline; `npm run build` is a plain `tsc` command. Adding `skills` and `skill-data` to package data is simpler and matches Agent Browser.

### Keep Runtime Content Under `skills/camou/references/`

Reject as the runtime source of truth. `skills/camou` should become the external installer stub. Runtime content should live in a clearly separate directory so agents and maintainers can distinguish "installed discovery stub" from "CLI-served version-matched guidance".

## Runtime Directory Resolution

Implement a small `src/cli/skills.ts` module that resolves skill directories in this order:

1. If `CAMOU_SKILLS_DIR` is set and points to a directory, search only that directory.
2. Otherwise find the package root relative to the running module and search:
   - `<package root>/skills`
   - `<package root>/skill-data`

For Camou, package-root resolution can be simpler than Agent Browser's native binary logic. In both source and built layouts, `new URL('../../', import.meta.url)` from `src/cli/skills.ts` or `dist/cli/skills.js` resolves to the repo/package root:

- dev: `src/cli/skills.ts` -> project root
- built: `dist/cli/skills.js` -> package root
- global or `npx`: `node_modules/camou/dist/cli/skills.js` -> package root

The implementation should still tolerate missing directories and return the agreed "Skills directory not found. Set CAMOU_SKILLS_DIR or reinstall camou." error when no searchable directory exists.

## Package Layout

Recommended future tree:

```text
/
├── skills/
│   └── camou/
│       └── SKILL.md              # hidden bootstrap stub for skills installers
├── skill-data/
│   └── core/
│       ├── SKILL.md              # runtime core guide returned by camou skills get core
│       ├── references/
│       │   └── commands.md       # included by --full, exact file names decided later
│       └── templates/
│           └── ...               # optional, included by --full
├── src/
│   └── cli/
│       ├── skills.ts             # discovery/read/format logic
│       ├── program.ts            # command parsing
│       └── main.ts               # no-daemon handler wiring
└── dist/
    └── ...                       # compiled JavaScript only
```

Recommended `package.json` `files` addition:

```json
{
  "files": [
    "dist",
    "skills",
    "skill-data",
    "README.md",
    "CHANGELOG.md",
    "LICENSE*"
  ]
}
```

## Local Dev, Global Install, And `npx`

This packaging model satisfies all three execution modes:

- Repo-local `npm run dev -- skills get core`: `tsx` runs `src/cli/main.ts`; package root resolution reaches repo-root `skill-data/`.
- Built local `node dist/cli/main.js skills get core`: `dist/cli` resolves two levels up to repo root.
- Global install or `npx camou skills get core`: the npm tarball includes `skill-data/` and `skills/`, and `dist/cli` resolves two levels up to the installed package root.

`CAMOU_SKILLS_DIR` should be used for tests and package-layout diagnostics, not normal user configuration.

## Testing Implications

Implementation should include focused tests for:

- frontmatter parsing, including multiline `description` and `hidden: true`
- `skills list` excluding hidden skills
- direct `skills get camou` still fetching a hidden stub
- `skills get core`
- `skills get core --full` appending `references/` and `templates/`
- `skills get --all` excluding hidden skills
- `skills path` and `skills path core`
- JSON envelopes for list/get/path and error cases
- no-daemon behavior: `skills` commands must not call `ensureDaemonRunning`
- `CAMOU_SKILLS_DIR` fixture override
- `npm pack --dry-run --json` includes `skills/camou/SKILL.md` and `skill-data/core/SKILL.md`

## Source Points

- Camou package files currently omit `skills` and `skill-data`: `package.json:27-32`
- Camou build is plain `tsc`: `package.json:36-44`
- TypeScript only includes `src/**/*.ts` and emits to `dist`: `tsconfig.json:1-31`
- Camou CLI daemon actions currently live in `src/cli/main.ts`; `runDaemonAction` starts the daemon, so `skills` should be handled outside that path: `src/cli/main.ts:18-27`
- Agent Browser package includes both `skill-data` and `skills`: `/home/txchen/code/github/agent-browser/package.json`
- Agent Browser split is documented in source comments: `/home/txchen/code/github/agent-browser/cli/src/skills.rs:20-30`
- Agent Browser command bypasses daemon handling: `/home/txchen/code/github/agent-browser/cli/src/main.rs:1004-1007`
- Agent Browser skills command reads `references/` and `templates/` for `--full`: `/home/txchen/code/github/agent-browser/cli/src/skills.rs:184-212`
