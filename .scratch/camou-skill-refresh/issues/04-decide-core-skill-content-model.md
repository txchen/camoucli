Status: resolved
Type: prototype
Blocked by: 01, 02

# Decide Core Skill Content Model

## Question

What should the refreshed `core` skill actually contain at normal and full fidelity?

Produce a rough outline for the stable stub, `camou skills get core`, and `camou skills get core --full`. Decide what belongs in the always-loaded bootstrap versus CLI-served core guidance, and decide which 0.11.0 workflows must be first-class: open/snapshot/ref loop, sessions/tabs/profiles, project defaults, command-parity migration aliases, network/HAR, debug/artifacts, Node API split, troubleshooting, and unsupported surfaces.

The answer should be concrete enough that an implementation ticket can rewrite the skill content without another broad content-design pass.

## Answer

Resolved by the approved prototype [Core Skill Content Model](../prototypes/04-core-skill-content-model.md).

Use three tiers:

1. `skills/camou/SKILL.md` stays as the installable external skill, but becomes a short `hidden: true` bootstrap stub.
2. `skill-data/core/SKILL.md` becomes the normal runtime guide returned by `camou skills get core`.
3. `camou skills get core --full` returns `skill-data/core/SKILL.md` plus supplementary `references/` and `templates/`.

The installed stub should contain only what Camou is, how to load `core` and `core --full` using global, `npx`, and repo-local commands, and a tiny emergency `open -> snapshot -i --json -> act -> snapshot` loop.

Normal `core` should be substantial but not exhaustive, roughly 250-450 lines. It should cover:

- the core open/snapshot/ref loop and ref lifecycle
- quickstart and install basics
- reading/inspecting pages
- common interactions, waits, screenshots, downloads, keyboard/mouse, upload, and drag
- sessions, tabs, profiles, portable state snapshots, and project defaults
- network/HAR basics
- debug/artifact basics
- Node API split between `Camoufox` and `CamouClient`
- browser versions, presets, fingerprint helpers, and doctor troubleshooting
- local Camoufox scope, migration caveats, unsupported stubs, and safe-working rules

`core --full` should add supplementary files, initially:

- `references/commands.md`
- `references/sessions-state.md`
- `references/network-debug-artifacts.md`
- `references/node-api.md`
- `references/migration-scope.md`
- `templates/form-automation.sh`
- `templates/authenticated-session.sh`
- `templates/network-har-capture.sh`

Do not decide specialized runtime skills in this ticket. Normal `core` should include enough network/debug/node/migration guidance for 0.11.0; the later specialized-skill ticket decides whether any area deserves a separate skill.
