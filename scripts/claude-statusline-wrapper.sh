#!/bin/sh
# Mimiron Claude Code statusline wrapper.
# No Node dependency: Claude Code may not have `node` on PATH when launched as
# an app. This captures the raw statusLine JSON payload for Mimiron, then
# forwards it to the user's previous statusline command when one exists.

STATE_DIR="${AGENT_DASHBOARD_DIR:-$HOME/.agent-dashboard}"
RAW_FILE="$STATE_DIR/claude-statusline-latest.json"
CONFIG_FILE="$STATE_DIR/claude-statusline-wrapper.json"
TMP_FILE="$STATE_DIR/claude-statusline-latest.$$"

mkdir -p "$STATE_DIR" 2>/dev/null
cat > "$TMP_FILE"
mv "$TMP_FILE" "$RAW_FILE" 2>/dev/null

NEXT_COMMAND=""
if [ -f "$CONFIG_FILE" ]; then
  NEXT_COMMAND=$(
    python3 - "$CONFIG_FILE" 2>/dev/null <<'PY'
import json, sys
try:
    with open(sys.argv[1]) as f:
        value = json.load(f).get("nextCommand")
    if isinstance(value, str):
        print(value)
except Exception:
    pass
PY
  )
fi

if [ -n "$NEXT_COMMAND" ]; then
  sh -c "$NEXT_COMMAND" < "$RAW_FILE"
else
  echo "claude"
fi
