import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { cn } from '@/lib/utils'
import { cellClassOf } from '@/components/guide/cell-class'
import { GENRE_CLASS, GENRE_CLASS_PAST } from '@/components/guide/guide-metrics'

test('a cell is dressed by its genre, whether it has aired, its size, its mark and whether it is chosen', () => {
  assert.equal(
    cellClassOf({ genre: 'anime', past: false, size: 'md', selected: false }),
    cn('guide-cell', GENRE_CLASS.anime, 'px-[calc(7rem/16)] py-1'),
  )

  const chosen = cellClassOf({
    genre: 'news',
    past: true,
    size: 'xs',
    mark: 'recording',
    selected: true,
  })

  assert.equal(
    chosen,
    cn(
      'guide-cell',
      GENRE_CLASS_PAST.news,
      'flex items-center px-1.5 py-0',
      'outline-2 -outline-offset-2 outline-coral',
      'z-[3] border-brand shadow-pop',
    ),
  )
})

test('the same cell asked twice is the same answer', () => {
  const one = {
    genre: 'drama',
    past: false,
    size: 's',
    mark: 'booked',
    selected: false,
  } as const

  assert.equal(cellClassOf(one), cellClassOf({ ...one }))
})

test('a cell out of view is not laid out again each time a face arrives', () => {
  const styles = readFileSync('app/globals.css', 'utf8')
  const cell = /@utility guide-cell {[^}]*}/.exec(styles)

  assert.ok(cell, 'app/globals.css declares the guide-cell utility')
  assert.match(cell[0], /content-visibility: auto;/)
})
