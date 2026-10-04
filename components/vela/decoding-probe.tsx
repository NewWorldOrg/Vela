'use client'

import { useEffect } from 'react'

import {
  decodesCookie,
  decodesH265,
  type DecodingProbe as Probe,
} from '@/lib/browser-decodes'

function thisBrowser(): Probe {
  const element = document.createElement('video')
  const capabilities = navigator.mediaCapabilities

  return {
    canPlayType: (type) => element.canPlayType(type),
    decodingInfo: capabilities
      ? (configuration) => capabilities.decodingInfo(configuration)
      : undefined,
  }
}

/** Asks the browser whether it plays an H.265 artefact, and keeps the answer in a cookie for the server. */
export function DecodingProbe() {
  useEffect(() => {
    void decodesH265(thisBrowser()).then((h265) => {
      document.cookie = decodesCookie(h265)
    })
  }, [])

  return null
}
