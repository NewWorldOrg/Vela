import assert from 'node:assert/strict'
import { test } from 'node:test'

import { getMigration } from '@/repository/migration'

test('a migration that has never been run is answered as no record', async () => {
  assert.equal(await getMigration(), null)
})
