# Sessions, Profiles, Tabs, And State

Use this when a task depends on login persistence, cleanup, isolation, or reusable auth.

## Terms

- Session: a named daemon/browser workspace selected by `--session`.
- Profile: the persistent browser user-data directory for a session.
- Tab: a named page binding inside a session selected by `--tabname`.
- Ref map: per-tab `@eN` refs created by the most recent snapshot.
- State snapshot: portable Playwright storage-state JSON saved by `camou state save`.
- Artifact tree: per-session files under `profiles/<session>/artifacts/`.

## Persistence

Session profile data persists on disk until removed. Reusing the same session name keeps cookies, localStorage, extension data, downloads, and artifacts.

Tabs do not isolate auth. Tabs inside the same session share the same browser context and profile data. Use a different session for isolation between accounts or users.

Refs are not persistent. They live only in daemon memory and are scoped to a tab's latest snapshot.

## Security

Profiles and state snapshots may contain credentials or session cookies. Do not print cookie values unless the user asked for them. Do not delete profiles unless the task is clearly cleanup. Prefer `profile inspect` before destructive operations.

## Cleanup

```bash
camou session stop work
camou close --all
camou daemon stop
camou daemon restart
camou daemon cleanup
camou profile remove work
camou state clear auth
camou state clear --all
```

Use `daemon restart` after upgrading the CLI if an older daemon is still running. Use `daemon cleanup` when orphan Camoufox processes are suspected.

## Project Defaults

Use project defaults when a repo should always use the same session and tab. Commit `.camou.json` only when those defaults are safe for collaborators.

```json
{
  "session": "project-name",
  "tabname": "main",
  "headless": true
}
```

Environment overrides are useful for private sessions:

```bash
export CAMOU_SESSION=personal-work
export CAMOU_TAB=main
```
