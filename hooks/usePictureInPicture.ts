'use client'

import { useSyncExternalStore, type RefObject } from 'react'

export interface PictureInPicture {
  offered: boolean
  out: boolean
  toggle: () => void
}

function subscribe(onChange: () => void) {
  document.addEventListener('enterpictureinpicture', onChange, true)
  document.addEventListener('leavepictureinpicture', onChange, true)

  return () => {
    document.removeEventListener('enterpictureinpicture', onChange, true)
    document.removeEventListener('leavepictureinpicture', onChange, true)
  }
}

declare global {
  interface HTMLVideoElement {
    webkitSupportsPresentationMode?: (mode: string) => boolean
  }
}

export interface FloatablePicture {
  readonly disablePictureInPicture?: boolean
  webkitSupportsPresentationMode?: (mode: string) => boolean
}

export function offersPictureInPicture(
  enabled: boolean | undefined,
  picture: FloatablePicture | null,
): boolean {
  if (enabled !== true || picture?.disablePictureInPicture === true) {
    return false
  }

  return (
    picture?.webkitSupportsPresentationMode?.('picture-in-picture') !== false
  )
}

function onTheServer(): boolean {
  return false
}

export function usePictureInPicture(
  video: RefObject<HTMLVideoElement | null>,
): PictureInPicture {
  const offered = useSyncExternalStore(
    subscribe,
    () =>
      offersPictureInPicture(document.pictureInPictureEnabled, video.current),
    onTheServer,
  )

  const out = useSyncExternalStore(
    subscribe,
    () => document.pictureInPictureElement === video.current,
    onTheServer,
  )

  const toggle = () => {
    const element = video.current

    if (!element) {
      return
    }

    if (document.pictureInPictureElement === element) {
      void document.exitPictureInPicture().catch(() => undefined)

      return
    }

    void element.requestPictureInPicture().catch(() => undefined)
  }

  return { offered, out, toggle }
}
