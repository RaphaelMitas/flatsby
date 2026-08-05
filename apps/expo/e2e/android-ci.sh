#!/usr/bin/env bash
# Runs inside android-emulator-runner's `script`, which executes every line as
# a separate `sh -c` — so all steps that need shared state live here, invoked
# as one line. Installs the APK, pre-warms the app, runs the requested flow
# areas, and dumps logcat into the results dir before the emulator dies with
# the step, pass or fail.
#
# Usage: android-ci.sh <apk-path> [flow-area ...]
set -uo pipefail

apk="${1:?apk path required}"
shift

adb install "$apk"
# The first launch pays JIT/dex warm-up, which stalls past the first flow's
# wait if it happens inside Maestro.
adb shell monkey -p com.flatcove.app -c android.intent.category.LAUNCHER 1 || true
sleep 15
adb shell am force-stop com.flatcove.app || true

cd "$(dirname "$0")/.."
node e2e/run-flows.mjs "$@"
status=$?
mkdir -p e2e/results/diagnostics
adb logcat -d > e2e/results/diagnostics/logcat.txt || true

# On failure, print the evidence into the job log itself — the results
# artifact is not always reachable from where the logs get read.
if [ "$status" -ne 0 ]; then
  echo "=== diagnostics: crash buffer ==="
  adb logcat -d -b crash | tail -n 120 || true
  echo "=== diagnostics: ReactNativeJS ==="
  adb logcat -d -s ReactNativeJS:* | tail -n 60 || true
  echo "=== diagnostics: UI hierarchy after fresh launch ==="
  adb shell monkey -p com.flatcove.app -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
  sleep 20
  adb shell uiautomator dump /sdcard/e2e-window.xml >/dev/null 2>&1 || true
  adb shell cat /sdcard/e2e-window.xml | head -c 6000 || true
  echo
fi
exit "$status"
