#!/usr/bin/env bash
# Installs the e2e app on a booted simulator or emulator and pre-warms it.
#
#   prepare-device.sh ios <udid> <Flatsby.app>
#   prepare-device.sh android <serial> <app-release.apk>
set -euo pipefail

platform=${1:?usage: prepare-device.sh ios|android <device> <app>}
device=${2:?device required}
app=${3:?app required}

if [ "$platform" = ios ]; then
  xcrun simctl bootstatus "$device" >/dev/null
  xcrun simctl spawn "$device" defaults write com.apple.Accessibility ReduceMotionEnabled 1
  xcrun simctl install "$device" "$app"
  # The first launch pays dyld/springboard warm-up, which stalls past the
  # first flow's wait if it happens inside Maestro.
  xcrun simctl launch "$device" com.flatcove.app.v2 || true
  sleep 15
  xcrun simctl terminate "$device" com.flatcove.app.v2 || true
  exit 0
fi

shell() { adb -s "$device" shell "$@"; }
# ANR/crash dialogs are system windows that overlay the app, and Maestro's
# hierarchy then only contains the dialog: a sluggish emulator ANRs the
# launcher easily, which failed every flow with "login-screen not visible".
shell settings put global hide_error_dialogs 1 || true
for scale in window_animation_scale transition_animation_scale animator_duration_scale; do
  shell settings put global "$scale" 0 || true
done
adb -s "$device" install -r "$app"
shell monkey -p com.flatcove.app -c android.intent.category.LAUNCHER 1 || true
sleep 15
shell am force-stop com.flatcove.app || true
# hide_error_dialogs only suppresses future dialogs; close any that appeared
# before it was set.
shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1 || true
