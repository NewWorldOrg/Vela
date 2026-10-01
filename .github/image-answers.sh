#!/bin/sh
set -eu

image="${1:?the image to start}"
readonly name=vela-answers
readonly origin=http://127.0.0.1:3000

status_of() {
  curl --silent --output /dev/null --write-out '%{http_code}' "${origin}$1" || true
}

docker run --detach --name "${name}" --publish 127.0.0.1:3000:3000 \
  --env CARINA_API_BASE_URL=http://127.0.0.1:9 "${image}" >/dev/null
trap 'docker rm --force "${name}" >/dev/null' EXIT

login=000

for _ in $(seq 1 30); do
  login="$(status_of /login)"

  if [ "${login}" != 000 ]; then
    break
  fi

  sleep 1
done

if [ "${login}" != 200 ]; then
  docker logs "${name}" >&2
  echo "the image answered /login with ${login}, so it is not one to hand out" >&2
  exit 1
fi

sheet="$(curl --silent "${origin}/login" | grep --only-matching '/_next/static/[^"]*\.css' | head -n 1)"

if [ -z "${sheet}" ]; then
  echo "the login page names no stylesheet, so whether the image carries its static files could not be told" >&2
  exit 1
fi

served="$(status_of "${sheet}")"

if [ "${served}" != 200 ]; then
  echo "the image answered ${sheet} with ${served}, so its static files did not come along" >&2
  exit 1
fi

echo "${image} serves the login page and its stylesheet."
