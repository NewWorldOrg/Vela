import assert from 'node:assert/strict'
import { test } from 'node:test'

import { redrawnHref } from '@/lib/thumbnail-redraw'

test('the picture is asked for as it stands, at the moment it was drawn', () => {
  assert.equal(
    redrawnHref('/api/videos/1274/thumbnail', 1_757_000_000_000),
    '/api/videos/1274/thumbnail?redrawn=1757000000000',
  )
})

test('a picture nobody has redrawn is asked for as it always was', () => {
  assert.equal(
    redrawnHref('/api/videos/1274/thumbnail'),
    '/api/videos/1274/thumbnail',
  )
})

test('the moment joins inputs the path already carries', () => {
  assert.equal(
    redrawnHref('/api/videos/1274/scrub?at=120', 7),
    '/api/videos/1274/scrub?at=120&redrawn=7',
  )
})
