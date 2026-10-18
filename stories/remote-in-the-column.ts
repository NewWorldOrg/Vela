import { expect, within } from 'storybook/test'

import {
  DATA_BROADCAST_NAME,
  REMOTE_GROUP_GAP,
  REMOTE_GROUP_GAP_SHORT,
  SHORT_WINDOW,
} from '@/components/data-broadcast/data-broadcast-player'

/** Every key on the remote in the column, in the order it lays them out. */
export const REMOTE_KEYS = [
  '上',
  '下',
  '左',
  '右',
  '決定',
  '戻る',
  DATA_BROADCAST_NAME,
  '青',
  '赤',
  '緑',
  '黄',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '0',
]

async function near(got: number, want: number) {
  await expect(Math.abs(got - want)).toBeLessThan(0.6)
}

function headOf(remote: HTMLElement): HTMLElement {
  const head = remote
    .closest('aside')
    ?.querySelector('[data-slot="column-head"]')

  if (!(head instanceof HTMLElement)) {
    throw new Error('the column has no head over the remote')
  }

  return head
}

/** The remote stands at its own height under the column's head: its groups a fixed gap apart, the card as tall as they are, never stretched to the window. */
export async function compact(remote: HTMLElement) {
  const gap =
    window.innerHeight < SHORT_WINDOW
      ? REMOTE_GROUP_GAP_SHORT
      : REMOTE_GROUP_GAP
  const card = remote.getBoundingClientRect()
  const groups = [...remote.children].map((group) =>
    group.getBoundingClientRect(),
  )
  const head = headOf(remote).getBoundingClientRect()
  const back = within(remote)
    .getByRole('button', { name: '戻る' })
    .getBoundingClientRect()
  const blue = within(remote)
    .getByRole('button', { name: '青' })
    .getBoundingClientRect()

  await expect(Math.abs(card.top - head.bottom - 14)).toBeLessThan(1)
  await near(card.top + 21, groups[0].top)
  await near(card.bottom - 21, groups[groups.length - 1].bottom)
  await near(blue.top - back.bottom, gap)

  for (const [above, below] of groups
    .slice(1)
    .map((group, nth) => [groups[nth], group])) {
    await near(below.top - above.bottom, gap)
  }
}
