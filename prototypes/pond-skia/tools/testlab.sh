#!/usr/bin/env bash
# PROTOTYPE: runs a bench APK as a Firebase Test Lab Game Loop test and prints its BENCH lines.
# Usage: tools/testlab.sh <bench.apk> <model>,<android-version> [...]   e.g. a16x,35 a36xq,36
set -euo pipefail
apk=$1; shift
for dev in "$@"; do
  model=${dev%,*}; version=${dev#*,}
  out=$(gcloud firebase test android run --project look-together --type game-loop --app "$apk" \
    --device "model=$model,version=$version" --timeout 4m --format=json 2>&1 | tee /dev/stderr || true)
  bucket=$(grep -o 'gs://[^ ]*' <<<"$out" | head -1 | sed 's:/*\]*$::')
  echo "== $model ($apk)"
  gcloud storage cat "$bucket/$model-$version-*/logcat" 2>/dev/null | grep -o 'BENCH.*' || echo "no BENCH lines; see $bucket"
done
