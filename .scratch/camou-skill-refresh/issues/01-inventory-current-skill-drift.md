Status: resolved
Type: research
Blocked by:

# Inventory Current Skill Drift

## Question

What is stale, duplicated, missing, or misleading in the current Camou skill compared with Camoucli 0.11.0 and the Agent Browser stub model?

Compare `skills/camou/SKILL.md`, `skills/camou/references/workflows.md`, `README.md`, `docs/agent-browser-command-parity.md`, `docs/agent-browser-migration.md`, `src/cli/program.ts`, and `/home/txchen/code/github/agent-browser/skills/agent-browser/SKILL.md`.

The answer should group findings by agent workflow impact: bootstrap/install guidance, core automation loop, session/tab/profile/state guidance, network/debug/artifact workflows, Node API guidance, command reference coverage, unsupported/out-of-scope surfaces, and release/version drift risk.

## Answer

Resolved in [Current Camou Skill Drift](../research/01-current-skill-drift.md).

The current Camou skill is accurate for the old narrow happy path, but structurally stale for 0.11.0. It is a long static installed guide plus a static reference file, while Agent Browser's installed skill is a short discovery stub that tells agents to load version-matched content from the installed CLI.

Main findings:

- Bootstrap/install guidance should move toward a stable stub that points to `camou skills get core` and `camou skills get core --full`.
- The core `open -> snapshot -i -> @refs -> re-snapshot` loop remains correct.
- The command reference is materially incomplete for 0.11.0: it omits or under-describes richer automation, state/storage, network/HAR, debug/artifact, runtime settings, semantic find, session info/id, window, migration aliases, and unsupported stubs.
- The state model needs sharper agent-facing guidance: live daemon session, persistent profile, and portable storage-state are distinct.
- `CamouClient` should be presented as stable and first-class for implemented daemon workflows, while CLI-only aliases and unsupported migration stubs should stay out of the Node API.
- CLI-served skill content should be treated as a release-drift control mechanism, not just a docs rearrangement.
