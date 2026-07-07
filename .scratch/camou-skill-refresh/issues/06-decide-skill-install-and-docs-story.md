Status: resolved
Type: research
Blocked by: 02, 04

# Decide Skill Install And Docs Story

## Question

How should README, packaged skill docs, and external skill-install instructions change once `camou skills` becomes the source of version-matched guidance?

Decide the install examples, fallback guidance for agents that cannot run `camou skills`, how much command reference remains in the static installed skill, and how to explain the relationship between `npx skills add txchen/camoucli --skill camou`, the bootstrap stub, and `camou skills get core`.

The answer should include documentation acceptance criteria for README, `skills/camou/SKILL.md`, any reference files retained under `skills/camou/`, and release notes or migration notes if needed.

## Answer

Resolved in [Skill Install And Docs Story](../research/06-skill-install-docs-story.md).

Document Camou's agent skill as a two-layer system:

1. `npx skills add txchen/camoucli --skill camou` installs a thin external discovery stub at `skills/camou/SKILL.md`.
2. `camou skills get core` and `camou skills get core --full` load version-matched runtime guidance from the installed CLI.

README changes should:

- keep the external skill install commands
- explain that the installed skill is intentionally a stub
- add `camou skills` command reference coverage
- include global, `npx`, and repo-local examples
- note that `camou skills` does not start the daemon or touch browser state
- document `CAMOU_SKILLS_DIR` as a test/local diagnostic override

`skills/camou/SKILL.md` should become the short hidden bootstrap stub and should not retain the full command reference, Node API guide, network/debug/state sections, or lengthy troubleshooting.

Do not retain `skills/camou/references/workflows.md` as a live reference after the refresh. Absorb useful content into `skill-data/core/SKILL.md` and `skill-data/core/references/sessions-state.md`, then leave `skills/camou/` as the stub-only install surface.

Update changelog/release notes when implemented: add `camou skills` and note that the static Camou skill guide was replaced by a short discovery stub pointing to CLI-served runtime guidance. No separate migration doc is required, but README/stub should tell users with an old installed skill to reinstall it.
