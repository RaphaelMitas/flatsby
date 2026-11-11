#!/usr/bin/env bash
# Installs the pinned Maestro CLI under <root>/<version> and prints its bin dir.
#
#   install-maestro.sh <root>
set -euo pipefail

version=2.12.1
sha256=54dbb0716425626604973cbb374c585ca30272375d9ce15177a1152765ddd9d7
root=${1:?usage: install-maestro.sh <root>}
dir=$root/$version

if [ ! -x "$dir/maestro/bin/maestro" ]; then
  mkdir -p "$root"
  partial=$(mktemp -d "$root/.partial.XXXXXX")
  curl -fsSL -o "$partial/maestro.zip" \
    "https://github.com/mobile-dev-inc/Maestro/releases/download/cli-$version/maestro.zip"
  echo "$sha256  $partial/maestro.zip" | shasum -a 256 -c >/dev/null
  unzip -q "$partial/maestro.zip" -d "$partial"
  rm "$partial/maestro.zip"
  # Another run may have finished the same install first.
  if [ -e "$dir" ]; then rm -rf "$partial"; else mv "$partial" "$dir"; fi
fi
echo "$dir/maestro/bin"
