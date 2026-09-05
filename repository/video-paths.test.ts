import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { PLAYBACK_PROFILE_UNASKED, PLAYBACK_PROFILES } from './video-paths.ts'

/**
 * Unlike the live profiles, the endpoint that plays a recording hands back no
 * list and marks nothing: what it encodes in when no profile is asked for is
 * written in the document, as the parameter's default, and nowhere else. So
 * the constant beside the paths is a copy, and a copy drifts silently — the
 * screen would go on opening at a profile the API had stopped defaulting to,
 * and nothing would say so.
 *
 * Read out of the document instead of written down twice.
 */
const profileParameter = (() => {
  const document: unknown = JSON.parse(
    readFileSync(new URL('./client/carina.json', import.meta.url), 'utf8'),
  )
  const found = (
    document as {
      paths: Record<
        string,
        {
          get: {
            parameters: {
              name: string
              schema: { enum?: string[]; default?: string }
            }[]
          }
        }
      >
    }
  ).paths['/api/videos/{id}/play'].get.parameters.find(
    (one) => one.name === 'profile',
  )

  assert.ok(found, 'the endpoint that plays a recording takes a profile')

  return found
})()

test('the profiles offered are the ones the endpoint accepts', () => {
  assert.deepEqual([...PLAYBACK_PROFILES], profileParameter.schema.enum)
})

test('a recording opens in the profile the endpoint defaults to', () => {
  assert.equal(PLAYBACK_PROFILE_UNASKED, profileParameter.schema.default)
})
