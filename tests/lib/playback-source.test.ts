import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  theSourceAsked,
  whatOpensThePlayerAnew,
  whereThatSourceOpens,
} from '@/lib/playback-source'
import { BOTH_SOURCES } from '@/repository/playback-sources'

const WATCHING = '/recordings/1266'

test('the address is read for either of the sources the endpoint offers', () => {
  for (const source of BOTH_SOURCES) {
    assert.equal(theSourceAsked(source), source)
  }
})

test('an address that asks for no source is opened as it always was', () => {
  assert.equal(theSourceAsked(undefined), undefined)
})

test('a source no build offers is dropped, so the endpoint is never asked for it', () => {
  assert.equal(theSourceAsked('proxy'), undefined)
  assert.equal(theSourceAsked(''), undefined)
  assert.equal(theSourceAsked('Recording'), undefined)
  assert.equal(theSourceAsked('recording '), undefined)
})

test('an address that asks twice is taken as asking for nothing', () => {
  assert.equal(theSourceAsked(['recording', 'artefact']), undefined)
  assert.equal(theSourceAsked(['recording']), undefined)
})

test('watching the recording itself is an address that names it', () => {
  assert.equal(
    whereThatSourceOpens(WATCHING, '', 'recording'),
    '/recordings/1266?source=recording',
  )
})

test('going back to the artefact drops the source rather than naming it', () => {
  assert.equal(
    whereThatSourceOpens(WATCHING, 'source=recording', 'artefact'),
    WATCHING,
  )
})

test('the second the reader was carried to is kept across the switch', () => {
  assert.equal(
    whereThatSourceOpens(WATCHING, 'at=612', 'recording'),
    '/recordings/1266?at=612&source=recording',
  )
  assert.equal(
    whereThatSourceOpens(WATCHING, 'at=612&source=recording', 'artefact'),
    '/recordings/1266?at=612',
  )
})

test('a source already named is replaced, and never asked for twice', () => {
  assert.equal(
    whereThatSourceOpens(WATCHING, 'source=artefact', 'recording'),
    '/recordings/1266?source=recording',
  )
})

test('the player is opened anew when what it plays changes', () => {
  assert.notEqual(
    whatOpensThePlayerAnew('1266', 612, 'artefact'),
    whatOpensThePlayerAnew('1266', 612, 'recording'),
  )
  assert.notEqual(
    whatOpensThePlayerAnew('1266', undefined, undefined),
    whatOpensThePlayerAnew('1266', undefined, 'recording'),
  )
})

test('the player is left as it stands while the recording, the second and the source stand', () => {
  assert.equal(
    whatOpensThePlayerAnew('1266', 612, 'recording'),
    whatOpensThePlayerAnew('1266', 612, 'recording'),
  )
  assert.notEqual(
    whatOpensThePlayerAnew('1266', 612, 'recording'),
    whatOpensThePlayerAnew('1266', 613, 'recording'),
  )
  assert.notEqual(
    whatOpensThePlayerAnew('1266', 612, 'recording'),
    whatOpensThePlayerAnew('1274', 612, 'recording'),
  )
})
