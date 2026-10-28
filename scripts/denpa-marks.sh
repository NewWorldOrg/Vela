#!/bin/sh
# Cuts the broadcast marks the page draws in Denpa Font out of the whole font,
# so a page loads them alone and the data broadcast keeps the whole font.
# Needs fonttools and brotli (scripts/denpa-marks/requirements.txt).
# Usage: denpa-marks.sh [whole font] [marks out]
set -eu
cd "$(dirname "$0")/.."

UNICODE_RANGE='U+1F110-1F16F, U+1F200-1F202, U+1F210-1F23B, U+1F240-1F248, U+1F250-1F251'
IN=${1:-public/fonts/denpa-font.woff2}
OUT=${2:-public/fonts/denpa-marks.woff2}

mkdir -p "$(dirname "$OUT")"
pyftsubset "$IN" \
  --unicodes="$(echo "$UNICODE_RANGE" | tr -d ' ')" \
  --layout-features='*' \
  --flavor=woff2 \
  --output-file="$OUT"
echo "Denpa Font marks -> $OUT"
