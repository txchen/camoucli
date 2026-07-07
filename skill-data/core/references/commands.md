# Camou Command Reference

Use this when `camou skills get core` is not detailed enough. Prefer `--json` for parsed output.

## Browser Management

```bash
camou install [version]
camou remove [version]
camou use <version>
camou versions
camou remote-versions
camou presets
camou fingerprint-profiles
camou version
camou path
camou doctor
```

`install`, `use`, and `doctor` run compatibility checks. `path` and `version` require an installed active browser.

## Shared Browser Flags

Most browser/session commands accept:

```bash
--session <name>
--tabname <name>
--headless
--headed
--browser <version>
--config <path>
--config-json <json>
--prefs <path>
--prefs-json <json>
--fingerprint <path>
--fingerprint-json <json>
--preset <name>
--proxy <url>
--proxy-bypass <hosts>
--headers <json>
--user-agent <ua>
--ignore-https-errors
--color-scheme dark|light|no-preference
--reduced-motion reduce|no-preference
--init-script <path>
--state <path-or-name>
--locale <locale>
--locales <locale>
--region <code>
--timezone <timezone>
--screen-profile <name>
--window-profile <name>
--block-images
--block-webrtc
--block-webgl
--disable-coop
--width <px>
--height <px>
--json
--verbose
```

Repeated/comma flags include `--preset`, `--locales`, `--init-script`, and network resource type filters.

## Navigation And Aliases

```bash
camou open [url]
camou goto <url>
camou navigate <url>
camou back
camou forward
camou reload
camou pushstate <url>
camou batch '["open"]' '["navigate","https://example.com"]'
```

`goto` and `navigate` are aliases for URL navigation through `open`. URL-less `open` starts or focuses the current session/tab.

### Pre-navigation Batch

```bash
camou batch \
  '["open"]' \
  '["network","route","*","--abort","--resource-type","script"]' \
  '["cookies","set","--curl","cookies.curl","--domain","localhost"]' \
  '["navigate","http://localhost:3000/target"]'
```

Each batch argument is a JSON array of normal `camou` command argv. Commands run sequentially and stop on the first failure. Batch-level shared browser flags such as `--session`, `--tabname`, `--headless`, and `--browser` apply to every child command unless that child command supplies its own flag.

Use URL-less `open` first when routes, cookies, state, or init scripts must be installed before the first real navigation.

## Snapshot And Refs

```bash
camou snapshot
camou snapshot -i
```

`-i` returns interactive elements only. Refs are per tab and are cleared by navigation or the next snapshot for that tab.

## Read, Get, Is, And Find

```bash
camou read [url]
camou read --raw
camou read --outline
camou read --filter <text>
camou get url
camou get title
camou get text <target>
camou get value <target>
camou get html <target>
camou get attr <target> <attribute>
camou get count <target>
camou get box <target>
camou get styles <target>
camou is visible <target>
camou is hidden <target>
camou is enabled <target>
camou is disabled <target>
camou is checked <target>
camou is editable <target>
camou find role <role> [--name <name>] [--exact] [--action click|fill|check|hover|text] [--value <value>]
camou find text <text> [--exact] [--action click|fill|check|hover|text] [--value <value>]
camou find label <text> [--exact] [--action click|fill|check|hover|text] [--value <value>]
camou find placeholder <text> [--exact] [--action click|fill|check|hover|text] [--value <value>]
camou find testid <id> [--action click|fill|check|hover|text] [--value <value>]
camou find selector <selector> [--action click|fill|check|hover|text] [--value <value>]
camou find nth <target> <index>
```

`target` can be a selector or a fresh `@eN` ref unless the command says otherwise.

## Interactions

```bash
camou click <target> [--new-tab] [--label <name>] [--timeout <ms>]
camou dblclick <target>
camou hover <target>
camou focus <target>
camou fill <target> <text>
camou type <target> <text> [--clear] [--delay <ms>]
camou check <target>
camou uncheck <target>
camou select <target> <value...>
camou upload <target> <files...>
camou drag <source> <target>
camou scrollintoview <target>
camou scrollinto <target>
```

`scrollinto` is a compatibility alias for `scrollintoview`.

## Keyboard And Mouse

```bash
camou press <key>
camou key <key>
camou keydown <key>
camou keyup <key>
camou keyboard type <text> [--delay <ms>]
camou keyboard inserttext <text>
camou mouse move <x> <y>
camou mouse down [button]
camou mouse up [button]
camou mouse wheel [deltaY] [deltaX]
camou scroll [direction] [amount] [--selector <target>]
```

`key` is a compatibility alias for `press`.

## Wait, Download, Screenshot

