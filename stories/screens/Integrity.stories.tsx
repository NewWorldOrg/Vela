import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type { FindingDiscarded, SweepWrite } from '@/repository/integrity'
import {
  INTEGRITY_CLEAR_FIXTURE,
  INTEGRITY_FIXTURE,
  INTEGRITY_MORE_THAN_FIT_FIXTURE,
} from '@/stories/fixtures/integrity'
import { AppFrame } from '@/components/vela/app-shell'
import { IntegrityView } from '@/components/integrity/integrity-page'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'

const swept = async (): Promise<SweepWrite> => ({ state: 'ok', findings: 5 })

const thrownAway: string[] = []

async function throwing(findingId: string): Promise<FindingDiscarded> {
  thrownAway.push(findingId)

  return { state: 'ok' }
}

const STILL_BEING_WRITTEN = 'このファイルは書き込み中のため、削除していません。'

const STRAY = INTEGRITY_FIXTURE.findings[0]

const TOO_SOON =
  '直前の整合性チェックから間がないため、まだ実行できません。次に実行できるのは 08/08 03:15 です。'

const tooSoon = async (): Promise<SweepWrite> => ({
  state: 'refused',
  message: TOO_SOON,
})

const meta = {
  title: 'Screens/整合性チェック',
  component: IntegrityView,
  parameters: { layout: 'fullscreen' },
  args: { onRun: swept, onDelete: throwing },
  decorators: [
    (Story) => (
      <AppFrame>
        <Story />
      </AppFrame>
    ),
  ],
} satisfies Meta<typeof IntegrityView>

export default meta
type Story = StoryObj<typeof meta>

export const 食い違いあり: Story = {
  args: { result: INTEGRITY_FIXTURE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    thrownAway.length = 0

    await expect(canvas.getAllByRole('button', { name: '削除' })).toHaveLength(
      1,
    )
    await expect(
      within(
        canvas.getByRole('row', { name: /recording-4790\.m2ts/ }),
      ).queryByRole('button', { name: '削除' }),
    ).toBeNull()

    await userEvent.click(
      within(canvas.getByRole('row', { name: /recording-4812/ })).getByRole(
        'button',
        { name: '削除' },
      ),
    )

    const dialog = within(await screen.findByRole('alertdialog'))

    await expect(dialog.getByText(STRAY.path)).toBeVisible()
    await expect(thrownAway).toEqual([])

    await userEvent.click(dialog.getByRole('button', { name: '削除する' }))
    await waitFor(() => expect(thrownAway).toEqual([STRAY.id]))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  },
}

export const 削除を断られたとき: Story = {
  args: {
    result: INTEGRITY_FIXTURE,
    onDelete: async (): Promise<FindingDiscarded> => ({
      state: 'rejected',
      message: STILL_BEING_WRITTEN,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '削除' }))

    const dialog = within(await screen.findByRole('alertdialog'))

    await userEvent.click(dialog.getByRole('button', { name: '削除する' }))
    await expect(await dialog.findByText(STILL_BEING_WRITTEN)).toBeVisible()
    await expect(screen.getByRole('alertdialog')).toBeVisible()
  },
}

export const 食い違いなし: Story = { args: { result: INTEGRITY_CLEAR_FIXTURE } }

export const 保存先を読めない: Story = {
  args: {
    result: {
      ...INTEGRITY_FIXTURE,
      roots: [],
      storageProblem: '保存先の空き容量を読めませんでした。',
    },
  },
}

export const 届かないルートがある: Story = {
  args: {
    result: {
      ...INTEGRITY_FIXTURE,
      check: {
        ...INTEGRITY_FIXTURE.check!,
        rootsOutOfReach: 1,
        ledgerRowsInRootsOutOfReach: 8,
      },
    },
  },
}

export const 収まらないほどの食い違い: Story = {
  args: { result: INTEGRITY_MORE_THAN_FIT_FIXTURE },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, 'ファイル', {
      pageStays: true,
    })
  },
}

export const 狭い幅で収まらないほどの食い違い: Story = {
  args: { result: INTEGRITY_MORE_THAN_FIT_FIXTURE },
  parameters: { screen: { width: 768, height: 1024 } },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, 'ファイル', {
      pageStays: true,
    })
  },
}

export const 保存先の空きは丸めて出す: Story = {
  args: { result: INTEGRITY_FIXTURE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('118.3 GB')).toBeVisible()
    await expect(canvas.getByText('448.4 GB')).toBeVisible()
    await expect(canvas.queryByText(/\d{10,} B/)).toBeNull()
  },
}

function SweepRefusedThenAStrayThrownAway() {
  const [result, setResult] = useState(INTEGRITY_FIXTURE)

  return (
    <IntegrityView
      result={result}
      onRun={tooSoon}
      onDelete={async (findingId): Promise<FindingDiscarded> => {
        setResult((held) => ({
          ...held,
          findings: held.findings.filter((one) => one.id !== findingId),
        }))

        return { state: 'ok' }
      }}
    />
  )
}

export const 断りは片付いたあとまで残らない: Story = {
  args: { result: INTEGRITY_FIXTURE },
  render: () => <SweepRefusedThenAStrayThrownAway />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: 'いま実行する' }))
    await expect(await canvas.findByText(TOO_SOON)).toBeVisible()

    await userEvent.click(canvas.getByRole('button', { name: '削除' }))

    const dialog = within(await screen.findByRole('alertdialog'))

    await userEvent.click(dialog.getByRole('button', { name: '削除する' }))

    await waitFor(() => expect(canvas.queryByText(TOO_SOON)).toBeNull())
    await expect(
      canvas.getByText(`${STRAY.path} を削除しました。`),
    ).toBeVisible()
  },
}

export const 削除の形: Story = {
  args: { result: INTEGRITY_FIXTURE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const remove = canvas.getByRole('button', { name: '削除' })

    await expect(remove).toHaveAttribute('data-variant', 'destructive')
    await expect(remove).toHaveAttribute('data-size', 'sm')
    await expect(remove.querySelector('svg')).not.toBeNull()
    await expect(remove.textContent).toContain('削除')

    const box = remove.getBoundingClientRect()

    await expect(Math.round(box.width)).toBeGreaterThan(Math.round(box.height))

    const reasons = canvas
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[1])

    await expect(reasons.length).toBeGreaterThan(1)

    for (const reason of reasons) {
      await expect(reason.querySelector('[data-slot="badge"]')).toBeNull()
      await expect(reason.textContent?.trim()).not.toBe('')
    }
  },
}

export const 指標タイルの面: Story = {
  args: { result: INTEGRITY_FIXTURE },
  play: async ({ canvasElement }) => {
    const tiles = [
      ...canvasElement.querySelectorAll<HTMLElement>(
        '[data-slot="metric-tile"]',
      ),
    ]

    await expect(tiles.length).toBeGreaterThan(3)

    const grounds = tiles.map((tile) => getComputedStyle(tile).backgroundColor)

    await expect(new Set(grounds).size).toBe(1)

    const behind = tiles[0].parentElement?.parentElement

    if (!behind) {
      throw new Error('the tiles are not on a card')
    }

    await expect(grounds[0]).not.toBe(getComputedStyle(behind).backgroundColor)
    await expect(grounds[0]).not.toBe('rgba(0, 0, 0, 0)')
  },
}
