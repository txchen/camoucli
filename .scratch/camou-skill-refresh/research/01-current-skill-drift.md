# Current Camou Skill Drift

## Question

What is stale, duplicated, missing, or misleading in the current Camou skill compared with Camoucli 0.11.0 and the Agent Browser stub model?

Primary sources compared:

- `skills/camou/SKILL.md`
- `skills/camou/references/workflows.md`
- `README.md`
- `docs/agent-browser-command-parity.md`
- `docs/agent-browser-migration.md`
- `src/cli/program.ts`
- `/home/txchen/code/github/agent-browser/skills/agent-browser/SKILL.md`
- `package.json`
- `CHANGELOG.md`

## Summary

The current Camou skill is accurate for the old narrow happy path, but structurally stale for 0.11.0. It is a long static installed guide with a static reference file, while Agent Browser's installed skill is a short discovery stub that tells agents to load version-matched workflow content from the installed CLI.

The biggest practical drift is not one bad command. It is that 0.11.0 added a completed command-parity surface and a typed `CamouClient`, but the installed Camou skill still teaches a small subset of commands and warns agents to check docs before using newer network/debug/artifact methods.

## Bootstrap And Install Guidance

Agent Browser's installed skill is explicitly a discovery stub: before running commands, agents are told to run `agent-browser skills get core` or `agent-browser skills get core --full`, because CLI-served content matches the installed version and avoids stale release-bound static content. It also lists specialized skill names and points to `agent-browser skills list`.

Camou's installed skill is the opposite shape. It directly embeds the workflow guide, best practices, command reference, examples, Node API guidance, troubleshooting, presets, and rules of thumb in one 379-line static file. It then points to `references/workflows.md` for more detail. This means normal skill installation loads a lot of content up front, and every command-surface change requires editing the installed static skill.

README still documents installing the skill through `npx skills add txchen/camoucli --skill camou`, and says the skill teaches the recommended `open -> snapshot -i -> interact with @refs -> re-snapshot` flow plus session/tab/version troubleshooting. It does not describe any CLI-served skill content yet.

Source points:

- Agent Browser stub: `/home/txchen/code/github/agent-browser/skills/agent-browser/SKILL.md:14-23`
- Agent Browser specialized skills/list guidance: `/home/txchen/code/github/agent-browser/skills/agent-browser/SKILL.md:25-37`
- Camou static skill scope: `skills/camou/SKILL.md:7-23`, `skills/camou/SKILL.md:242-379`
- Camou reference file pointer: `skills/camou/SKILL.md:379`
- README skill install docs: `README.md:69-89`

Impact: the refreshed Camou skill should be a short stable bootstrap that tells agents to load `camou skills get core` and likely `camou skills get core --full`, with fallback wording for `npx camou` and repo-local `npm run dev --`.

## Core Automation Loop

The current skill remains strong for the basic browser loop. It correctly teaches `open`, `snapshot -i`, interacting with `@eN` refs, and re-snapshotting after navigation or meaningful page changes. The reference file also correctly states that refs are per-tab and cleared on navigation or a new snapshot.

The drift is coverage, not correctness. 0.11.0 supports more core automation than the skill's essential command list shows. README and the parity matrix include aliases and commands such as `goto`, `navigate`, `dblclick`, `focus`, `keydown`, `keyup`, `keyboard type`, `keyboard inserttext`, `mouse move/down/up/wheel`, `upload`, `drag`, richer `wait`, selector screenshots, richer `get`, `is`, and semantic `find`. The static skill only lists the older narrower subset: `open`, `back`, `forward`, `reload`, `eval`, `snapshot`, `click`, `hover`, `fill`, `type`, `check`, `uncheck`, `select`, `press`, `scroll`, `scrollintoview`, `wait`, `screenshot`, and basic `get`.

Source points:

- Current skill loop: `skills/camou/SKILL.md:25-47`
- Current ref lifecycle reference: `skills/camou/references/workflows.md:3-18`
- Current skill page command subset: `skills/camou/SKILL.md:266-292`
- README 0.11 page command reference: `README.md:431-471`
- Parity matrix core automation rows: `docs/agent-browser-command-parity.md:11-20`
- Parser source for newer direct automation commands: `src/cli/program.ts:973-1204`, `src/cli/program.ts:1266-1351`, `src/cli/program.ts:1634-1667`, `src/cli/program.ts:1802-2046`

Impact: `core` should keep the happy path short, but `core --full` needs the richer 0.11.0 automation command families and a clear recommendation for when to use refs, semantic find, selectors, and direct keyboard/mouse commands.

## Session, Tab, Profile, State, Cookies, And Storage Guidance

