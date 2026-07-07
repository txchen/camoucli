---
name: node
description: Node.js automation with Camou. Use when writing scripts, tests, or reusable modules that import the `camou` package, choose between direct Playwright `Camoufox` and daemon-backed `CamouClient`, manage browser installs from Node, or avoid shelling out to the CLI repeatedly.
allowed-tools: Bash(camou:*), Bash(npx camou:*), Bash(node:*), Bash(npm:*)
---

# Camou Node

Use the Node API when a workflow needs loops, retries, test integration, reusable modules, or composition with other Node code.

Camou has two programmatic surfaces:

- `Camoufox`: direct Playwright `BrowserContext` and `Page` access.
- `CamouClient`: daemon-owned sessions, tabs, snapshot refs, state, network buffers, and artifacts.

## Choose The Surface

Use `Camoufox` when:

- you want standard Playwright locators and APIs
- you are writing a test or script that owns one browser context
- you do not need Camou snapshot refs or daemon state

Use `CamouClient` when:

- you want the same behavior as `camou open -> snapshot -> click @ref`
- you need named sessions/tabs across calls
- you need persistent daemon state, network buffers, HARs, traces, or artifacts
- you want to avoid spawning CLI commands repeatedly

## Direct Playwright With Camoufox

```ts
import { Camoufox } from 'camou';

await Camoufox.with(
  {
    session: 'script',
    headless: true,
    fingerprint: {
      locales: ['en-US'],
      screenProfile: 'desktop-fhd',
      blockImages: true,
    },
  },
  async (camou) => {
    const page = await camou.open('https://example.com');
    console.log(await page.title());
    await page.getByRole('link').first().click();
  },
);
```

`Camoufox` exposes:

- `Camoufox.launch()`
- `Camoufox.launchContext()`
- `Camoufox.resolveLaunch()`
- `Camoufox.with()`
- `launchCamoufox()`
- `launchCamoufoxContext()`
- `resolveCamoufoxLaunchSpec()`
- `withCamoufox()`

Install a browser first with `camou install` or the installer helpers.

## Daemon Workflow With CamouClient

```ts
import { CamouClient } from 'camou';

const camou = CamouClient.create({
  session: 'script',
  tabName: 'main',
  headless: true,
});

await camou.open('https://example.com');
const snapshot = await camou.snapshot({ interactive: true });
console.log(snapshot.elements);
await camou.click('@e1');
await camou.wait({ loadState: 'domcontentloaded' });
await camou.snapshot({ interactive: true });
await camou.close();
```

`CamouClient` covers navigation, snapshots, interactions, keyboard/mouse, read/get/is/find, sessions, tabs, cookies, storage, state, network, HAR, console, errors, screenshots, traces, diff, vitals, and init scripts.

Prefer canonical method names:

- `press()` instead of CLI alias `key`
- `scrollIntoView()` instead of CLI alias `scrollinto`
- `vitals()` instead of CLI alias `web-vitals`
- `open()` instead of CLI aliases `goto` or `navigate`

## Installer And Diagnostics From Node

```ts
import {
  doctorCamoufox,
  ensureBasePaths,
  getCamoucliPaths,
  getLogger,
  installCamoufox,
  listInstalledBrowsers,
  setCurrentBrowser,
} from 'camou';

const paths = getCamoucliPaths();
await ensureBasePaths(paths);

const logger = getLogger({ name: 'installer', verbose: true });
await installCamoufox(paths, { logger });

const installed = await listInstalledBrowsers(paths);
if (installed.currentVersion) {
  await setCurrentBrowser(paths, installed.currentVersion);
}

const report = await doctorCamoufox(paths, logger);
console.log(report);
```

Browser install and launch checks can be slow. Do not run them inside every test unless the test specifically verifies install behavior.

## Sessions In Scripts

Use explicit session names in scripts:

```ts
const camou = CamouClient.create({ session: 'my-test-run', tabName: 'main' });
```

Do not accidentally reuse a user's default profile for destructive tests. Use unique session names for CI or smoke tests and clean them up:

```ts
await camou.close();
```

For direct Playwright:

```ts
await Camoufox.with({ session: 'isolated-script' }, async (camou) => {
  // work here
});
```

## Error Handling

Camou APIs raise Camoucli error classes with structured codes. Catch errors at workflow boundaries and include the action context:

```ts
try {
  await camou.click('@e3');
} catch (error) {
  console.error('Failed while clicking Submit', error);
  throw error;
}
```

If a ref is unavailable, re-run `snapshot({ interactive: true })` and choose a current ref. Do not retry stale refs blindly.

## Rules

- Use `Camoufox` for direct Playwright.
- Use `CamouClient` for daemon-owned workflows and refs.
- Do not shell out repeatedly from Node when `CamouClient` can do the work.
- Use unique sessions for tests.
- Do not put passwords in source or shell history.
- Run `camou doctor --json` or `doctorCamoufox()` before guessing at launch failures.
