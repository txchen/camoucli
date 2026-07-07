# Dogfood Issue Taxonomy

Use this checklist to calibrate exploratory testing.

## Severity

| Severity | Definition |
| --- | --- |
| critical | Blocks a core workflow, causes data loss, exposes sensitive data, or crashes the app |
| high | Major feature broken or unusable with no reasonable workaround |
| medium | Feature works with noticeable problems or a workaround |
| low | Minor polish, copy, layout, or consistency issue |

## Categories

### Visual / UI

- broken layout or overlapping elements
- clipped or overflowing text
- inconsistent spacing, padding, or alignment
- broken icons or images
- z-index problems
- responsive layout failures
- dark/light rendering issues
- janky animation or large layout shifts

### Functional

- broken links or wrong redirects
- buttons that do nothing
- forms accepting invalid input or rejecting valid input
- missing save, cancel, undo, or confirmation behavior
- search, filter, sort, pagination, upload, or download failures
- state lost after navigation or refresh
- race conditions, double-submit bugs, or stale data

### UX

- unclear navigation
- no loading state or completion feedback
- unclear errors
- dead ends
- inconsistent interaction patterns
- missing empty states
- destructive actions without confirmation
- poor focus management

### Content

- typos
- placeholder or lorem ipsum content
- outdated or contradictory copy
- missing labels
- inconsistent terminology
- truncated text without a way to inspect it

### Performance

- slow page loads
- excessive or repeated network requests
- large assets
- janky scrolling
- interactions delayed enough to feel broken

### Console / Network

- JavaScript exceptions
- unhandled promise rejections
- failed 4xx/5xx requests
- CORS or mixed-content errors
- noisy warnings that correlate with broken behavior

### Accessibility

- unlabeled inputs
- missing alt text
- keyboard traps
- controls unreachable by keyboard
- focus not visible
- modal focus escaping
- poor semantic roles in snapshot output

## Per-Page Checklist

1. Capture a screenshot and interactive snapshot.
2. Test primary buttons, links, dropdowns, and menus.
3. Fill forms with valid, empty, invalid, and long values.
4. Check navigation and back/forward behavior.
5. Check empty, loading, error, and overflow states.
6. Inspect console and page errors.
7. Inspect network requests for failed or excessive calls.
8. Test a mobile viewport if responsive behavior matters.
9. Verify auth boundaries if the app has roles or login state.
