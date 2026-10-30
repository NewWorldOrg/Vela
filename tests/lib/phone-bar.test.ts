import assert from 'node:assert/strict'
import { test } from 'node:test'

import { DESTINATIONS } from '@/lib/destinations'
import { SETTINGS_SCREENS, phoneBarOf } from '@/lib/phone-bar'

test('the head of each tab says its name and has no arrow back', () => {
  for (const { href, label } of DESTINATIONS) {
    assert.deepEqual(phoneBarOf(href), { title: label })
  }
})

test('each setting says its name and goes back to the settings', () => {
  for (const { href, label } of SETTINGS_SCREENS) {
    assert.deepEqual(phoneBarOf(href), {
      title: label,
      back: { href: '/settings', label: '設定' },
    })
  }
})

test('a screen a setting presses into goes back to that setting', () => {
  assert.deepEqual(phoneBarOf('/settings/channels/scan/7'), {
    title: 'スキャン結果',
    back: { href: '/settings/channels', label: 'チャンネル' },
  })
})

test('a screen pressed into from a tab goes back to the head of that tab', () => {
  assert.deepEqual(phoneBarOf('/search').back, {
    href: '/guide',
    label: '番組表',
  })
  assert.deepEqual(phoneBarOf('/library/integrity').back, {
    href: '/library',
    label: 'ライブラリ',
  })
  assert.deepEqual(phoneBarOf('/recordings/12').back, {
    href: '/library',
    label: 'ライブラリ',
  })
})
