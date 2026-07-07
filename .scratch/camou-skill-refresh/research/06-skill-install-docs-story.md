# Skill Install And Docs Story

## Question

How should README, packaged skill docs, and external skill-install instructions change once `camou skills` becomes the source of version-matched guidance?

## Decision

Document Camou's agent skill as a two-layer system:

1. **External installed skill stub**: installed by `npx skills add txchen/camoucli --skill camou`, lives at `skills/camou/SKILL.md`, stays short, and tells agents how to load current runtime guidance.
2. **CLI-served runtime guide**: loaded with `camou skills get core` or `camou skills get core --full`, lives under `skill-data/core/`, and is the source of version-matched operational guidance.

The README should explain both layers. The static installed skill should stop carrying a full guide. Runtime command reference should move to `skill-data/core` and `skill-data/core/references`.

## README Acceptance Criteria

### Install Section

Keep the existing npm install and `npx camou` examples, but add a short note that `camou skills` is available after the CLI is installed:

```bash
camou skills get core
camou skills get core --full
```

For one-off usage:

```bash
npx camou skills get core
npx camou skills get core --full
```

For repo-local development:

```bash
npm run dev -- skills get core
npm run dev -- skills get core --full
```

### Install The Skill Section

Keep the current external install commands:

```bash
npx skills add txchen/camoucli --skill camou
npx skills add txchen/camoucli --list
npx skills add txchen/camoucli --skill camou -g -a opencode
```

Change the explanatory prose. It should say:

- the installed skill is intentionally a thin discovery stub
- the stub points agents to `camou skills get core`
- `camou skills get core` loads guidance matching the installed `camou` version
- `camou skills get core --full` includes the complete reference and templates
- agents should not copy a `SKILL.md` from `node_modules` or from old checkouts as their long-term usage guide, because it can become stale

Recommended wording:

> This installs a thin discovery stub. The stub tells agents to load the current runtime guide with `camou skills get core`, or `camou skills get core --full` for the complete reference and templates. The CLI-served guide matches the installed Camou version, so agents should prefer it over cached or copied static instructions.

### Command Reference

Add a `### Skills` subsection to the README command reference:

```bash
camou skills                  # List available runtime skills
camou skills list             # Same as above
camou skills get <name>       # Output a skill's Markdown content
camou skills get <name> --full # Include references and templates
camou skills get --all        # Output every non-hidden runtime skill
camou skills path [name]      # Print searched skill paths or one skill path
```

Mention:

- `core` is the only visible runtime skill in the first refresh
- `CAMOU_SKILLS_DIR` overrides skill discovery for tests/local diagnostics
- these commands do not start the daemon or touch browser state

### Development Section

Add repo-local examples near existing `npm run dev` guidance:

```bash
npm run dev -- skills list
npm run dev -- skills get core
npm run dev -- skills get core --full
```

Add verification guidance for package contents once implemented:

```bash
npm pack --dry-run --json
```

The packed tarball should include `skills/camou/SKILL.md` and `skill-data/core/SKILL.md`.

## `skills/camou/SKILL.md` Acceptance Criteria

Rewrite the file as the hidden installed stub approved in the content model:

- frontmatter includes `hidden: true`
- keeps the existing name `camou`
- keeps `allowed-tools: Bash(camou:*), Bash(npx camou:*), Bash(node:*), Bash(npm:*)`
- says it is a discovery stub, not the usage guide
- shows global, `npx`, and repo-local loading commands:

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

- explains that CLI-served content matches the installed version
- includes only a tiny emergency loop:

```bash
camou open <url>
camou snapshot -i --json
camou click @e1
camou snapshot -i --json
```

- mentions refs are per tab and stale after navigation or a new snapshot
- does not include the full command reference, Node API examples, network/debug/state sections, or lengthy troubleshooting

## `skills/camou/references/` Decision

Do not retain `skills/camou/references/workflows.md` as a live reference file after the refresh.

Reasoning:

- `skills/camou/` should be the external install stub only.
- Runtime guidance belongs under `skill-data/core/`.
- The useful material from `skills/camou/references/workflows.md` should be absorbed into `skill-data/core/SKILL.md` and `skill-data/core/references/sessions-state.md`.
- Leaving a reference file under the stub would imply that the static installed skill still owns operational guidance, which contradicts the version-matched CLI-served model.

Implementation can either delete `skills/camou/references/workflows.md` or leave no `references/` directory under `skills/camou/`. If any installer expects nested files to exist, keep only the stub and let `camou skills get core --full` be the documented path for references.

## `skill-data/core/` Docs Acceptance Criteria

Create:

- `skill-data/core/SKILL.md`
- `skill-data/core/references/commands.md`
- `skill-data/core/references/sessions-state.md`
- `skill-data/core/references/network-debug-artifacts.md`
- `skill-data/core/references/node-api.md`
- `skill-data/core/references/migration-scope.md`
- `skill-data/core/templates/form-automation.sh`
- `skill-data/core/templates/authenticated-session.sh`
- `skill-data/core/templates/network-har-capture.sh`

Content should follow the approved [Core Skill Content Model](../prototypes/04-core-skill-content-model.md).

## Release Notes / Changelog

Update the 0.11.0 changelog entry if this lands in 0.11.0:

Under Added:

- Added `camou skills` for version-matched agent skill content, including `core`, `core --full`, JSON output, hidden stubs, and package-path diagnostics.

Under Changed:

- Replaced the static Camou agent skill guide with a short discovery stub that points agents at CLI-served runtime guidance.

If this ships after 0.11.0, put those bullets under the next version instead.

## Migration Notes

No separate migration doc is required for end users. The change is an agent-doc delivery change, not a browser automation behavior change.

However, the README and stub should make one migration point explicit:

- Agents or users with an old installed static `camou` skill should reinstall it with `npx skills add txchen/camoucli --skill camou` so they get the new stub.

## Source Points

- Current README skill install section: `README.md:69-89`
- Current README command reference: `README.md:413-544`
- Current README development commands: `README.md:735-754`
- Current static Camou skill body: `skills/camou/SKILL.md:1-379`
- Current static workflow reference: `skills/camou/references/workflows.md:1-157`
- Agent Browser skills command docs: `/home/txchen/code/github/agent-browser/README.md:469-480`
- Agent Browser skill installer explanation: `/home/txchen/code/github/agent-browser/README.md:1434-1452`
- Agent Browser hidden discovery stub: `/home/txchen/code/github/agent-browser/skills/agent-browser/SKILL.md:1-23`
- Current Camou package files omit `skills` and `skill-data`: `package.json:27-32`
- Current 0.11.0 changelog location: `CHANGELOG.md:7-17`
