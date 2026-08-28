import assert from 'node:assert/strict'
import { test } from 'node:test'

import { reservationAnchor, reservationHref } from './reservations.ts'

/**
 * The anchor a reservation's row carries and the link the recording screen
 * sends the reader in on. Both are spelled out here rather than one derived
 * from the other, so a change to either spelling has to be a change here too:
 * building the expected link out of `reservationAnchor` would move the
 * goalposts with it and hold nothing.
 */
test('予約の行の錨は、その予約の id から綴られる', () => {
  assert.equal(reservationAnchor('r-309'), 'reservation-r-309')
})

test('録画から入るリンクは、その錨を名指す', () => {
  assert.equal(reservationHref('r-309'), '/reservations#reservation-r-309')
})
