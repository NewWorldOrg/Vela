import assert from 'node:assert/strict'
import { test } from 'node:test'

import { LIBRARY_LAYOUT_COOKIE, libraryViewOf } from '@/lib/library-view'

test('the layout is kept in the vela-library-view cookie', () => {
  assert.equal(LIBRARY_LAYOUT_COOKIE, 'vela-library-view')
})

test('an address that names no layout is laid as this device last chose', () => {
  assert.deepEqual(libraryViewOf({}, 'table'), { by: 'date', as: 'table' })
  assert.deepEqual(libraryViewOf({ by: 'series' }, 'table'), {
    by: 'series',
    as: 'table',
  })
})

test('a device that has chosen nothing gets the grid', () => {
  assert.deepEqual(libraryViewOf({}), { by: 'date', as: 'grid' })
  assert.deepEqual(libraryViewOf({}, 'tiles'), { by: 'date', as: 'grid' })
})

test('a layout the address names wins over the device', () => {
  assert.deepEqual(libraryViewOf({ as: 'grid' }, 'table'), {
    by: 'date',
    as: 'grid',
  })
  assert.deepEqual(libraryViewOf({ as: 'table' }, 'grid'), {
    by: 'date',
    as: 'table',
  })
})

test('the grouping is not kept on the device', () => {
  assert.deepEqual(libraryViewOf({}, 'series'), { by: 'date', as: 'grid' })
})
