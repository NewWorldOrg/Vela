import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { PLAYBACK_PROFILES } from '@/repository/video-paths'

const profileParameter = (() => {
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
    (one) => one.name === 'profile',
  )

  assert.ok(found, 'the endpoint that plays a recording takes a profile')

  return found
})()

test('the profiles offered are the ones the endpoint accepts', () => {
  assert.deepEqual([...PLAYBACK_PROFILES], profileParameter.schema.enum)
})

test('the endpoint pins no profile, so the machine is what answers', () => {
  assert.equal(profileParameter.schema.default, undefined)
})

test('the endpoint sends the unasked profile to the live list', () => {
  assert.match(profileParameter.description ?? '', /\/api\/live\/profiles/)
})
