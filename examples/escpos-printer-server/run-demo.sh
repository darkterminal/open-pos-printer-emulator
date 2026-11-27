#!/usr/bin/env bash
set -euo pipefail

# End-to-end demo: ESC/POS Printer Server -> Open POS Printer Emulator
#
# This script does NOT start services automatically (to avoid hidden side effects).
# It checks prerequisites, sends a sample job, and prints verification hints.
#
# Usage:
#   ./examples/escpos-printer-server/run-demo.sh
#   EPS_WS_URL=ws://127.0.0.1:1945 ./examples/escpos-printer-server/run-demo.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXAMPLE_DIR="$ROOT_DIR/examples/escpos-printer-server"
EPS_WS_URL="${EPS_WS_URL:-ws://127.0.0.1:1945}"
EMULATOR_JOBS_URL="${EMULATOR_JOBS_URL:-http://localhost:8080/jobs}"
EMULATOR_TCP_HOST="${EMULATOR_TCP_HOST:-127.0.0.1}"
EMULATOR_TCP_PORT="${EMULATOR_TCP_PORT:-9100}"

echo "== Open POS Printer Emulator E2E Demo =="
echo "Repo: $ROOT_DIR"
echo "EPS WS: $EPS_WS_URL"
echo "Emulator jobs: $EMULATOR_JOBS_URL"
echo "Emulator TCP: ${EMULATOR_TCP_HOST}:${EMULATOR_TCP_PORT}"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is required (Node 21+ recommended for global WebSocket)." >&2
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 21 ]; then
  echo "WARN: Node $(node -v) detected. Global WebSocket may be unavailable; Node 21+ recommended." >&2
fi

echo "Checking emulator web UI..."
if command -v curl >/dev/null 2>&1; then
  if curl -fsS -o /dev/null "$EMULATOR_JOBS_URL" || curl -fsS -o /dev/null "http://localhost:8080/login"; then
    echo "  OK: emulator web reachable"
  else
    echo "  WARN: emulator web not reachable at localhost:8080. Start it with: make up"
  fi
fi

echo "Checking emulator TCP listener..."
if command -v nc >/dev/null 2>&1; then
  if nc -z "$EMULATOR_TCP_HOST" "$EMULATOR_TCP_PORT" >/dev/null 2>&1; then
    echo "  OK: TCP listener reachable"
  else
    echo "  WARN: TCP listener not reachable at ${EMULATOR_TCP_HOST}:${EMULATOR_TCP_PORT}. Start emulator/sidecar."
  fi
fi

echo
echo "Sending sample job through ESC/POS Printer Server..."
node "$EXAMPLE_DIR/send-job.mjs" "$EPS_WS_URL" "$EXAMPLE_DIR/sample-receipt.json"

echo
echo "Done. Verify in emulator:"
echo "  1. Open $EMULATOR_JOBS_URL"
echo "  2. Check newest job preview, warnings, command inspector, raw data"
