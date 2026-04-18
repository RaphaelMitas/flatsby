#!/bin/bash
# Set up ADB reverse proxy for Android development.
# Silently skips if ADB is not installed or no device is connected.

if ! command -v adb &>/dev/null; then
  exit 0
fi

devices=$(adb devices 2>/dev/null | grep -w "device$" | awk '{print $1}')

if [ -z "$devices" ]; then
  exit 0
fi

for device in $devices; do
  adb -s "$device" reverse tcp:3000 tcp:3000 2>/dev/null
done
