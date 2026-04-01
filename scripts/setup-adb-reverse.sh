#!/bin/bash
# Set up ADB reverse proxy for Android development.
# Silently skips if ADB is not installed or no device is connected.

if ! command -v adb &>/dev/null; then
  exit 0
fi

if ! adb devices 2>/dev/null | grep -q "device$"; then
  exit 0
fi

adb reverse tcp:3000 tcp:3000 2>/dev/null
