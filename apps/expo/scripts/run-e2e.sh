#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.maestro/bin:$PATH"

mkdir -p e2e/results

maestro test \
  e2e/flows/ \
  --format junit \
  --output e2e/results/report.xml
