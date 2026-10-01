import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  theHoldAsked,
  theSourceAsked,
  theAddressStands,
  whatOpensThePlayerAnew,
  whatTheStandingArtefactAsks,
  whereThatSourceOpens,
  whichArtefactSeats,
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

test('the second being watched is carried across the switch, over the one the reader was carried to', () => {
  assert.equal(
    whereThatSourceOpens(WATCHING, 'at=612', 'recording', 1500.7),
    '/recordings/1266?at=1500&source=recording',
  )
  assert.equal(
    whereThatSourceOpens(WATCHING, 'at=612&source=recording', 'artefact', 1500),
    '/recordings/1266?at=1500',
  )
})

test('a switch made while watching names the second even when the address named none', () => {
  assert.equal(
    whereThatSourceOpens(WATCHING, '', 'recording', 1500),
    '/recordings/1266?at=1500&source=recording',
  )
  assert.equal(
    whereThatSourceOpens(WATCHING, 'source=recording', 'artefact', 0),
    '/recordings/1266?at=0',
  )
})

test('a player that was paused is reopened held at the second it stood at', () => {
  assert.equal(
    whereThatSourceOpens(WATCHING, 'at=612', 'recording', 622.4, true),
    '/recordings/1266?at=622&paused=1&source=recording',
  )
  assert.equal(
    whereThatSourceOpens(WATCHING, 'at=612', 'artefact', 622, true),
    '/recordings/1266?at=622&paused=1',
  )
})

test('a player that was playing drops a hold the address still carried', () => {
  assert.equal(
    whereThatSourceOpens(WATCHING, 'at=622&paused=1', 'artefact', 640, false),
    '/recordings/1266?at=640',
  )
})

test('the address is read as held only when it says so once', () => {
  assert.equal(theHoldAsked('1'), true)
  assert.equal(theHoldAsked(undefined), false)
  assert.equal(theHoldAsked('0'), false)
  assert.equal(theHoldAsked(['1', '1']), false)
})

test('the player is opened anew when a hold is asked at the same second', () => {
  assert.notEqual(
    whatOpensThePlayerAnew('1266', 622, 'artefact', true),
    whatOpensThePlayerAnew('1266', 622, 'artefact', false),
  )
})

test('a switch made before anything played leaves the second in the address as it was', () => {
  assert.equal(
    whereThatSourceOpens(WATCHING, 'at=612', 'recording'),
    '/recordings/1266?at=612&source=recording',
  )
  assert.equal(
    whereThatSourceOpens(WATCHING, '', 'recording'),
    '/recordings/1266?source=recording',
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

test('a player watching the artefact reopens when another job has the standing artefact', () => {
  assert.equal(
    whatTheStandingArtefactAsks('job-a', 'job-b', 'artefact', true),
    'reopen',
  )
})

test('a player that has not played yet only takes the new plan', () => {
  assert.equal(
    whatTheStandingArtefactAsks('job-a', 'job-b', 'artefact', false),
    'replan',
  )
})

test('the same artefact, or none standing, leaves the player as it is', () => {
  assert.equal(
    whatTheStandingArtefactAsks('job-a', 'job-a', 'artefact', true),
    'stay',
  )
  assert.equal(
    whatTheStandingArtefactAsks('job-a', undefined, 'artefact', true),
    'stay',
  )
})

test('a player watching the recording itself is not moved by the artefact', () => {
  assert.equal(
    whatTheStandingArtefactAsks('job-a', 'job-b', 'recording', true),
    'stay',
  )
  assert.equal(
    whatTheStandingArtefactAsks('job-a', 'job-b', undefined, true),
    'stay',
  )
})

test('a player that opened without knowing its artefact learns it before it moves', () => {
  assert.equal(
    whatTheStandingArtefactAsks(undefined, 'job-b', 'artefact', true),
    'learn',
  )
})

test('reopening at the second and the hold the address already names leaves the address where it stands', () => {
  assert.equal(
    theAddressStands(
      '/recordings/1274',
      'at=622&paused=1',
      'artefact',
      622.4,
      true,
    ),
    true,
  )
  assert.equal(
    theAddressStands('/recordings/1274', 'at=622', 'artefact', 622.9, false),
    true,
  )
})

test('reopening at another second, under another hold or on another source moves the address', () => {
  assert.equal(
    theAddressStands(
      '/recordings/1274',
      'at=612&paused=1',
      'artefact',
      622,
      true,
    ),
    false,
  )
  assert.equal(
    theAddressStands('/recordings/1274', 'at=622', 'artefact', 622, true),
    false,
  )
  assert.equal(
    theAddressStands(
      '/recordings/1274',
      'at=622&paused=1',
      'artefact',
      622,
      false,
    ),
    false,
  )
  assert.equal(
    theAddressStands('/recordings/1274', '', 'artefact', 622, false),
    false,
  )
  assert.equal(
    theAddressStands('/recordings/1274', 'at=622', 'recording', 622, false),
    false,
  )
})

test('the player is seated on the artefact it asked for once the page has read that one', () => {
  assert.equal(whichArtefactSeats(undefined, 'job-b', 'job-b'), 'job-b')
  assert.equal(whichArtefactSeats('job-b', 'job-c', 'job-c'), 'job-c')
})

test('the player keeps its seat until the page has read the artefact it asked for', () => {
  assert.equal(whichArtefactSeats(undefined, 'job-b', 'job-a'), undefined)
  assert.equal(whichArtefactSeats('job-b', 'job-c', 'job-b'), 'job-b')
  assert.equal(whichArtefactSeats('job-b', 'job-c', undefined), 'job-b')
})

test('a page that reads another artefact unasked does not move the seat', () => {
  assert.equal(whichArtefactSeats(undefined, undefined, 'job-b'), undefined)
  assert.equal(whichArtefactSeats('job-b', 'job-b', 'job-c'), 'job-b')
})
