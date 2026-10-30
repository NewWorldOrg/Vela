import assert from 'node:assert/strict'
import { test } from 'node:test'

import { TabMemory, pressTab } from '@/lib/tab-memory'

test('a tab never left goes to its head, at the top', () => {
  const memory = new TabMemory()

  assert.deepEqual(
    pressTab(memory, '/library', '/guide', { address: '/guide', scrollY: 0 }),
    { kind: 'go', address: '/library', scrollY: 0 },
  )
})

test('a tab goes back to the screen and the position it was left at', () => {
  const memory = new TabMemory()

  pressTab(memory, '/library', '/settings', {
    address: '/settings/tuners',
    scrollY: 640,
  })

  assert.deepEqual(
    pressTab(memory, '/settings', '/library', {
      address: '/library?q=news',
      scrollY: 120,
    }),
    { kind: 'go', address: '/settings/tuners', scrollY: 640 },
  )
  assert.deepEqual(
    pressTab(memory, '/library', '/settings', {
      address: '/settings/tuners',
      scrollY: 640,
    }),
    { kind: 'go', address: '/library?q=news', scrollY: 120 },
  )
})

test('the open tab pressed again goes to its head at the top, and forgets where it was', () => {
  const memory = new TabMemory()

  pressTab(memory, '/library', '/settings', {
    address: '/settings/tuners',
    scrollY: 640,
  })
  pressTab(memory, '/settings', '/library', { address: '/library', scrollY: 0 })

  assert.deepEqual(
    pressTab(memory, '/settings', '/settings', {
      address: '/settings/tuners',
      scrollY: 640,
    }),
    { kind: 'top', address: '/settings' },
  )
  assert.deepEqual(
    pressTab(memory, '/library', '/settings', {
      address: '/settings',
      scrollY: 0,
    }),
    { kind: 'go', address: '/library', scrollY: 0 },
  )
  assert.deepEqual(
    pressTab(memory, '/settings', '/library', {
      address: '/library',
      scrollY: 0,
    }),
    { kind: 'go', address: '/settings', scrollY: 0 },
  )
})
