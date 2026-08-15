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

# ANR/crash dialogs are system windows that overlay the app, and Maestro's
# hierarchy then only contains the dialog — the sluggish software-rendered
# emulator ANRs the launcher easily, which failed every flow with
# "login-screen not visible".
adb shell settings put global hide_error_dialogs 1 || true

# The API server runs on the runner, not in the guest: localhost:3000 inside
# the emulator has to come back out to the host.
adb reverse tcp:3000 tcp:3000

adb install "$apk"
# The first launch pays JIT/dex warm-up, which stalls past the first flow's
# wait if it happens inside Maestro.
adb shell monkey -p com.flatcove.app -c android.intent.category.LAUNCHER 1 || true
sleep 15
adb shell am force-stop com.flatcove.app || true
# hide_error_dialogs only suppresses future dialogs; close any that appeared
# before it was set.
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1 || true

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
  echo "=== diagnostics: guest network ==="
  adb shell ping -c 2 -W 4 8.8.8.8 || true
  adb shell ping -c 2 -W 4 dns.google || true
  echo "=== diagnostics: UI hierarchy after fresh launch ==="
  adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1 || true
  adb shell monkey -p com.flatcove.app -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
  sleep 25
  adb shell uiautomator dump /sdcard/e2e-window.xml >/dev/null 2>&1 || true
  adb shell cat /sdcard/e2e-window.xml | head -c 12000 || true
  echo
fi
exit "$status"
