import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { FormatProbe } from '@/lib/playback-format'
import {
  answersFor,
  askAbout,
  browserProbe,
  followAnswers,
  pictureOfSize,
  picturesToAsk,
  sizeOf,
} from '@/components/vela/format-answers'

const FULL = { width: 1920, height: 1080, framerate: 60000 / 1001 }

const SMALL = { width: 1280, height: 720, framerate: 30 }

function counting(asked: string[]): FormatProbe {
  return {
    decodingInfo: async (configuration) => {
      asked.push(
        `${configuration.video.width}x${configuration.video.height} ${configuration.video.contentType}`,
      )

      return { supported: true, powerEfficient: true }
    },
  }
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

test('only a picture Carina transcodes in more than H.264 is asked about', () => {
  assert.deepEqual(
    picturesToAsk([
      { ...FULL, formats: ['h264', 'h265'] },
      { ...SMALL, formats: ['h264'] },
      { ...SMALL },
    ]),
    [{ ...FULL, formats: ['h264', 'h265'] }],
  )
})

test('a size is kept in one word and read back whole', () => {
  assert.deepEqual(pictureOfSize(sizeOf(FULL)), FULL)
  assert.equal(pictureOfSize('somewhere'), undefined)
})

test('each picture is asked about once for a probe, and those following are told when the answer comes', async () => {
  const asked: string[] = []
  const probe = counting(asked)
  let told = 0
  const stop = followAnswers(() => {
    told += 1
  })

  askAbout(probe, [FULL, SMALL])
  askAbout(probe, [FULL])

  assert.equal(answersFor(probe, FULL), undefined)

  await settle()

  assert.equal(asked.length, 4)
  assert.equal(told, 2)
  assert.equal(answersFor(probe, FULL)?.byCapabilities, true)

  askAbout(probe, [FULL, SMALL])
  await settle()

  assert.equal(asked.length, 4)
  assert.equal(answersFor(counting([]), FULL), undefined)
  stop()
})

test('no browser is asked on the server', () => {
  assert.equal(browserProbe('plainFirst'), undefined)
})
