#!/usr/bin/env bash
# Swaps this checkout's JS into a cached e2e build, bundled exactly the way the
# Xcode and Gradle bundle steps do it, so a PR that changes no native code
# skips the native build.
#
#   repack.sh ios <Flatsby.app>
#   repack.sh android <app-release.apk> <res dir the cached build bundled>
#
# Exits non-zero when the cached build can't take the new bundle; the caller
# then builds from scratch.
set -euo pipefail

absolute() { echo "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; }

platform=$1
target=$(absolute "$2")
[ "$platform" = android ] && cached_res=$(absolute "$3")
cd "$(dirname "$0")/.."
work=$(mktemp -d)

entry=$(node -e "require('expo/scripts/resolveAppEntry')" "$PWD" "$platform" absolute | tail -n 1)
case "$(uname)" in
  Darwin) os=osx-bin ;;
  *) os=linux64-bin ;;
esac
hermesc=$(node --print "require('path').join(require('path').dirname(require.resolve('hermes-compiler/package.json', {paths: [require('path').dirname(require.resolve('react-native/package.json'))]})), 'hermesc', '$os', 'hermesc')")

pnpm exec expo export:embed --platform "$platform" --dev false --reset-cache \
  --entry-file "$entry" --bundle-output "$work/bundle.js" \
  --assets-dest "$work/assets" --minify false

bytecode_version() { od -A n -t u4 -j 8 -N 4 "$1" | tr -d ' '; }

# The build's VM rejects bytecode from a different Hermes train at launch.
same_bytecode_version() {
  if [ "$(bytecode_version "$1")" != "$(bytecode_version "$2")" ]; then
    echo "Hermes bytecode version differs from the cached build" >&2
    exit 1
  fi
}

if [ "$platform" = ios ]; then
  "$hermesc" -w -emit-binary -max-diagnostic-width=80 -O \
    -out "$work/main.jsbundle" "$work/bundle.js"
  same_bytecode_version "$work/main.jsbundle" "$target/main.jsbundle"
  cp -R "$work/assets/." "$target/"
  cp "$work/main.jsbundle" "$target/main.jsbundle"
  # The simulator reads entitlements from the binary, which stays untouched;
  # the signature only needs to cover the new resources.
  codesign --force --sign - "$target"
  exit 0
fi

# Gradle compiles bundle images into resources.arsc, which only a full build
# can regenerate.
if ! diff -r -q "$work/assets" "$cached_res" > /dev/null; then
  echo "Bundle images differ from the cached build" >&2
  exit 1
fi
mkdir "$work/apk"
"$hermesc" -w -emit-binary -max-diagnostic-width=80 -O -output-source-map \
  -out "$work/apk/index.android.bundle" "$work/bundle.js"
unzip -p "$target" assets/index.android.bundle > "$work/cached.bundle"
same_bytecode_version "$work/apk/index.android.bundle" "$work/cached.bundle"
mkdir "$work/apk/assets"
mv "$work/apk/index.android.bundle" "$work/apk/assets/"
cp "$target" "$work/app.apk"
(cd "$work/apk" && zip -q -0 "$work/app.apk" assets/index.android.bundle)
build_tools=$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)
"$build_tools/zipalign" -f -p 4 "$work/app.apk" "$work/aligned.apk"
keytool -genkeypair -keystore "$work/e2e.keystore" -storepass android \
  -keypass android -alias e2e -dname CN=e2e -keyalg RSA -validity 1 > /dev/null 2>&1
"$build_tools/apksigner" sign --ks "$work/e2e.keystore" --ks-pass pass:android \
  --out "$target" "$work/aligned.apk"
