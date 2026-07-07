Status: done
Type: task

# Core Aliases And Eval Input Modes

## Parent

.scratch/agent-browser-command-parity/PRD.md

## What to build

Add the first local browser automation parity tracer bullet: compatible navigation aliases, URL normalization, simple command aliases, and CLI-only eval input modes. The completed slice should let users navigate with `open`, `goto`, or `navigate`, press keys through both canonical and alias spellings, scroll refs into view through both canonical and alias spellings, and pass eval scripts through literal, base64, or stdin input while preserving the existing daemon-owned browser workflow.

This slice should stay low-state. It should not add URL-less `open`, active tabs, new daemon runtime state, or broad command-family rewrites.

## Acceptance criteria

- [x] `goto <url>` and `navigate <url>` navigate the current tab using the same daemon path as existing navigation and require a URL.
- [x] `open`, `goto`, and `navigate` normalize bare domains/hosts to HTTPS while preserving supported explicit schemes.
- [x] Existing `open <url>` behavior remains compatible for current Camoucli users.
- [x] `key <key>` behaves as an alias for the existing press behavior.
- [x] `scrollinto <target>` behaves as an alias for the existing scroll-into-view behavior.
- [x] `eval` supports literal expressions, base64-decoded scripts, and stdin scripts, with invalid base64 rejected before contacting the daemon.
- [x] The slice includes typed request validation where needed, output behavior, help text, README or command-parity documentation updates, and focused parser/defaults tests.
- [x] `npm run build` and `npm test` pass.

## Blocked by

None - can start immediately
