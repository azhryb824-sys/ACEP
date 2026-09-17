#!/usr/bin/env bash
set -euo pipefail
release_dir=.acep-release
mkdir "$release_dir"
cat deploy/acep-engine-staging/part-* > "$release_dir/baseline.tar.gz"
node - <<'NODE'
const fs=require('fs'),crypto=require('crypto');const m=JSON.parse(fs.readFileSync('deploy/acep-engine-remediation/manifest.json'));
for(const [file,key] of [['.acep-release/baseline.tar.gz','baseArchiveSha256'],['deploy/acep-engine-gateway/gateway-token.patch','basePatchSha256']])if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==m[key])throw new Error('Baseline identity mismatch: '+file);
NODE
expected_tree=$(node -p "require('./deploy/acep-engine-remediation/manifest.json').baseDirectoryTreeSha")
actual_tree=$(git rev-parse HEAD:ACEP)
test "$actual_tree" = "$expected_tree"
mkdir "$release_dir/ACEP"
git archive HEAD:ACEP | tar -x -C "$release_dir/ACEP"
tar -xzf "$release_dir/baseline.tar.gz" -C "$release_dir"
git apply --check --directory="$release_dir" deploy/acep-engine-gateway/gateway-token.patch
git apply --directory="$release_dir" deploy/acep-engine-gateway/gateway-token.patch
node deploy/acep-engine-remediation/apply.cjs "$release_dir/ACEP"
cd "$release_dir/ACEP"
node scripts/rebuild-uets-reviewed-schema.js
node - <<'NODE'
const fs=require('fs'),crypto=require('crypto');const m=JSON.parse(fs.readFileSync('docs/governance/uets-rebuilt-manifest.json'));
for(const [file,expected]of Object.entries(m.files))if(crypto.createHash('sha256').update(fs.readFileSync('data/uets/jsonl/'+file)).digest('hex')!==expected)throw new Error('Rebuilt dataset differs: '+file);
console.log('UETS export hashes exactly match the reviewed dataset manifest.');
NODE
