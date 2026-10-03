import assert from 'node:assert/strict'
import { test } from 'node:test'

import { offersPictureInPicture } from '@/hooks/usePictureInPicture'

test('a document that cannot float a picture is never offered it', () => {
  assert.equal(offersPictureInPicture(false, null), false)
  assert.equal(offersPictureInPicture(undefined, {}), false)
})

test('a picture that turns floating off is not offered it', () => {
  assert.equal(
    offersPictureInPicture(true, { disablePictureInPicture: true }),
    false,
  )
})

test('a picture that says it cannot float is not offered it, though the document says it can', () => {
  const asked: string[] = []

  const offered = offersPictureInPicture(true, {
    webkitSupportsPresentationMode: (mode: string) => {
      asked.push(mode)

      return false
    },
  })

  assert.equal(offered, false)
  assert.deepEqual(asked, ['picture-in-picture'])
})

test('a picture that says it can float, or says nothing, is offered it', () => {
  assert.equal(
    offersPictureInPicture(true, {
      webkitSupportsPresentationMode: () => true,
    }),
    true,
  )
  assert.equal(offersPictureInPicture(true, {}), true)
  assert.equal(offersPictureInPicture(true, null), true)
})
