---
name: network-debug
description: Network, HAR, console, page-error, trace, screenshot, artifact, and debugging workflows in Camou. Use when investigating failed requests, mocking routes, capturing HAR files, checking console errors, collecting traces/screenshots, diagnosing flaky page behavior, or producing browser-side evidence.
allowed-tools: Bash(camou:*), Bash(npx camou:*), Bash(node:*), Bash(npm:*)
---

# Camou Network Debug

Use this skill when browser behavior needs evidence from requests, console logs, page errors, screenshots, traces, or artifacts.

## Lifetimes

These are daemon-owned runtime buffers:

- network routes
- request log
- HAR capture buffer
- console messages
- page errors
- active Playwright trace
- snapshot refs

They clear when the session stops or the daemon exits. They do not persist into profiles or storage-state files.

## Quick Triage

```bash
camou open https://example.com --session debug --tabname main --json
camou wait --load networkidle --session debug --tabname main --json
camou snapshot -i --session debug --tabname main --json
camou console --session debug --tabname main --json
camou errors --session debug --tabname main --json
camou network requests --session debug --tabname main --json
camou screenshot debug-page.png --session debug --tabname main --json
```

If the page changes, re-run `snapshot -i` before using refs.

## Request Inspection

```bash
camou network requests --session debug --tabname main --json
camou network requests --filter api --session debug --tabname main --json
camou network requests --method POST --status 500 --session debug --tabname main --json
camou network request net_1 --session debug --tabname main --json
camou network requests --clear --session debug --tabname main --json
```

Use `--clear` when you need a fresh buffer before reproducing an issue.

## Route Mocking

Abort requests:

```bash
camou network route '**/*.png' --abort --resource-type image --session debug --tabname main --json
```

Fulfill requests:

```bash
camou network route '**/api/mock' \
  --body '{"ok":true}' \
  --status 200 \
  --content-type application/json \
  --session debug \
  --tabname main \
  --json
```

Remove routes:

```bash
camou network unroute '**/api/mock' --session debug --tabname main --json
camou network unroute --session debug --tabname main --json
```

Routes are local Playwright context routes, not a system proxy.

## HAR Capture

```bash
camou network har start --session debug --tabname main --json
camou reload --session debug --tabname main --json
camou wait --load networkidle --session debug --tabname main --json
camou network har stop capture.har --session debug --tabname main --json
```

Relative HAR paths resolve under `profiles/<session>/artifacts/har/`.

## Console And Page Errors

```bash
camou console --session debug --tabname main --json
camou errors --session debug --tabname main --json
camou console --clear --session debug --tabname main --json
camou errors --clear --session debug --tabname main --json
```

Read before clearing if the output may be needed in a report.

## Screenshots, Highlight, Clipboard

```bash
camou screenshot page.png --session debug --tabname main --json
camou screenshot '#app' app.png --session debug --tabname main --json
camou screenshot page.jpg --format jpeg --quality 80 --session debug --tabname main --json
camou highlight @e1 --duration 1000 --session debug --tabname main --json
camou clipboard read --session debug --tabname main --json
camou clipboard write "debug text" --session debug --tabname main --json
```

Relative screenshot paths resolve under `profiles/<session>/artifacts/screenshots/`.

## Traces

```bash
camou trace start --screenshots --snapshots --sources --session debug --tabname main --json
# reproduce the behavior
camou trace stop trace.zip --session debug --tabname main --json
```

Traces are Playwright trace zip files, not CDP profiler traces.

## Diff And Vitals

```bash
camou diff snapshot --text "old snapshot" --interactive --path diff.json --session debug --tabname main --json
camou diff screenshot --baseline baseline.png --selector '#app' --path screenshot-diff.json --session debug --tabname main --json
camou diff url https://example.com/a https://example.com/b --mode snapshot --path url-diff.json --json
camou vitals --session debug --tabname main --json
camou web-vitals --session debug --tabname main --json
```

Screenshot diff is byte/header comparison, not perceptual visual diff.

## Debugging Playbook

1. Reproduce with a named session and tab.
2. Capture `snapshot -i`, screenshot, console, errors, and request log.
3. Clear buffers.
4. Start trace or HAR if the issue is interactive or network-heavy.
5. Reproduce once.
6. Stop trace/HAR.
7. Save relevant JSON outputs and artifact paths.
8. Stop or clean up the session if it is disposable.

## Cleanup

```bash
camou close --session debug --json
camou daemon restart
camou daemon cleanup
```

Use `daemon restart` after CLI upgrades. Use `daemon cleanup` when stale daemon or Camoufox processes remain.

## Caveats

- No video recording in Camou.
- No Chrome CDP profiler.
- No provider-side request capture.
- No persisted network log across daemon restarts.
- No response-body capture beyond what current request details expose.
- No PDF export until real Camoufox smoke coverage proves support.
