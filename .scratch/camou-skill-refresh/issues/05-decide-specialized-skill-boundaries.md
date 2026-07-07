Status: resolved
Type: grilling
Blocked by: 04

# Decide Specialized Skill Boundaries

## Question

Should Camou ship only `core` skill content for now, or should 0.11.0 introduce specialized skill entries as part of the same refresh?

Evaluate likely candidates such as `node`, `migration`, `network`, `debug`, or `troubleshooting`. Decide which are in scope for the first refresh, which should remain sections inside `core --full`, and which should stay out of scope until there is enough repeated agent demand.

The answer should keep agent load cost in mind: the bootstrap stub should stay short, `core` should be sufficient for ordinary browser automation, and specialized content should exist only when it prevents bloating the common path.

## Answer

Ship only one visible runtime skill in the first refresh: `core`.

Do not add visible `node`, `migration`, `network`, `debug`, or `troubleshooting` skills for 0.11.0. Keep those as sections in normal `core` and/or reference files included by `camou skills get core --full`.

Rationale:

- Camou's domain is narrower than Agent Browser's specialized surfaces; it does not have separate Electron, Slack, Vercel Sandbox, AgentCore, MCP/dashboard, or provider workflows.
- The approved `core` model already covers ordinary network/debug/Node/migration guidance without bloating the installed stub.
- Adding specialized names now creates skill-selection overhead before there is evidence agents need separate loading paths.
- The chosen `camou skills` command contract already supports future specialized skills as data additions later.

Initial visible list:

```bash
camou skills list
# core
```

`skills/camou` remains a hidden external installer stub and is directly fetchable by name for debugging or compatibility.
