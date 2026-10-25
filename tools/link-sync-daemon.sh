#!/usr/bin/env bash
# 守护进程：确保双链自动改链监视器在运行（cron @reboot / 每 5 分钟调用）
# 需要可用的 node：优先 NODE_BIN，其次 PATH 里的 node
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${LINK_SYNC_LOG:-$HOME/.local/state/link-sync.log}"

NODE_BIN="${NODE_BIN:-}"
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(command -v node 2>/dev/null || true)"
fi
if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  echo "link-sync-daemon: 找不到 node，请设置 NODE_BIN" >&2
  exit 1
fi

# 以 link-sync.js 自己写的锁文件判断，避免 pgrep 误匹配到 shell/cmd 字符串
PIDFILE="/tmp/hexo-link-sync.pid"
if [ -f "$PIDFILE" ]; then
  pid="$(cat "$PIDFILE" 2>/dev/null || true)"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    exit 0
  fi
fi

mkdir -p "$(dirname "$LOG")"
nohup "$NODE_BIN" "$ROOT/tools/link-sync.js" --watch --quiet >>"$LOG" 2>&1 &
