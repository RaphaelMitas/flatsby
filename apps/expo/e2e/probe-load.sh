#!/usr/bin/env bash
# Probe only (PR #676): quiet diagnosticd on the host and in the simulator,
# then sample load, free memory and the top CPU processes every 20s.
# Usage: probe-load.sh <udid> <diagnostics dir>
UDID=$1
DIAG=$2
mkdir -p "$DIAG"

quiet() {
  echo "== $(date -u +%T) $1"
  ps -Ao pid,pcpu,rss,command | grep -E "[d]iagnosticd|[l]og stream" | cut -c1-200
  sudo launchctl bootout system/com.apple.diagnosticd 2>&1 && echo "host bootout ok"
  xcrun simctl spawn "$UDID" launchctl bootout system/com.apple.diagnosticd 2>&1 && echo "sim bootout ok"
  sudo pkill -x diagnosticd && echo "pkill sent"
  sleep 5
  echo "-- after"
  ps -Ao pid,pcpu,rss,command | grep -E "[d]iagnosticd" | cut -c1-200
}

{
  date -u +"%T boot requested"
  quiet "before boot"
  xcrun simctl bootstatus "$UDID" > /dev/null 2>&1
  date -u +"%T boot complete"
  quiet "after boot"
} > "$DIAG/boot.log" 2>&1 &

while true; do
  echo "=== $(date -u +%T) load $(sysctl -n vm.loadavg) free $(vm_stat | awk '/Pages free/ {printf "%dMB", $3 * 16384 / 1048576}')"
  ps -Ao pcpu,rss,command -r | sed -n '2,9p' | cut -c1-160
  sleep 20
done > "$DIAG/load.log" 2>&1
