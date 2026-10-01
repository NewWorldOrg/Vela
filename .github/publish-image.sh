#!/bin/sh
set -eu

reference="${1:?the tag in the registry}"
what="${2:?whether to ask if the tag is there, or to push}"
built="${3:-}"

case "${what}" in
  there)
    if answer="$(docker buildx imagetools inspect "${reference}" 2>&1)"; then
      echo "${reference} is already there and is left as it is." >&2
      echo yes
      exit 0
    fi

    case "${answer}" in
      *": not found"*) echo no ;;
      *)
        echo "whether ${reference} is already there could not be told, so nothing is pushed:" >&2
        echo "${answer}" >&2
        exit 1
        ;;
    esac
    ;;
  push)
    docker tag "${built:?the image already built on this machine}" "${reference}"
    docker push --quiet "${reference}"
    echo "${reference} pushed."
    ;;
  *)
    echo "${what} is neither there nor push" >&2
    exit 1
    ;;
esac
