Status: resolved
Type: research
Blocked by: 02

# Decide Skill Content Packaging

## Question

Where should CLI-served skill content live in the source tree and npm package, and how should the build publish it?

Decide whether skill markdown should be embedded in TypeScript, copied as package data, generated into `dist/`, or loaded from a dedicated source directory. The answer should account for `package.json` `files`, ESM runtime compatibility, `npm run build`, local `npm run dev --`, global installs, and `npx camou`.

The plan should avoid Bun-specific behavior and should keep runtime reads compatible with published plain JavaScript from `dist/`.

## Answer

Resolved in [Skill Content Packaging](../research/03-skill-content-packaging.md).

Use Agent Browser's data-directory pattern:

- Keep `skills/` for external skill-install stubs. `skills/camou/SKILL.md` should become the short hidden bootstrap stub.
- Add `skill-data/` for CLI-served runtime skills. The initial runtime guide should be `skill-data/core/SKILL.md`, with optional `references/` and `templates/` included by `--full`.
- Add both `skills` and `skill-data` to `package.json` `files`.
- Read Markdown from package data directories at runtime with Node `fs` APIs.
- Do not embed large Markdown strings in TypeScript.
- Do not add a Markdown copy step into `dist` for the initial implementation; keep `npm run build` as plain `tsc`.

Runtime discovery should respect `CAMOU_SKILLS_DIR` first, then search package-root `skills` and `skill-data`. From both `src/cli/*.ts` and `dist/cli/*.js`, resolving two levels up from `import.meta.url` reaches the repo/package root, which works for local dev, built local runs, global installs, and `npx`.
