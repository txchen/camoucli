Status: resolved
Type: research
Blocked by: 01, 02, 03, 04, 05, 06

# Plan Skill Refresh Implementation Slices

## Question

How should the accepted skill refresh be split into independently implementable work?

Produce vertical implementation tickets that cover CLI parsing, content storage/loading, package/build changes, static skill stub rewrite, tests, docs, and release verification. Include dependencies, acceptance criteria, and the minimum verification commands for each slice.

The plan should be ready for `/implement` without requiring another broad design pass.

## Answer

Resolved in [Skill Refresh Implementation Slices](../research/07-implementation-slices.md).

Implement the refresh in five vertical slices:

1. Add the no-daemon `camou skills` CLI runtime.
2. Add packaged skill data and rewrite the installed stub.
3. Author the normal `core` runtime guide.
4. Add `core --full` references/templates.
5. Update README/changelog and package verification.

Each slice has file scope, acceptance criteria, dependencies, and verification commands in the linked plan. The sequence keeps the CLI behavior testable before content gets large, then layers in runtime content, full references/templates, and public docs.

The plan is ready for `/implement`; no broad design pass remains.
