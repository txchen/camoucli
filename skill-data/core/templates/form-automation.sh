#!/usr/bin/env bash
set -euo pipefail

SESSION="${SESSION:-camou-form}"
TAB="${TAB:-main}"
URL="${URL:-https://example.com/form}"

camou open "$URL" --session "$SESSION" --tabname "$TAB" --json
camou snapshot -i --session "$SESSION" --tabname "$TAB" --json

# Replace refs after inspecting the snapshot.
camou fill @e1 "user@example.com" --session "$SESSION" --tabname "$TAB" --json
camou fill @e2 "password123" --session "$SESSION" --tabname "$TAB" --json
camou click @e3 --session "$SESSION" --tabname "$TAB" --json

camou wait --load domcontentloaded --session "$SESSION" --tabname "$TAB" --json
camou snapshot -i --session "$SESSION" --tabname "$TAB" --json
