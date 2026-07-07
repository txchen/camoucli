#!/usr/bin/env bash
set -euo pipefail

SESSION="${SESSION:-camou-auth}"
TAB="${TAB:-main}"
LOGIN_URL="${LOGIN_URL:-https://app.example.com/login}"
DASHBOARD_URL="${DASHBOARD_URL:-https://app.example.com/dashboard}"

camou open "$LOGIN_URL" --session "$SESSION" --tabname "$TAB" --headed --json
camou snapshot -i --session "$SESSION" --tabname "$TAB" --json

# Complete login manually or fill/click refs here.
# Re-run snapshot after each navigation or meaningful DOM change.

camou open "$DASHBOARD_URL" --session "$SESSION" --tabname "$TAB" --json
camou snapshot -i --session "$SESSION" --tabname "$TAB" --json
camou state save auth --session "$SESSION" --json
