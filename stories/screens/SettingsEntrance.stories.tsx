import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, within } from 'storybook/test'

import { SYSTEM_STATUS } from '@/repository/system.fixtures'
import { SettingsEntranceView } from '@/components/settings-entrance/settings-entrance-page'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { inTheSettings } from '@/stories/frames'

const PHONE = { width: 390, height: 844 }
const NARROW_PHONE = { width: 360, height: 800 }

const meta = {
  title: 'Screens/設定・入口',
  component: SettingsEntranceView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/settings' },
    },
    layout: 'fullscreen',
    screen: PHONE,
  },
  args: {
    status: SYSTEM_STATUS,
    values: { viewing: 'データ放送を自動で開く', display: 'テーマ システム' },
    hasMigration: true,
  },
  decorators: [inTheSettings],
} satisfies Meta<typeof SettingsEntranceView>

export default meta
type Story = StoryObj<typeof meta>

const GROUPS: [string, string[]][] = [
  ['観る', ['視聴', '表示']],
  ['録る', ['エンコード', 'CM・OP・ED の検出', '品質']],
  ['機器', ['チューナー', 'チャンネル']],
  ['管理', ['認証', '移行記録']],
]

function entranceOf(canvasElement: HTMLElement): HTMLElement {
  const found = canvasElement.querySelector('[data-slot="settings-entrance"]')

  if (!(found instanceof HTMLElement)) {
    throw new Error('the entrance is not on the page')
  }

  return found
}

async function everySettingIsOnePressAway(
  canvasElement: HTMLElement,
): Promise<void> {
  await afterTheArrival(canvasElement)

  const entrance = within(entranceOf(canvasElement))
  const groups = entrance.getAllByRole('heading', { level: 2 })

  await expect(groups.map((one) => one.textContent)).toEqual(
    GROUPS.map(([name]) => name),
  )

  for (const [name, items] of GROUPS) {
    const list = within(entrance.getByRole('region', { name }))
    const links = list.getAllByRole('link')

    await expect(links).toHaveLength(items.length)

    for (const [nth, item] of items.entries()) {
      await expect(links[nth]).toHaveTextContent(item)
    }

    for (const link of links) {
      await expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(
        44,
      )
      await expect(link.getBoundingClientRect().right).toBeLessThanOrEqual(
        window.innerWidth,
      )
    }
  }
}

export const OnAPhone: Story = {
  play: async ({ canvasElement }) => {
    await everySettingIsOnePressAway(canvasElement)

    const canvas = within(entranceOf(canvasElement))
    const system = canvas.getByRole('link', { name: /^システム/ })

    await expect(system).toHaveAttribute('href', '/settings/system')
    await expect(system).toHaveTextContent('API')
    await expect(system).toHaveTextContent('driver')
    await expect(system).toHaveTextContent('チューナー 空き 3 / 4')
    await expect(canvas.getByRole('link', { name: /視聴/ })).toHaveTextContent(
      'データ放送を自動で開く',
    )
    await expect(canvas.getByRole('link', { name: /表示/ })).toHaveTextContent(
      'テーマ システム',
    )
    await expect(
      canvasElement.querySelector('[data-slot="admin-side-nav"]'),
    ).not.toBeVisible()
    await expect(
      canvasElement.querySelector('[data-slot="phone-bar-title"]'),
    ).toHaveTextContent('設定')
    await expect(
      canvasElement.querySelector('[data-slot="phone-bar-back"]'),
    ).toBeNull()
  },
}

export const OnANarrowPhone: Story = {
  parameters: { screen: NARROW_PHONE },
  play: async ({ canvasElement }) => {
    await everySettingIsOnePressAway(canvasElement)
  },
}

export const WithoutAMigration: Story = {
  args: { hasMigration: false, values: {} },
  play: async ({ canvasElement }) => {
    const keeping = within(
      within(entranceOf(canvasElement)).getByRole('region', { name: '管理' }),
    )

    await expect(keeping.getAllByRole('link')).toHaveLength(1)
  },
}

export const WhenTheApiCannotBeReached: Story = {
  args: {
    status: {
      ...SYSTEM_STATUS,
      api: { state: 'unreachable' },
      driver: { state: 'unreachable' },
      tuners: { state: 'unavailable' },
    },
  },
  play: async ({ canvasElement }) => {
    const system = within(entranceOf(canvasElement)).getByRole('link', {
      name: /^システム/,
    })

    await expect(system).not.toHaveTextContent('チューナー')
  },
}