The current skill correctly explains persistent sessions, named tabs, profile management, project defaults, cookie import/export, and daemon cleanup. The reference file also correctly distinguishes sessions and tabs and describes project-default precedence.

The drift is that 0.11.0 now has a wider state model than the skill teaches. README and migration docs distinguish full persistent profiles from portable Playwright storage-state snapshots, explain that `state load` merges cookies/localStorage rather than resetting a profile, and document `cookies get/set/clear/import/export`, `storage local/session get/set/clear`, and `state save/load/list/show/clear/clean/rename`. The static skill mentions cookies import/export and profiles, but does not teach cookies get/set/clear, current-origin web storage, portable state snapshots, `session id`, `session info`, `tab` switching, `tab new --label`, or `window new`.

Source points:

- Current skill sessions/tabs/profile guidance: `skills/camou/SKILL.md:50-129`, `skills/camou/SKILL.md:294-302`
- Current reference sessions/tabs/defaults: `skills/camou/references/workflows.md:20-52`
- README state/session command reference: `README.md:495-530`
- README JSON examples for cookies/state: `README.md:387-399`
- Migration docs on sessions/profiles/state/tabs/windows: `docs/agent-browser-migration.md:20-34`
- Parity matrix state/session rows: `docs/agent-browser-command-parity.md:21-24`, `docs/agent-browser-command-parity.md:29-31`
- Parser source for cookies/storage/state: `src/cli/program.ts:657-845`
- Parser source for sessions/profiles/tabs/windows: `src/cli/program.ts:2048-2238`

Impact: refreshed content should define three separate state concepts for agents: live daemon session, persistent profile directory, and portable storage-state file. This belongs in normal `core`, not only in `--full`, because choosing the wrong one causes login persistence bugs.

## Network, Debug, And Artifact Workflows

The current skill barely reflects the 0.11.0 network/debug/artifact surface. It mentions programmatic control using `CamouClient` and warns agents to check the command-parity matrix before using newer network/debug/artifact methods from agent code, but it does not include a network workflow, HAR capture, request inspection, console/error buffers, highlight, clipboard, trace, diff, vitals, pushstate, or init-script guidance in the actual skill body.

README now has a network quick example and states that routes, request logs, and HAR buffers are in-memory daemon/session state. The command reference includes debug/artifact commands and explains that debug buffers and traces clear when the session stops or the daemon exits. Migration docs also define network and debug/artifact lifetimes and unsupported CDP response-body/provider inspection limits.

Source points:

- Current skill warning about newer network/debug/artifact methods: `skills/camou/SKILL.md:23`
- README network quick example: `README.md:113-124`
- README debug/artifact command reference: `README.md:473-493`
- Migration network/debug semantics: `docs/agent-browser-migration.md:40-54`
- Parity matrix network/debug/artifact rows: `docs/agent-browser-command-parity.md:32-38`
- Parser source for network/HAR: `src/cli/program.ts:846-934`
- Parser source for diff/console/vitals/init/unsupported/clipboard/trace: `src/cli/program.ts:1353-1632`

Impact: `core` should include at least a compact network/HAR and debug/artifact playbook, because these are now stable 0.11.0 agent workflows. `core --full` should include lifetimes, artifact paths, and caveats.

## Node API Guidance

The current skill has the right high-level split: use `Camoufox` for direct Playwright access and `CamouClient` for daemon-owned sessions/tabs/refs/state. It includes short examples for both and lists useful exports.

The drift is that the wording still treats network/debug/artifact client methods as "newer" and directs agents to check the matrix before using them, while 0.11.0's docs present `CamouClient` as the typed daemon API for command-parity workflows. README says `CamouClient` returns structured results and preserves Camoucli error classes, and explicitly notes that CLI-only aliases and unsupported compatibility stubs are not duplicated as first-class Node methods. The parity matrix states the same split and maps command families to Node API surfaces.

Source points:

- Current skill Node API guidance: `skills/camou/SKILL.md:183-240`
- Current reference Node API guidance: `skills/camou/references/workflows.md:69-108`
- Changelog 0.11.0 `CamouClient` change: `CHANGELOG.md:7-17`
- README Node API split: `README.md:180-266`
- Parity matrix Node API split: `docs/agent-browser-command-parity.md:42-46`
- Migration Node API split: `docs/agent-browser-migration.md:56-82`

Impact: refreshed content should present `CamouClient` as first-class and stable for implemented daemon workflows, while still telling agents not to use CLI-only aliases or unsupported stubs as Node API methods.

## Command Reference Coverage

The static skill command reference is now materially incomplete. Missing or under-described 0.11.0 families include:

