# Network, Debug, And Artifacts

Use this for request inspection, request mocking, HAR capture, console/error diagnosis, screenshots, traces, and artifact paths.

## Lifetimes

These are daemon-owned in-memory buffers:

- network routes
- request logs
- HAR capture buffers
- console messages
- uncaught page errors
- active Playwright traces
- current ref maps

They clear when the session stops or the daemon exits. They are not stored in profiles or Playwright storage-state files.

## Network

```bash
camou network route '**/api/mock' --body '{"ok":true}' --content-type application/json
camou network route '**/*.png' --abort --resource-type image
camou network requests --filter api --json
camou network request net_1 --json
camou network unroute '**/api/mock'
```

Use `--resource-type` to narrow broad glob routes. Use `network requests --clear` when a workflow needs a fresh buffer after reading.

## HAR

```bash
camou network har start
camou reload
camou network har stop capture.har
```

Relative HAR paths resolve under `profiles/<session>/artifacts/har/`.

## Console And Errors

```bash
camou console --json
camou console --clear
camou errors --json
camou errors --clear
```

Read before clearing if the output is needed for a bug report.

## Screenshots, Traces, And Diff

```bash
camou screenshot page.png
camou screenshot '#app' app.png
camou trace start --screenshots --sources
camou trace stop trace.zip
camou diff screenshot --baseline baseline.png --selector '#app' --path diff.json
```

Relative paths resolve under family directories in `profiles/<session>/artifacts/`: screenshots, traces, HARs, and diff outputs.

## Caveats

Network mocking uses Playwright routing in the local browser context, not a system proxy. HAR capture is portable JSON but not a full browser replay system. Console and page errors only include events observed while the daemon page was running.
