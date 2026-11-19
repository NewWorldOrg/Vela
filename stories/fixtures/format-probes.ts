import {
  FORMAT_IN_MP4,
  type FormatAnswer,
  type FormatProbe,
} from '@/lib/playback-format'

const NOT: FormatAnswer = { supported: false, powerEfficient: false }

const SOFT: FormatAnswer = { supported: true, powerEfficient: false }

const LIGHT: FormatAnswer = { supported: true, powerEfficient: true }

function answering(h265: FormatAnswer, av1: FormatAnswer): FormatProbe {
  return {
    decodingInfo: async ({ video }) =>
      video.contentType === FORMAT_IN_MP4.av1 ? av1 : h265,
  }
}

export const PLAYS_EVERY_FORMAT_LIGHTLY = answering(LIGHT, LIGHT)

export const PLAYS_AV1_IN_SOFTWARE = answering(LIGHT, SOFT)

export const PLAYS_ONLY_H264 = answering(NOT, NOT)

export const TAKES_EVERY_TYPE: FormatProbe = {
  isTypeSupported: (type) =>
    type === FORMAT_IN_MP4.h265 || type === FORMAT_IN_MP4.av1,
}

export function answeringWhenTold(): {
  probe: FormatProbe
  answer: () => void
} {
  const waiting: (() => void)[] = []

  return {
    probe: {
      decodingInfo: () =>
        new Promise((settle) => waiting.push(() => settle(LIGHT))),
    },
    answer: () => {
      for (const settle of waiting.splice(0)) {
        settle()
      }
    },
  }
}
