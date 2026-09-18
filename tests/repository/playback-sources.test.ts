import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { NOT_YET_IN_THIS_BUILD } from '@/lib/not-yet-in-this-build'
import {
  BOTH_SOURCES,
  sourceLabel,
  sourceThisBuildKnows,
  THE_ARTEFACT,
  THE_RECORDING_ITSELF,
  type PlaybackSource,
} from '@/repository/playback-sources'

const sourceParameter = (() => {
  const document: unknown = JSON.parse(
    readFileSync(
      new URL('../../repository/client/carina.json', import.meta.url),
      'utf8',
    ),
  )
  const found = (
    document as {
      paths: Record<
        string,
        {
          get: {
            parameters: {
              name: string
              description?: string
              schema: { enum?: string[]; default?: string }
            }[]
          }
        }
      >
    }
  ).paths['/api/videos/{id}/play'].get.parameters.find(
    (one) => one.name === 'source',
  )

  assert.ok(found, 'the endpoint that plays a recording takes a source')

  return found
})()

test('the sources offered are the ones the endpoint accepts', () => {
  assert.deepEqual([...BOTH_SOURCES], sourceParameter.schema.enum)
})

test('the endpoint pins no source, so asking for none is what prefers the artefact', () => {
  assert.equal(sourceParameter.schema.default, undefined)
  assert.match(
    sourceParameter.description ?? '',
    /Asking for none plays the artefact where there is one/,
  )
})

test('the two sources are the artefact and the recording itself', () => {
  assert.deepEqual([...BOTH_SOURCES], [THE_ARTEFACT, THE_RECORDING_ITSELF])
})

test('each source is named in Japanese, and neither says how it is made', () => {
  assert.equal(sourceLabel('artefact'), 'エンコード済み')
  assert.equal(sourceLabel('recording'), '元のまま')

  for (const source of BOTH_SOURCES) {
    assert.doesNotMatch(sourceLabel(source), /トランスコード|オンザフライ/)
  }
})

test('a source this build has no name for is not shown as it arrived', () => {
  const said = sourceLabel('proxy' as PlaybackSource)

  assert.equal(said, NOT_YET_IN_THIS_BUILD)
  assert.doesNotMatch(said, /proxy/)
})

test('a source this build knows is read back as itself', () => {
  for (const source of BOTH_SOURCES) {
    assert.equal(sourceThisBuildKnows(source), source)
  }
})

test('a source this build does not know is read back as none at all', () => {
  assert.equal(sourceThisBuildKnows('proxy'), undefined)
  assert.equal(sourceThisBuildKnows(undefined), undefined)
  assert.equal(sourceThisBuildKnows(''), undefined)
})
