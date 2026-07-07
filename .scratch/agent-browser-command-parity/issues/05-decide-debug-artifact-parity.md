Status: resolved
Type: research
Blocked by: 01, 02

# Decide Debug Artifact Parity

## Question

Which `agent-browser` debugging and artifact commands should Camoucli implement, and which are impractical or misleading on Camoufox Firefox?

Cover `console`, `errors`, `highlight`, `clipboard`, `trace`, `profiler`, `record`, `diff`, `inspect`, `vitals`/`web-vitals`, `pushstate`, `addinitscript`/`removeinitscript`, and screenshot/PDF/video artifact behavior.

## Answer

Camoucli should adopt the portable Playwright/Camoufox debugging and artifact commands: `console [--clear]`, `errors [--clear]`, `highlight <target>`, `clipboard read|write|copy|paste`, `trace start|stop [path]`, expanded screenshots, `diff snapshot|screenshot|url`, framework-agnostic `vitals|web-vitals [url] [--json]`, `pushstate <url>`, and `addinitscript <js>` with a limited `removeinitscript <id>` contract.

The key boundary is not to copy Chromium/CDP debug surfaces as if they are portable. `profiler` and DevTools-style `inspect` should be excluded or return explicit unsupported errors. Mid-session `record start|stop|restart` should be deferred in favor of launch-time Playwright video later. `pdf <path>` should only be accepted after a real Camoufox smoke test confirms Playwright support.

Artifact writes should remain daemon-owned and default under the active session's artifacts directory. Detailed command semantics, implementation shape, and test guidance are in [Debug Artifact Parity Decision](../research/05-debug-artifact-parity.md).
