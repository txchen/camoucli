# AGENTS

- Purpose: Camoucli is a Node.js-first ESM CLI plus local daemon for driving Camoufox through Playwright, without depending on the Camoufox Python SDK.
- Runtime: target Node `>=20`; publish plain JavaScript from `dist/`; keep the runtime Node-compatible and avoid Bun-specific or Python-dependent behavior in core code.
- Main commands: `npm run build`, `npm test`, `npm run dev`, `npm run dev:daemon`.
- Entrypoints: `src/cli/main.ts` powers `camou`; `src/daemon/main.ts` powers `camou-daemon`.
- Architecture: the CLI should stay thin; the daemon owns browser lifecycle, sessions, tabs, refs, and persistent state. IPC is newline-delimited JSON with schemas in `src/ipc/protocol.ts`.
- Browser launch: use `playwright-core` on the Firefox path with `launchPersistentContext` and an installed Camoufox `executablePath` from the registry.
- Camoufox config: launch config is chunked into `CAMOU_CONFIG_N` env vars in `src/camoufox/env.ts`; installer and registry logic live in `src/camoufox/installer.ts` and `src/camoufox/registry.ts`.
- Storage: platform paths are centralized in `src/state/paths.ts`; browser binaries are stored in the shared Camoufox cache layout (`<platform cache>/camoufox/browsers/<repo>/<version>`) for compatibility with the Python lib; Camoucli keeps its own registry in `browserRegistryFile`; session data lives under `profiles/<session>/{user-data,downloads,artifacts}`.
- Snapshot model: `snapshot` creates per-tab `@eN` refs; refs are stored per tab and are cleared on navigation or a new snapshot.
- Current status: the scaffold, installer, daemon, session/tab manager, IPC, broader navigation/form commands, browser version switching, presets, structured JSON errors, doctor diagnostics, compatibility tooling, and first-class Node API wrappers are in place; unit and integration tests exist in `tests/`, and real Camoufox install/launch smoke tests have been exercised locally.
