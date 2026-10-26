import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  FORMAT_COOKIE,
  FORMAT_IN_MP4,
  askFormats,
  choiceShown,
  formatChoiceOf,
  formatChoices,
  formatCookie,
  formatLabel,
  formatToPlay,
  type FormatAnswer,
  type FormatAnswers,
  type FormatChoice,
  type FormatProbe,
  type PlaybackFormat,
} from '@/lib/playback-format'

const NOT: FormatAnswer = { supported: false, powerEfficient: false }

const SOFT: FormatAnswer = { supported: true, powerEfficient: false }

const LIGHT: FormatAnswer = { supported: true, powerEfficient: true }

const EVERY: PlaybackFormat[] = ['h264', 'h265', 'av1']

function byCapabilities(h265: FormatAnswer, av1: FormatAnswer): FormatAnswers {
  return { byCapabilities: true, h265, av1 }
}

function byTypeSupport(h265: boolean, av1: boolean): FormatAnswers {
  return {
    byCapabilities: false,
    h265: { supported: h265, powerEfficient: false },
    av1: { supported: av1, powerEfficient: false },
  }
}

const AUTO_CASES: {
  offered?: PlaybackFormat[]
  answers: FormatAnswers
  plays?: PlaybackFormat
}[] = [
  { offered: EVERY, answers: byCapabilities(NOT, NOT), plays: 'h264' },
  { offered: EVERY, answers: byCapabilities(NOT, SOFT), plays: 'h264' },
  { offered: EVERY, answers: byCapabilities(NOT, LIGHT), plays: 'av1' },
  { offered: EVERY, answers: byCapabilities(SOFT, NOT), plays: 'h264' },
  { offered: EVERY, answers: byCapabilities(SOFT, SOFT), plays: 'h264' },
  { offered: EVERY, answers: byCapabilities(SOFT, LIGHT), plays: 'av1' },
  { offered: EVERY, answers: byCapabilities(LIGHT, NOT), plays: 'h265' },
  { offered: EVERY, answers: byCapabilities(LIGHT, SOFT), plays: 'h265' },
  { offered: EVERY, answers: byCapabilities(LIGHT, LIGHT), plays: 'av1' },
  { offered: EVERY, answers: byTypeSupport(false, false), plays: 'h264' },
  { offered: EVERY, answers: byTypeSupport(false, true), plays: 'h264' },
  { offered: EVERY, answers: byTypeSupport(true, false), plays: 'h265' },
  { offered: EVERY, answers: byTypeSupport(true, true), plays: 'h265' },
  {
    offered: ['h264', 'h265'],
    answers: byCapabilities(LIGHT, LIGHT),
    plays: 'h265',
  },
  {
    offered: ['h264', 'h265'],
    answers: byCapabilities(SOFT, LIGHT),
    plays: 'h264',
  },
  {
    offered: ['h264', 'h265'],
    answers: byTypeSupport(true, true),
    plays: 'h265',
  },
  {
    offered: ['h264', 'av1'],
    answers: byCapabilities(LIGHT, LIGHT),
    plays: 'av1',
  },
  {
    offered: ['h264', 'av1'],
    answers: byCapabilities(LIGHT, SOFT),
    plays: 'h264',
  },
  {
    offered: ['h264', 'av1'],
    answers: byTypeSupport(true, true),
    plays: 'h264',
  },
  { offered: ['h264'], answers: byCapabilities(LIGHT, LIGHT), plays: 'h264' },
  { offered: undefined, answers: byCapabilities(LIGHT, LIGHT) },
]

test('自動 plays AV1, then H.265, then H.264: the first Carina transcodes in that this browser plays in its hardware', () => {
  for (const { offered, answers, plays } of AUTO_CASES) {
    assert.deepEqual(
      formatToPlay('auto', offered, answers),
      { settled: true, format: plays },
      JSON.stringify({ offered, answers }),
    )
  }
})

test('自動 is not settled while Carina transcodes in more than H.264 and the browser has not answered', () => {
  assert.deepEqual(formatToPlay('auto', EVERY, undefined), { settled: false })
  assert.deepEqual(formatToPlay('h265', ['h264', 'h265'], undefined), {
    settled: false,
  })
})

test('nothing is waited for where Carina names H.264 alone, or no formats at all', () => {
  assert.deepEqual(formatToPlay('auto', ['h264'], undefined), {
    settled: true,
    format: 'h264',
  })
  assert.deepEqual(formatToPlay('av1', undefined, undefined), {
    settled: true,
    format: undefined,
  })
})

test('a format chosen by hand is played where it is offered, even by a browser that decodes it in software', () => {
  assert.deepEqual(formatToPlay('h265', EVERY, byCapabilities(SOFT, NOT)), {
    settled: true,
    format: 'h265',
  })
  assert.deepEqual(formatToPlay('av1', EVERY, byTypeSupport(false, true)), {
    settled: true,
    format: 'av1',
  })
  assert.deepEqual(formatToPlay('h264', EVERY, byCapabilities(LIGHT, LIGHT)), {
    settled: true,
    format: 'h264',
  })
})

test('a format chosen once but no longer played here, or no longer transcoded by Carina, is taken as 自動', () => {
  assert.deepEqual(
    formatToPlay('av1', ['h264', 'h265'], byCapabilities(LIGHT, LIGHT)),
    { settled: true, format: 'h265' },
  )
  assert.deepEqual(formatToPlay('av1', EVERY, byCapabilities(LIGHT, NOT)), {
    settled: true,
    format: 'h265',
  })
  assert.deepEqual(formatToPlay('h265', ['h264'], undefined), {
    settled: true,
    format: 'h264',
  })
})