- browser management: `remote-versions`, `fingerprint-profiles`
- eval input modes: `--base64`, `--stdin`
- aliases: `goto`, `navigate`, `key`, `scrollinto`, `quit`, `exit`, `web-vitals`
- direct automation: `download`, `dblclick`, `focus`, `keydown`, `keyup`, `keyboard *`, `mouse *`, `upload`, `drag`
- richer waits and screenshots: `wait --url`, `--fn`, `--download`, `--path`, `--timeout`; `screenshot [targetOrPath] [path]` with selector/full/viewport/format/quality semantics
- read/get/is/find: `read`, `get html/attr/count/box/styles`, `is visible/enabled/checked`, semantic `find`
- runtime state: `set viewport/geolocation/offline/headers/credentials/media`, `frame`, `dialog`
- state and storage: `cookies get/set/clear`, `storage local/session`, `state save/load/list/show/clear/clean/rename`
- network/debug/artifacts: `network route/unroute/requests/request/har`, `console`, `errors`, `highlight`, `clipboard`, `trace`, `diff`, `vitals`, `pushstate`, `addinitscript`, `removeinitscript`
- sessions/tabs: `session`, `session id`, `session info`, `tab [target]`, `tab new --label`, `window new`
- unsupported migration stubs: `connect`, `inspect`, `profiler`, `pdf`, plus hidden unsupported launch flags

Source points:

- Current static command reference: `skills/camou/SKILL.md:242-302`
- README complete command reference sections: `README.md:413-544`
- Shared launch flags in parser: `src/cli/program.ts:226-271`
- Parser command surface: `src/cli/program.ts:644-2238`
- Parity matrix full command surface: `docs/agent-browser-command-parity.md:7-40`

Impact: the stable installed stub should not try to carry this full command reference. The CLI-served `core --full` content should own the fuller reference because it can match the installed version.

## Unsupported And Out-Of-Scope Surfaces

The current skill does not explain unsupported Agent Browser migration stubs or out-of-scope product surfaces. 0.11.0 docs explicitly say Camoucli is local Camoufox/Playwright, not a remote provider or CDP compatibility layer. Unsupported surfaces include `connect`, `inspect`, `profiler`, `pdf` until smoke-proven, arbitrary executable path/browser engine/extension/restore policy, CDP/provider flags, auth vault, MCP, dashboard, chat, plugins, skills, self-upgrade, and remote provider control.

Source points:

- README unsupported/out-of-scope section: `README.md:533-544`
- Migration local scope and unsupported alternatives: `docs/agent-browser-migration.md:1-18`
- Parity matrix unsupported/out-of-scope rows: `docs/agent-browser-command-parity.md:26`, `docs/agent-browser-command-parity.md:39-40`
- Parser unsupported migration flags and stubs: `src/cli/program.ts:259-264`, `src/cli/program.ts:382-402`, `src/cli/program.ts:1526-1565`

Impact: refreshed guidance should prevent agents from attempting Agent Browser provider/CDP/product workflows through Camou. This likely belongs in both the stub and `core`, with more detailed alternatives in `core --full`.

## Release And Version Drift Risk

Package version is 0.11.0, and the changelog says this release added the typed `CamouClient`, Agent Browser command-parity/migration docs, and updated README/help/agent workflow docs for the completed command-parity surface. The current skill did get some updates, but its structure means future changes will keep drifting unless the operational guide is served by the installed CLI.

There is also a packaging implication for the planned `camou skills` command: the npm package currently publishes `dist`, `README.md`, `CHANGELOG.md`, and `LICENSE*` only. If CLI-served skill markdown is stored outside `dist`, `package.json` must change or the build must copy/embed the content into `dist`.

Source points:

- Package version and published files: `package.json:1-34`
- Changelog 0.11.0 additions/changes: `CHANGELOG.md:7-17`
- Agent Browser rationale for CLI-served version-matched content: `/home/txchen/code/github/agent-browser/skills/agent-browser/SKILL.md:16-23`

Impact: the refresh should treat `camou skills` as a release-drift control mechanism, not just a docs rearrangement.

## Findings For Later Tickets

- `camou skills get core` should be the required first-load path for agents after the static stub.
- `camou skills get core --full` should own the complete command reference and templates.
- The static `skills/camou/SKILL.md` should stay small and durable: install fallback, how to load CLI-served content, shortest value proposition, and maybe a minimal "if you cannot run the CLI" emergency loop.
- Normal `core` should include stable high-value workflows: install/open/snapshot/ref loop, sessions/tabs/profiles/state distinction, project defaults, JSON output, network/HAR basics, debug/artifact basics, Node API split, and local-scope caveats.
- Specialized skill names should not be chosen from drift alone. The evidence supports a rich `core --full`; separate `network`, `debug`, `node`, or `migration` skills need a later load-cost decision.