```bash
camou wait [target]
camou wait --text <text>
camou wait --load load|domcontentloaded|networkidle
camou wait --url <pattern>
camou wait --fn <javascript>
camou wait --download [--path <path>]
camou download <target> <path> [--timeout <ms>]
camou screenshot [targetOrPath] [path]
camou screenshot --selector <selector>
camou screenshot --full
camou screenshot --viewport
camou screenshot --format png|jpeg
camou screenshot --quality <number>
```

Use waits for page state rather than fixed sleeps.

## Sessions, Tabs, And Windows

```bash
camou session
camou session id [--scope worktree|cwd|git-root] [--prefix <prefix>]
camou session info
camou session list
camou session stop [name]
camou close [--session <name>] [--all]
camou quit [--session <name>] [--all]
camou exit [--session <name>] [--all]
camou tab [target]
camou tab list
camou tab new [url] [--label <name>]
camou tab close [target]
camou window new [url] [--label <name>]
```

`window new` tracks a top-level page but is not guaranteed to create a separate OS window.

## Profiles, Cookies, Storage, And State

```bash
camou profile list
camou profile inspect <name>
camou profile remove <name>
camou cookies
camou cookies get [url...]
camou cookies set [name] [value] [--url <url>] [--domain <domain>] [--path <path>] [--expires <seconds>] [--http-only] [--secure] [--same-site Strict|Lax|None]
camou cookies set --curl <file>
camou cookies clear
camou cookies export [path]
camou cookies import <path>
camou storage local get [key]
camou storage local set <key> <value>
camou storage local clear [key]
camou storage session get [key]
camou storage session set <key> <value>
camou storage session clear [key]
camou state save <path-or-name>
camou state load <path-or-name>
camou state list
camou state show <path-or-name>
camou state clear [path-or-name]
camou state clear --all
camou state clean
camou state rename <from> <to>
```

Profiles are full persistent browser data. State snapshots are portable Playwright storage-state JSON files.

## Runtime Settings, Frame, Dialog

```bash
camou set viewport <width> <height>
camou set geolocation <latitude> <longitude> [--accuracy <meters>]
camou set offline true|false
camou set headers <json>
camou set credentials <origin> <username> <password>
camou set media --color-scheme dark|light|no-preference --reduced-motion reduce|no-preference
camou frame <target>
camou dialog status
camou dialog accept [text]
camou dialog dismiss [text]
```

`frame` changes the active frame target for subsequent tab actions.

## Network And HAR

```bash
camou network route <url> --abort [--resource-type <type>]
camou network route <url> --body <body> [--status <code>] [--content-type <type>] [--resource-type <type>]
camou network unroute [url]
camou network requests [--clear] [--filter <text>] [--type <type>] [--resource-type <type>] [--method <method>] [--status <code>]
camou network request <requestId>
camou network har start
camou network har stop [path]
```

Routes, request logs, and HAR buffers live in daemon memory.

## Debug And Artifacts

```bash
camou console [--clear]
camou errors [--clear]
camou highlight <target> [--duration <ms>]
camou clipboard read
camou clipboard write <text>
camou clipboard copy
camou clipboard paste
camou trace start [--screenshots|--no-screenshots] [--snapshots|--no-snapshots] [--sources]
camou trace stop [path]
camou daemon stop
camou daemon restart
camou daemon cleanup
```

Relative artifact paths are resolved under the session artifact tree.

## Diff, Vitals, And Init Scripts

```bash
camou diff snapshot --baseline <path>
camou diff snapshot --text <text>
camou diff snapshot --interactive
camou diff snapshot --path <path>
camou diff screenshot --baseline <path> [--selector <target>] [--path <path>] [--full] [--viewport] [--format png|jpeg] [--quality <number>]
camou diff url <leftUrl> <rightUrl> [--mode snapshot|screenshot] [--path <path>] [--full] [--viewport] [--format png|jpeg] [--quality <number>]
camou vitals
camou web-vitals
camou addinitscript <js>
camou removeinitscript <id>
```

`web-vitals` is a compatibility alias for `vitals`.

## Skills

```bash
camou skills
camou skills list
camou skills get <name>
camou skills get <name> --full
camou skills get --all
camou skills path [name]
CAMOU_SKILLS_DIR=/path/to/skills camou skills list
```

`skills` does not start the daemon, check browser installs, or touch session/browser state.

## Node API Mapping

Use `Camoufox` for direct Playwright context/page access. Use `CamouClient` for daemon workflows. `CamouClient` covers command families such as open, snapshot, click/fill/type, sessions, tabs, cookies, storage, state, network, debug, screenshots, traces, and artifacts with canonical method names.

CLI-only aliases such as `key`, `scrollinto`, and `web-vitals` are not primary Node method names.

## Unsupported Or Out Of Scope

Camou intentionally does not implement Agent Browser cloud provider mode, Chrome CDP attach, Electron app automation, Slack-specific commands, auth vault, hosted dashboard, video recording, or PDF export. Unsupported migration flags produce structured compatibility errors.
