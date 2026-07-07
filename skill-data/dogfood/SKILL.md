---
name: dogfood
description: Systematic web app QA and exploratory testing with Camou. Use when the user asks to dogfood, QA, exploratory test, bug hunt, test a site, review app quality, verify a workflow, or produce reproducible issue reports with screenshots, traces, console errors, network evidence, and step-by-step repros.
allowed-tools: Bash(camou:*), Bash(npx camou:*), Bash(node:*), Bash(npm:*)
---

# Camou Dogfood

Use this skill to test a web application as a user and produce actionable, reproducible findings.

Camou does not support Agent Browser video recording or annotated screenshots. Use Camou's supported evidence instead: normal screenshots, Playwright traces, console/page-error buffers, network request logs, HAR files, snapshots, and written repro steps.

## Inputs

Only the target URL is required.

Defaults:

- Session: slugified host, such as `localhost-3000` or `app-example-com`
- Tab: `main`
- Output directory: `./dogfood-output/`
- Scope: full app unless the user gives a focus area
- Auth: none unless the user provides credentials or asks to log in

If the user says "dogfood http://localhost:3000", start with defaults. Ask only when authentication is required and credentials or OTP are missing.

## Setup

```bash
mkdir -p dogfood-output/screenshots dogfood-output/traces dogfood-output/har dogfood-output/network
cp "$(camou skills path dogfood)/templates/dogfood-report-template.md" dogfood-output/report.md
camou open {TARGET_URL} --session {SESSION} --tabname main --json
camou wait --load networkidle --session {SESSION} --tabname main --json
camou snapshot -i --session {SESSION} --tabname main --json
camou screenshot dogfood-output/screenshots/initial.png --session {SESSION} --tabname main --json
```

If login is needed, use the latest refs:

```bash
camou fill @e1 "{EMAIL}" --session {SESSION} --tabname main --json
camou fill @e2 "{PASSWORD}" --session {SESSION} --tabname main --json
camou click @e3 --session {SESSION} --tabname main --json
camou wait --load networkidle --session {SESSION} --tabname main --json
camou state save dogfood-auth --session {SESSION} --json
```

For OTP or email codes, ask the user and wait for the code before continuing.

## Exploration Loop

At the start of the session, read `references/issue-taxonomy.md`.

For each page or feature:

```bash
camou snapshot -i --session {SESSION} --tabname main --json
camou screenshot dogfood-output/screenshots/{page-name}.png --session {SESSION} --tabname main --json
camou console --session {SESSION} --tabname main --json
camou errors --session {SESSION} --tabname main --json
camou network requests --session {SESSION} --tabname main --json
```

Explore like a real user:

- Visit top-level navigation items.
- Test core create/edit/delete/search/filter/export workflows.
- Try empty states, invalid inputs, boundary values, and cancel paths.
- Check loading and error feedback.
- Check keyboard focus for forms and modals.
- Test at different viewport sizes when responsive layout matters:

```bash
camou set viewport 390 844 --session {SESSION} --tabname main --json
camou screenshot dogfood-output/screenshots/mobile-{page-name}.png --session {SESSION} --tabname main --json
camou set viewport 1440 900 --session {SESSION} --tabname main --json
```

## Document Issues Immediately

When you find an issue, stop exploring and document it before moving on.

For static issues visible on load, capture:

```bash
camou get url --session {SESSION} --tabname main --json
camou screenshot dogfood-output/screenshots/issue-001-result.png --session {SESSION} --tabname main --json
camou console --session {SESSION} --tabname main --json
camou errors --session {SESSION} --tabname main --json
```

For interactive issues, capture a trace and step screenshots:

```bash
camou trace start --screenshots --sources --session {SESSION} --tabname main --json
camou screenshot dogfood-output/screenshots/issue-001-step-1.png --session {SESSION} --tabname main --json
# perform action with click, type, fill, press, upload, drag, or wait
camou screenshot dogfood-output/screenshots/issue-001-step-2.png --session {SESSION} --tabname main --json
# continue until the broken state is visible
camou screenshot dogfood-output/screenshots/issue-001-result.png --session {SESSION} --tabname main --json
camou trace stop dogfood-output/traces/issue-001.zip --session {SESSION} --tabname main --json
```

For network issues, capture request evidence:

```bash
camou network requests --filter api --session {SESSION} --tabname main --json > dogfood-output/network/issue-001-requests.json
camou network har start --session {SESSION} --tabname main --json
# reproduce the request problem
camou network har stop dogfood-output/har/issue-001.har --session {SESSION} --tabname main --json
```

Append an `ISSUE-NNN` block to the report immediately. Include:

- severity and category
- URL
- expected behavior
- actual behavior
- exact repro steps
- screenshot paths
- trace/HAR/network paths when relevant
- console or page error snippets when relevant

## Rules

- Do not read the target app source code. Test from the browser as a user.
- Do not batch findings for later; write each issue as soon as you find it.
- Verify reproducibility before spending time on evidence.
- Use `type` instead of `fill` in traces when human typing behavior matters.
- Re-run `snapshot -i` after every navigation or major DOM change.
- Use `console`, `errors`, and `network requests` throughout the session.
- Do not claim video evidence exists; Camou does not support video recording.
- Prefer 5 to 10 well-documented issues over many vague notes.

## Wrap Up

Before finishing:

```bash
camou console --session {SESSION} --tabname main --json
camou errors --session {SESSION} --tabname main --json
camou session info --session {SESSION} --json
```

Update summary counts in `report.md`, then summarize the total issues, severity breakdown, and top risks for the user.

## References

Read `references/issue-taxonomy.md` at the start of a dogfood session.

## Templates

Copy `templates/dogfood-report-template.md` to the output directory before exploring.
