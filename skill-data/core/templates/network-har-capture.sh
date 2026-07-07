#!/usr/bin/env bash
set -euo pipefail

SESSION="${SESSION:-camou-network}"
TAB="${TAB:-main}"
URL="${URL:-https://example.com}"
HAR_PATH="${HAR_PATH:-capture.har}"

camou network har start --session "$SESSION" --tabname "$TAB" --json
camou open "$URL" --session "$SESSION" --tabname "$TAB" --json
camou wait --load networkidle --session "$SESSION" --tabname "$TAB" --json
camou network requests --session "$SESSION" --tabname "$TAB" --json
camou network har stop "$HAR_PATH" --session "$SESSION" --tabname "$TAB" --json
