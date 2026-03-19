import type { WorkspaceFile } from "@/lib/workspace/model";

export function createRuntimeControlFiles(containerPort: number): WorkspaceFile[] {
  return [
    {
      path: ".appdesigner/runtime/container-entrypoint.sh",
      kind: "config",
      content: `#!/bin/sh
set -eu

RUNTIME_DIR="/workspace/.appdesigner/runtime"
mkdir -p "$RUNTIME_DIR"
touch "$RUNTIME_DIR/dev-server.log"

sh "$RUNTIME_DIR/start-dev-server.sh"

exec tail -n +1 -F "$RUNTIME_DIR/dev-server.log"
`,
    },
    {
      path: ".appdesigner/runtime/start-dev-server.sh",
      kind: "config",
      content: `#!/bin/sh
set -eu

RUNTIME_DIR="/workspace/.appdesigner/runtime"
PID_FILE="$RUNTIME_DIR/dev-server.pid"
LOG_FILE="$RUNTIME_DIR/dev-server.log"

mkdir -p "$RUNTIME_DIR"
touch "$LOG_FILE"

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    exit 0
  fi
fi

printf '\\n[appdesigner] starting dev server on port %s (%s)\\n' "\${PORT:-${containerPort}}" "$(date -Iseconds)" >> "$LOG_FILE"
cd /workspace
npm run dev -- --host 0.0.0.0 --port "\${PORT:-${containerPort}}" >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
`,
    },
    {
      path: ".appdesigner/runtime/stop-dev-server.sh",
      kind: "config",
      content: `#!/bin/sh
set -eu

RUNTIME_DIR="/workspace/.appdesigner/runtime"
PID_FILE="$RUNTIME_DIR/dev-server.pid"

if [ ! -f "$PID_FILE" ]; then
  exit 0
fi

PID="$(cat "$PID_FILE" 2>/dev/null || true)"
if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
  kill "$PID" 2>/dev/null || true

  ATTEMPTS=0
  while kill -0 "$PID" 2>/dev/null; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ "$ATTEMPTS" -ge 20 ]; then
      kill -9 "$PID" 2>/dev/null || true
      break
    fi
    sleep 0.25
  done
fi

rm -f "$PID_FILE"
`,
    },
    {
      path: ".appdesigner/runtime/restart-dev-server.sh",
      kind: "config",
      content: `#!/bin/sh
set -eu

RUNTIME_DIR="/workspace/.appdesigner/runtime"
sh "$RUNTIME_DIR/stop-dev-server.sh"
sh "$RUNTIME_DIR/start-dev-server.sh"
`,
    },
    {
      path: ".appdesigner/runtime/dev-server-status.sh",
      kind: "config",
      content: `#!/bin/sh
set -eu

PID_FILE="/workspace/.appdesigner/runtime/dev-server.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "stopped"
  exit 0
fi

PID="$(cat "$PID_FILE" 2>/dev/null || true)"
if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
  echo "running"
  exit 0
fi

echo "stopped"
exit 0
`,
    },
  ];
}
