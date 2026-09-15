import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect } from 'storybook/test'

import {
  MIGRATION,
  MIGRATION_REHEARSAL,
  MORE_NOT_TAKEN_THAN_FIT,
  NOTHING_LOST,
} from '@/repository/migration.fixtures'
import { MigrationView } from '@/components/migration/migration-page'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'

const meta = {
  title: 'Screens/設定・移行記録',
  component: MigrationView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof MigrationView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = { args: { result: MIGRATION } }

export const 記録なし: Story = { args: { result: null } }

export const 下見: Story = { args: { result: MIGRATION_REHEARSAL } }

export const 欠けなし: Story = { args: { result: NOTHING_LOST } }

export const 収まらないほどの明細: Story = {
  args: { result: MORE_NOT_TAKEN_THAN_FIT },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, '対象')
  },
}

export const 狭い幅で収まらないほどの明細: Story = {
  args: { result: MORE_NOT_TAKEN_THAN_FIT },
  parameters: { screen: { width: 768, height: 1024 } },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, '対象')
  },
}

async function staysWithinTheWindow(canvasElement: HTMLElement): Promise<void> {
  const page = document.documentElement

  await expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth)

  for (const section of canvasElement.querySelectorAll<HTMLElement>(
    'section',
  )) {
    await expect(section.scrollWidth).toBeLessThanOrEqual(section.clientWidth)
  }
}

export const 幅1400: Story = {
  args: { result: MIGRATION },
  parameters: { screen: { width: 1400, height: 900 } },
  play: async ({ canvasElement }) => staysWithinTheWindow(canvasElement),
}

export const 幅1000: Story = {
  args: { result: MIGRATION },
  parameters: { screen: { width: 1000, height: 900 } },
  play: async ({ canvasElement }) => staysWithinTheWindow(canvasElement),
}

export const 幅840: Story = {
  args: { result: MIGRATION },
  parameters: { screen: { width: 840, height: 900 } },
  play: async ({ canvasElement }) => staysWithinTheWindow(canvasElement),
}

export const 幅700: Story = {
  args: { result: MIGRATION },
  parameters: { screen: { width: 700, height: 900 } },
  play: async ({ canvasElement }) => staysWithinTheWindow(canvasElement),
}
