import assert from 'node:assert/strict'
import { test } from 'node:test'

import { episodeOf, seriesNameOf, seriesOf } from '@/lib/library-series'

test('a title loses what names the episode, and keeps the name of the series', () => {
  assert.equal(seriesNameOf('となりの発明王「空飛ぶ傘の巻」'), 'となりの発明王')
  assert.equal(seriesNameOf('コメット急行 #103 夜明けの駅'), 'コメット急行')
  assert.equal(seriesNameOf('コメット急行 第4話'), 'コメット急行')
  assert.equal(seriesNameOf('コメット急行(5)'), 'コメット急行')
  assert.equal(seriesNameOf('[新]コメット急行'), 'コメット急行')
  assert.equal(seriesNameOf('【字】手仕事の地図'), '手仕事の地図')
  assert.equal(seriesNameOf('手仕事の地図'), '手仕事の地図')
})

test('full-width and half-width forms and spaces count as the same series', () => {
  assert.equal(seriesNameOf('ｺﾒｯﾄ急行　＃１０４'), 'コメット急行')
  assert.equal(seriesNameOf('コメット  急行'), 'コメット 急行')
})

test('a title that is nothing but the episode is its own series', () => {
  assert.equal(seriesNameOf('「星の渡り鳥」'), '「星の渡り鳥」')
})

test('the episode is what the title adds to its series, and nothing where it adds nothing', () => {
  assert.equal(episodeOf('となりの発明王「空飛ぶ傘の巻」'), '「空飛ぶ傘の巻」')
  assert.equal(episodeOf('コメット急行 #103 夜明けの駅'), '#103 夜明けの駅')
  assert.equal(episodeOf('手仕事の地図'), undefined)
})

const at = (id: string, title: string, startedAt: string) => ({
  id,
  title,
  startedAt,
})

test('recordings gather under their series, newest series first, each newest first', () => {
  const series = seriesOf([
    at('a', 'コメット急行 #104', '2026-10-30T10:00:00Z'),
    at('b', '手仕事の地図', '2026-10-29T10:00:00Z'),
    at('c', 'コメット急行 #103', '2026-10-23T10:00:00Z'),
    at('d', 'ｺﾒｯﾄ急行 #105', '2026-10-31T10:00:00Z'),
  ])

  assert.deepEqual(
    series.map((one) => [one.name, one.items.map((r) => r.id)]),
    [
      ['コメット急行', ['d', 'a', 'c']],
      ['手仕事の地図', ['b']],
    ],
  )
  assert.equal(series[0].key, 'コメット急行')
})
