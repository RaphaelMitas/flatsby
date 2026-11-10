#!/usr/bin/env bash
# Prints the name an e2e build's native part is cached under.
# The fingerprint hashes the evaluated config, not app.config.ts or patches/,
# so those go into the key too, with the build script itself.
set -euo pipefail

platform=${1:?usage: native-key.sh ios|android}
cd "$(dirname "$0")/../../.."
export E2E_TESTING=true

inputs=(apps/expo/app.config.ts apps/expo/e2e/build-native.sh patches)
[ "$platform" = android ] && inputs+=(tooling/github/android-sdk)
files=$(find "${inputs[@]}" -type f -print0 | sort -z | xargs -0 shasum | shasum | cut -c1-40)

fingerprint=$(cd apps/expo && pnpm exec fingerprint fingerprint:generate --platform "$platform" |
  node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0, "utf8")).hash)')
toolchain=""
[ "$platform" = ios ] && toolchain=$(xcodebuild -version | tail -1)

echo "e2e-native-$platform-$(echo "$fingerprint $files $toolchain" | shasum | cut -c1-16)"
