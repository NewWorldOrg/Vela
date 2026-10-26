'use client'

import { useEffect, useSyncExternalStore } from 'react'

import type {
  FormatAnswers,
  FormatProbe,
  PictureSize,
} from '@/lib/playback-format'
import {
  answersFor,
  answersVersion,
  askAbout,
  followAnswers,
  pictureOfSize,
  picturesToAsk,
  sizeOf,
  type OfferedPicture,
} from '@/components/vela/format-answers'

const NOT_YET_HYDRATED = -1

/** What the browser answered about the formats each picture can be played in, asked once the page is in the browser; nothing before the answer comes. */
export function useFormatAnswers(
  probe: FormatProbe | undefined,
  pictures: readonly OfferedPicture[],
): (picture: PictureSize) => FormatAnswers | undefined {
  const version = useSyncExternalStore(
    followAnswers,
    answersVersion,
    () => NOT_YET_HYDRATED,
  )
  const wanted = picturesToAsk(pictures).map(sizeOf).join(' ')

  useEffect(() => {
    if (!probe || wanted === '') {
      return
    }

    askAbout(
      probe,
      wanted.split(' ').flatMap((size) => pictureOfSize(size) ?? []),
    )
  }, [probe, wanted])

  return (picture) =>
    version === NOT_YET_HYDRATED || !probe
      ? undefined
      : answersFor(probe, picture)
}
