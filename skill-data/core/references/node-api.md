# Node API

Use Node APIs when the user wants reusable automation code, tests, loops, retries, or integration with other Node modules.

## Camoufox

`Camoufox` launches Camoufox directly and gives real Playwright objects.

```ts
import { Camoufox } from 'camou';

const camou = await Camoufox.launch({
  session: 'script',
  headless: true,
  fingerprint: {
    locales: ['en-US'],
    screenProfile: 'desktop-fhd',
  },
});

const page = await camou.open('https://example.com');
console.log(await page.title());
await camou.close();
```

Use this surface when direct Playwright `BrowserContext` or `Page` control is the simplest fit.

## CamouClient

`CamouClient` talks to the daemon and preserves CLI-style concepts: sessions, tabs, refs, storage state, network buffers, and artifacts.

```ts
import { CamouClient } from 'camou';

const camou = CamouClient.create({
  session: 'script',
  tabName: 'main',
  headless: true,
});

await camou.open('https://example.com');
const snapshot = await camou.snapshot({ interactive: true });
await camou.click('@e1');
await camou.close();
```

Use this surface when the workflow should match `camou open -> snapshot -> click @ref`.

## Method Families

`CamouClient` covers:

- navigation and snapshots
- click/fill/type/check/select/scroll/upload/drag
- keyboard and mouse input
- get/is/find/read/eval
- sessions, tabs, profiles, cookies, storage, and state
- network routes, requests, and HAR
- console, errors, screenshots, traces, diff, vitals, and init scripts
- daemon lifecycle helpers where relevant

Prefer canonical method names in Node. CLI aliases such as `key`, `scrollinto`, and `web-vitals` are compatibility conveniences, not primary Node names.

## Result And Error Shape

Daemon-backed methods return structured result payloads that match the IPC action families. Camoucli error classes preserve codes such as validation failures and unsupported migration commands. Catch errors at workflow boundaries and include the command/action context in user-facing reports.

## Installer Helpers

Use installer and registry helpers from Node when scripts need to prepare the machine:

```ts
import { doctorCamoufox, getCamoucliPaths, installCamoufox, listInstalledBrowsers, setCurrentBrowser } from 'camou';

const paths = getCamoucliPaths();
await installCamoufox(paths, {});
const browsers = await listInstalledBrowsers(paths);
await setCurrentBrowser(paths, browsers.currentVersion ?? '');
const report = await doctorCamoufox(paths);
```

Run these sparingly in tests because browser install and launch checks can be slow.
