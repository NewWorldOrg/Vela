'use client'

import { useEffect } from 'react'

import {
  browserDecodes,
  decodesCookie,
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

/** Asks the browser which artefacts it plays as they are, and keeps the answer in a cookie for the server. */
export function DecodingProbe() {
  useEffect(() => {
    void browserDecodes(thisBrowser()).then((decodes) => {
      document.cookie = decodesCookie(decodes)
    })
  }, [])

  return null
}
