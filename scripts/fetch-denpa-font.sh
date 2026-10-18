#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

VERSION=v3.2
WOFF2_SHA256=31092c9261b0eed95e0a422a892b607885dcbf3a38509f792e0a5a6dff187c7d
RELEASE="https://github.com/NewWorldOrg/denpa-font/releases/download/$VERSION"
OUT=public/fonts/denpa-font.woff2

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

curl -sSL --fail --retry 5 -o "$work/denpa-font.woff2" "$RELEASE/denpa-font.woff2"
curl -sSL --fail --retry 5 -o "$work/SHA256SUMS" "$RELEASE/SHA256SUMS"
(cd "$work" && sha256sum -c --ignore-missing --quiet SHA256SUMS)
echo "$WOFF2_SHA256  $work/denpa-font.woff2" | sha256sum -c --quiet
mv "$work/denpa-font.woff2" "$OUT"
echo "Denpa Font $VERSION -> $OUT"
