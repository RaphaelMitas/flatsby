#!/usr/bin/env bash
# Builds the e2e app from scratch.
#
#   build-native.sh ios <out-dir>              -> <out-dir>/Flatsby.app
#   build-native.sh android <out-dir> <abi>    -> <out-dir>/app-release.apk and
#                                                 <out-dir>/bundle-res, which
#                                                 repack.sh compares against
set -euo pipefail

platform=${1:?usage: build-native.sh ios|android <out-dir> [abi]}
mkdir -p "${2:?out-dir required}"
out=$(cd "$2" && pwd)
cd "$(dirname "$0")/.."
export E2E_TESTING=true

# --clean: a native folder left over from a dev build would otherwise end up
# in a cache that every worktree shares.
pnpm expo prebuild --platform "$platform" --no-install --clean

if [ "$platform" = ios ]; then
  (cd ios && LANG=en_US.UTF-8 pod install)
  pretty=cat
  command -v xcbeautify >/dev/null && pretty=xcbeautify
  # CODE_SIGNING_ALLOWED=NO would be the obvious flag but strips keychain
  # entitlements, crashing secure-store.
  (cd ios && xcodebuild -workspace Flatsby.xcworkspace -scheme Flatsby \
    -configuration Release -sdk iphonesimulator \
    -derivedDataPath build CODE_SIGN_IDENTITY=- \
    ARCHS=arm64 ONLY_ACTIVE_ARCH=YES build | $pretty)
  rm -rf "$out/Flatsby.app"
  mv ios/build/Build/Products/Release-iphonesimulator/Flatsby.app "$out/"
  exit 0
fi

abi=${3:?abi required for android, e.g. x86_64 or arm64-v8a}
# The template's 512m Metaspace cap OOMs the daemon mid-build; a later
# duplicate key in gradle.properties wins, so appending overrides it.
printf '\norg.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g\n' >>android/gradle.properties
# One ABI halves native compile; lintVital adds nothing to an e2e APK and is
# the heaviest Metaspace consumer.
(cd android && ./gradlew assembleRelease -PreactNativeArchitectures="$abi" --no-daemon \
  -x lintVitalRelease -x lintVitalAnalyzeRelease -x lintVitalReportRelease)
cp android/app/build/outputs/apk/release/app-release.apk "$out/"
rm -rf "$out/bundle-res"
cp -R android/app/build/generated/res/react/release "$out/bundle-res"