test('the choices are 自動 and H.264, then what Carina transcodes in and the browser plays at all, in that order', () => {
  assert.deepEqual(formatChoices(EVERY, byCapabilities(SOFT, SOFT)), [
    'auto',
    'h264',
    'h265',
    'av1',
  ])
  assert.deepEqual(formatChoices(EVERY, byCapabilities(NOT, SOFT)), [
    'auto',
    'h264',
    'av1',
  ])
  assert.deepEqual(formatChoices(['h264', 'h265'], byTypeSupport(true, true)), [
    'auto',
    'h264',
    'h265',
  ])
})

test('no choices are offered where only 自動 and H.264 would be left, or nothing is known yet', () => {
  assert.deepEqual(formatChoices(EVERY, byCapabilities(NOT, NOT)), [])
  assert.deepEqual(formatChoices(['h264'], byCapabilities(LIGHT, LIGHT)), [])
  assert.deepEqual(
    formatChoices(['h264', 'av1'], byCapabilities(LIGHT, NOT)),
    [],
  )
  assert.deepEqual(formatChoices(undefined, byCapabilities(LIGHT, LIGHT)), [])
  assert.deepEqual(formatChoices(EVERY, undefined), [])
})

test('the choice shown is the one kept while it is offered, 自動 when it is not, and none without the row', () => {
  const offered: FormatChoice[] = ['auto', 'h264', 'h265']

  assert.equal(choiceShown('h265', offered), 'h265')
  assert.equal(choiceShown('av1', offered), 'auto')
  assert.equal(choiceShown('h265', []), undefined)
})

test('the choice is kept in a cookie of its own, and anything else read from it is 自動', () => {
  assert.match(
    formatCookie('h265'),
    new RegExp(`^${FORMAT_COOKIE}=h265;path=/;max-age=31536000;SameSite=Lax$`),
  )
  assert.equal(FORMAT_COOKIE, 'vela-format')

  for (const kept of ['auto', 'h264', 'h265', 'av1'] as const) {
    assert.equal(formatChoiceOf(kept), kept)
  }

  assert.equal(formatChoiceOf(undefined), 'auto')
  assert.equal(formatChoiceOf('hevc'), 'auto')
})

test('the formats are named as the gear names them', () => {
  assert.deepEqual(
    (['auto', 'h264', 'h265', 'av1'] as const).map(formatLabel),
    ['自動', 'H.264', 'H.265', 'AV1'],
  )
})

test('the media capabilities are asked about the picture being chosen, as a media source, for H.265 tagged hvc1 and for AV1', async () => {
  const asked: unknown[] = []
  const probe: FormatProbe = {
    decodingInfo: async (configuration) => {
      asked.push(configuration)

      return configuration.video.contentType === FORMAT_IN_MP4.av1
        ? { supported: true, powerEfficient: false }
        : { supported: true, powerEfficient: true }
    },
    isTypeSupported: () => {
      throw new Error('not asked while media capabilities answer')
    },
  }

  assert.deepEqual(
    await askFormats(probe, { width: 1280, height: 720, framerate: 59.94 }),
    byCapabilities(LIGHT, SOFT),
  )
  assert.deepEqual(
    asked.map((one) => {
      const { type, video } = one as {
        type: string
        video: {
          contentType: string
          width: number
          height: number
          framerate: number
        }
      }

      return [
        type,
        video.contentType,
        video.width,
        video.height,
        video.framerate,
      ]
    }),
    [
      ['media-source', FORMAT_IN_MP4.h265, 1280, 720, 59.94],
      ['media-source', FORMAT_IN_MP4.av1, 1280, 720, 59.94],
    ],
  )
  assert.equal(FORMAT_IN_MP4.h265, 'video/mp4; codecs="hvc1.1.6.L123.B0"')
  assert.equal(FORMAT_IN_MP4.av1, 'video/mp4; codecs="av01.0.09M.08"')
})

test('an answer that fails, or a power efficiency claimed for what is not supported, counts as not played', async () => {
  const probe: FormatProbe = {
    decodingInfo: async (configuration) => {
      if (configuration.video.contentType === FORMAT_IN_MP4.av1) {
        throw new TypeError('not a configuration this browser reads')
      }

      return { supported: false, powerEfficient: true }
    },
  }

  assert.deepEqual(
    await askFormats(probe, { width: 1920, height: 1080, framerate: 60 }),
    byCapabilities(NOT, NOT),
  )
})

test('a browser without media capabilities is asked by the media source it is fed through, and never counted as light', async () => {
  const asked: string[] = []
  const probe: FormatProbe = {
    isTypeSupported: (type) => {
      asked.push(type)

      return type === FORMAT_IN_MP4.h265
    },
  }

  assert.deepEqual(
    await askFormats(probe, { width: 1920, height: 1080, framerate: 30 }),
    byTypeSupport(true, false),
  )
  assert.deepEqual(asked, [FORMAT_IN_MP4.h265, FORMAT_IN_MP4.av1])
  assert.deepEqual(
    await askFormats({}, { width: 1920, height: 1080, framerate: 30 }),
    byTypeSupport(false, false),
  )
})
