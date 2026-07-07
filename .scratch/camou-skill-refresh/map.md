# Camou Skill Refresh Map

Labels: wayfinder:map

## Destination

Produce an implementation-ready plan for refreshing the Camou agent skill for 0.11.0. The planned shape is a short stable `skills/camou/SKILL.md` bootstrap stub plus version-matched workflow/reference content served by the `camou` CLI.

## Notes

- Use the `wayfinder` skill for this effort; use `domain-modeling` if terms like "skill stub", "version-matched skill content", "core skill", "reference content", or "specialized skill" become ambiguous.
- The user agreed with the central premise: add a `camou skills` CLI surface, similar to Agent Browser's `agent-browser skills get core`, so agents can load guidance that matches the installed Camou version.
- Reference structure: `/home/txchen/code/github/agent-browser/skills/agent-browser/SKILL.md`.
- Current Camou skill sources: `skills/camou/SKILL.md` and `skills/camou/references/workflows.md`.
- Current Camou command baseline: package version `0.11.0`, `src/cli/program.ts`, `docs/agent-browser-command-parity.md`, `docs/agent-browser-migration.md`, `README.md`, and `CHANGELOG.md`.
- Preserve Camoucli's architecture from `AGENTS.md`: Node >=20, plain JavaScript from `dist/`, thin CLI, daemon-owned sessions/tabs/refs/state/artifacts, newline-delimited JSON IPC, Playwright Core over local Camoufox, no Python SDK dependency, no Bun-specific runtime behavior.
- The endpoint is a plan, not the implementation itself.

## Decisions so far

- [Inventory Current Skill Drift](issues/01-inventory-current-skill-drift.md) — The current skill is correct for the old narrow happy path but structurally stale for 0.11.0; the refresh should use a short installed stub plus CLI-served version-matched `core` and `core --full` content.
- [Decide Camou Skills Command Contract](issues/02-decide-camou-skills-command-contract.md) — `camou skills` should match Agent Browser's broader no-daemon contract: `list`, `get`, `get --full`, `get --all`, `path`, JSON envelopes, `CAMOU_SKILLS_DIR`, and `hidden: true`.
- [Decide Skill Content Packaging](issues/03-decide-skill-content-packaging.md) — Keep install stubs in `skills/`, put CLI-served runtime content in `skill-data/`, publish both as package data, and read Markdown at runtime without embedding it in TypeScript or copying it into `dist`.
- [Decide Core Skill Content Model](issues/04-decide-core-skill-content-model.md) — Use a three-tier model: a tiny hidden install stub, a substantial normal `core` guide, and `core --full` references/templates for exhaustive command, state, network/debug, Node API, and migration material.
- [Decide Specialized Skill Boundaries](issues/05-decide-specialized-skill-boundaries.md) — Ship only one visible runtime skill, `core`, in the first refresh; keep node, migration, network, debug, and troubleshooting material inside `core`/`core --full` until repeated demand justifies separate skills.
- [Decide Skill Install And Docs Story](issues/06-decide-skill-install-and-docs-story.md) — README and the stub should explain the two-layer model: `npx skills add` installs a thin hidden discovery stub, while `camou skills get core` / `--full` provide version-matched runtime guidance; remove live references from `skills/camou/` after absorbing them into `skill-data/core`.
- [Plan Skill Refresh Implementation Slices](issues/07-plan-skill-refresh-implementation-slices.md) — Implement in five vertical slices: no-daemon `camou skills` runtime, package data plus stub, normal `core`, `core --full` references/templates, then README/changelog/package verification.

## Not yet specified

None.


## Out of scope

- Implementing the `camou skills` command or rewriting the skill during this charting session.
- Reopening Agent Browser command-parity scope; use `.scratch/agent-browser-command-parity/map.md` and `docs/agent-browser-command-parity.md` as the settled 0.11.0 command baseline.
