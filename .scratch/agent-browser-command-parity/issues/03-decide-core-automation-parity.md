Status: resolved
Type: research
Blocked by: 01, 02

# Decide Core Automation Parity

## Question

Which missing or partial `agent-browser` core automation commands should Camoucli implement first, and what should their Camoucli semantics be?

Cover navigation/read aliases, open-without-url behavior, `dblclick`, `focus`, `drag`, `upload`, `download`, keyboard `key`/`keydown`/`keyup`/`keyboard`, richer `wait` variants, screenshot options, `pdf`, `get` expansions, `is`, `find`, `mouse`, `set`, `window`, `frame`, and `dialog`.

## Answer

Core automation parity should be implemented in two slices. The first slice should take the direct Playwright-native commands: `goto`/`navigate`/`key`/`scrollinto` aliases, URL normalization, `eval --stdin`/base64, `dblclick`, `focus`, `type --clear --delay`, multi-value `select`, `keydown`/`keyup`/`keyboard`, `mouse`, selector/default `scroll`, `upload`, `drag`, richer non-download `wait`, selector/format screenshot options, expanded `get` excluding `cdp-url`, `is`, and semantic `find`.

Accepted but later core slices are `open` without URL, `download`/`wait --download`, runtime `set`, `frame`, `dialog`, and local-DOM `read`, because each needs explicit daemon state or lifetime semantics. Defer `click --new-tab` and `window new` to session/tab launch parity, and defer `pdf` plus screenshot annotation/global artifact controls to debug/artifact parity. Exclude `get cdp-url` under the previously agreed CDP/provider boundary.

Detailed semantics and implementation notes are in [Core Automation Parity Decision](../research/03-core-automation-parity.md).
