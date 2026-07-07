Status: resolved
Type: grilling
Blocked by:

# Decide Camou Skills Command Contract

## Question

What exact user-facing contract should `camou skills` expose for agents?

Decide command names, arguments, options, and output behavior. Cover at least `camou skills list`, `camou skills get core`, whether `--full` is supported, whether output is plain markdown only or also JSON-capable, error behavior for unknown skill names, and how examples should read for global installs, `npx camou`, and repo-local `npm run dev --`.

The high-level direction is already settled: Camou should add a CLI-served, version-matched skill surface and make the installed `skills/camou/SKILL.md` a stable bootstrap stub.

## Answer

Camou should copy Agent Browser's broader `skills` command contract for 0.11.0, adapted to Camou naming:

```bash
camou skills
camou skills list
camou skills get <name>
camou skills get <name> --full
camou skills get --all
camou skills path [name]
```

`camou skills` is an alias for `camou skills list`. The command must be self-contained: no daemon startup, no browser install check, no Camoufox registry lookup, and no browser/session side effects.

Default output is plain text/Markdown:

- `list` prints visible skill names and descriptions.
- `get <name>` prints the full `SKILL.md` content, including frontmatter.
- `get <name> --full` prints the skill content, then appends supplementary `references/` and `templates/` files with Agent Browser-style file separators.
- `get --all` prints every non-hidden skill, separated by `---`.
- `path` prints searched skill directories, one per line.
- `path <name>` prints the directory for one skill.

`--json` should match Agent Browser's `success`/`data` envelope:

```json
{ "success": true, "data": [{ "name": "core", "description": "..." }] }
```

```json
{ "success": true, "data": [{ "name": "core", "content": "..." }] }
```

For `get --full --json`, each item may include:

```json
{
  "name": "core",
  "content": "...",
  "files": [
    { "path": "references/commands.md", "content": "..." }
  ]
}
```

For `path --json`, use:

```json
{ "success": true, "data": { "paths": ["..."] } }
```

and for `path core --json`:

```json
{ "success": true, "data": { "name": "core", "path": "..." } }
```

Error behavior should match Agent Browser's style with exit code `1`. Human output should be simple:

```text
Skill not found: node
Unknown skills subcommand: foo
No skill name provided. Usage: camou skills get <name>
Skills directory not found. Set CAMOU_SKILLS_DIR or reinstall camou.
```

JSON errors should use:

```json
{ "success": false, "error": "Skill not found: node" }
```

Support `CAMOU_SKILLS_DIR` as a skills-command-only override for tests, local development, and package-layout diagnostics. It points at one directory containing skill subdirectories.

Support `hidden: true` in skill frontmatter. Hidden skills are excluded from `skills list` and `skills get --all`, but remain fetchable directly by name. This lets `skills/camou/SKILL.md` remain an external installer stub while `core` is the canonical runtime skill.

The installed stub should show all three loading forms:

```bash
camou skills get core
camou skills get core --full
```

```bash
npx camou skills get core
npx camou skills get core --full
```

```bash
npm run dev -- skills get core
npm run dev -- skills get core --full
```
