import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

const ROUNDS_IT_OFF = /\btruncate\b|\bline-clamp-\d/

const TAKES_THE_TIP = /@\/components\/vela\/in-full/

function read(file: string): Promise<string> {
  return readFile(path.join(ROOT, file), 'utf8')
}

const SAYS_IT_WHOLE: { file: string; prints: RegExp; what: string }[] = [
  {
    file: 'components/encode/running-job.tsx',
    prints: /\{job\.title/,
    what: 'the title of the recording being encoded',
  },
  {
    file: 'components/encode/job-table.tsx',
    prints: /\{job\.title\}/,
    what: 'the title of a queued recording',
  },
  {
    file: 'components/reservations/rules-page.tsx',
    prints: /\{rule\.name\}/,
    what: 'the name of a rule and the conditions it stands for',
  },
  {
    file: 'components/recordings/encode-button.tsx',
    prints: /\{recording\.title\}/,
    what: 'the title the encode dialog is asking about',
  },
]

const KEEPS_A_FIXED_BOX: string[] = [
  'components/library/recording-row.tsx',
  'components/guide/guide-grid.tsx',
  'components/quality/quality-trend.tsx',
  'components/vela/progress.tsx',
  'components/search/search-page.tsx',
]

const LIVE_CHOICE = ['components/live/channel-list.tsx']

const LIVE_TILES = ['components/live/channel-grid.tsx']

for (const one of SAYS_IT_WHOLE) {
  test(`${one.file} prints ${one.what} whole`, async () => {
    const source = await read(one.file)

    assert.match(
      source,
      one.prints,
      'the text this screen was un-rounded for is no longer printed here, ' +
        'so the check below is watching nothing',
    )
    assert.doesNotMatch(
      source,
      ROUNDS_IT_OFF,
      'This text is the thing itself — a title, a name, the conditions a ' +
        'rule stands for — and it is rounded off with an ellipsis again. ' +
        'Let it wrap.',
    )
  })
}

for (const file of KEEPS_A_FIXED_BOX) {
  test(`${file} keeps its box and hands the whole text to a tip`, async () => {
    const source = await read(file)

    assert.match(
      source,
      ROUNDS_IT_OFF,
      'this file no longer clips anything, so it does not need the tip and ' +
        'should leave this list',
    )
    assert.match(
      source,
      TAKES_THE_TIP,
      'Text is clipped here with nowhere to read the rest. A box whose ' +
        'width is fixed — a table cell, a column heading, a meter — may ' +
        'clip, but only behind InFull, which says the whole of it.',
    )
    assert.match(
      source,
      /<InFull says=/,
      'the tip is imported but never wrapped around the clipped text',
    )
  })
}

for (const file of [...LIVE_CHOICE, ...LIVE_TILES]) {
  test(`${file} says the whole of a clipped channel on hover and focus`, async () => {
    const source = await read(file)

    assert.match(
      source,
      ROUNDS_IT_OFF,
      'nothing is clipped here any more, so this file should leave the list',
    )
    assert.match(
      source,
      /<ChannelInFull channel=\{channel\}>/,
      'A channel is offered with its title clipped and no way to read the ' +
        'rest. The row or tile itself is what carries the tip, so the whole ' +
        'of it arrives on hover and on focus alike.',
    )
  })
}

test('the live panel shows the programme with the part the guide uses', async () => {
  const source = await read('components/live/now-next.tsx')

  assert.match(
    source,
    /<ProgramDescription description=\{programme\.description\}/,
    'The programme being watched is named and timed but never described. ' +
      'The guide already has a part for that; the live screen is not the ' +
      'place to draw a second one.',
  )
  assert.match(source, /<ProgramExtended key=/)
  assert.doesNotMatch(
    source,
    /whitespace-pre-wrap/,
    'the live panel lays out the description itself instead of leaving it ' +
      'to the shared part',
  )
})

test('the guide draws the description with the same part', async () => {
  const source = await read('components/guide/program-detail.tsx')

  assert.match(
    source,
    /<ProgramDescription description=\{program\.description\}/,
  )
  assert.match(source, /<ProgramExtended key=/)
})
