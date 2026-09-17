#!/usr/bin/env bash
set -euo pipefail
bash deploy/acep-engine-remediation/prepare.sh
cd .acep-release/ACEP
corepack npm ci
corepack npm run build
corepack npm run validate:data
corepack npm prune --omit=dev
