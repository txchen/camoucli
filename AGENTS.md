# AGENTS

- Purpose: Camoucli is a Node.js-first ESM CLI plus local daemon for driving Camoufox through Playwright, without depending on the Camoufox Python SDK.
- Runtime: target Node `>=20`; publish plain JavaScript from `dist/`; keep the runtime Node-compatible and avoid Bun-specific or Python-dependent behavior in core code.
- Main commands: `npm run build`, `npm test`, `npm run dev`, `npm run dev:daemon`.
- Entrypoints: `src/cli/main.ts` powers `camoucli`; `src/daemon/main.ts` powers `camoucli-daemon`.
- Architecture: the CLI should stay thin; the daemon owns browser lifecycle, sessions, tabs, refs, and persistent state. IPC is newline-delimited JSON with schemas in `src/ipc/protocol.ts`.
- Browser launch: use `playwright-core` on the Firefox path with `launchPersistentContext` and an installed Camoufox `executablePath` from the registry.
- Camoufox config: launch config is chunked into `CAMOU_CONFIG_N` env vars in `src/camoufox/env.ts`; installer and registry logic live in `src/camoufox/installer.ts` and `src/camoufox/registry.ts`.
- Storage: platform paths are centralized in `src/state/paths.ts`; browser installs are tracked in `browsers/registry.json`; session data lives under `profiles/<session>/{user-data,downloads,artifacts}`.
- Snapshot model: `snapshot` creates per-tab `@eN` refs; refs are stored per tab and are cleared on navigation or a new snapshot.
- Current status: the scaffold, installer, daemon, session/tab manager, IPC, and core CLI commands are in place; unit tests exist in `tests/`, but there is not yet a real Camoufox download-and-launch smoke test.
