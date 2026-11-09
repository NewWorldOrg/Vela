import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'

import type {
  LeadMinutes,
  NotificationWrite,
  ProgrammeWatch,
} from '@/lib/notifications'
import {
  NOTIFY_START,
  NotifyBell,
  NotifyLeadChip,
  NotifyStartButton,
  STOP_NOTIFYING,
  type WatchWrite,
} from '@/components/notifications/programme-notice'
import {
  NOTIFY_ONLY,
  NotifyOnlyRow,
  type WatchActions,
} from '@/components/notifications/notify-only-row'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ListIcon, RecordIcon } from '@/components/vela/icons'
import { Toasts } from '@/components/vela/toast'
import { PHONE } from '@/stories/rows-as-cards'
import {
  DESTINATIONS,
  HOME_SLACK,
  WATCHED_DOCUMENTARY,
  WATCHED_FOOTBALL,
} from '@/stories/fixtures/notifications'

const OK: NotificationWrite = { state: 'ok' }

const changeLead = fn<WatchActions['onChangeLead']>(async () => OK)

const changeDestinations = fn<WatchActions['onChangeDestinations']>(
  async () => OK,
)

const cancel = fn<WatchActions['onCancel']>(async () => OK)

const WATCH_ACTIONS: WatchActions = {
  onChangeLead: changeLead,
  onChangeDestinations: changeDestinations,
  onCancel: cancel,
}

/** A programme's detail as far as the single notice reaches into it: the time with the chip beside it once set, and the row of actions with the button. */
function DetailWithTheNotice({ watching }: { watching: boolean }) {
  const [watch, setWatch] = useState<ProgrammeWatch | undefined>(
    watching
      ? { id: 'watch-doc', leadMinutes: 3, destinationIds: [HOME_SLACK.id] }
      : undefined,
  )

  const onWatch = async (): Promise<WatchWrite> => {
    const made: ProgrammeWatch = {
      id: 'watch-doc',
      leadMinutes: 3,
      destinationIds: [HOME_SLACK.id],
    }

    setWatch(made)

    return { state: 'ok', watch: made }
  }

  const onUnwatch = async (): Promise<NotificationWrite> => {
    setWatch(undefined)

    return OK
  }

  return (
    <div className="w-[min(calc(640rem/16),calc(100vw-32px))] rounded-xl bg-surface px-7 pt-[calc(26rem/16)] pb-6 upright:px-4">
      <p className="flex items-center gap-2 text-[calc(13rem/16)] text-ink-2">
        みなと総合1<span className="text-ink-3 tabular-nums">1</span>
      </p>
      <h2 className="mt-2.5 text-[calc(28rem/16)] leading-9 font-bold tracking-[-0.025em] upright:text-section">
        ドキュメント 灯りの仕事「夜の港、最後の便まで」
      </h2>
      <p className="mt-2 flex flex-wrap items-center gap-2.5 text-body tabular-nums">
        <span>11/09(月) 19:30 – 20:15</span>
        <span className="text-ink-2">45 分</span>
        {watch && (
          <NotifyLeadChip
            leadMinutes={watch.leadMinutes}
            onChangeLead={(lead: LeadMinutes) =>
              setWatch({ ...watch, leadMinutes: lead })
            }
          />
        )}
      </p>
      <p className="mt-3 flex gap-1.5">
        <Badge className="bg-g-doc-light text-g-doc-text">
          ドキュメンタリー
        </Badge>
        <Badge variant="info">字幕あり</Badge>
      </p>
      <p className="mt-4 text-body leading-[calc(22rem/16)] text-ink-2">
        夜の街を支える人たちの一晩を追う。港の夜間便を待つ運転手、灯りを守る整備の人、最終便のあとに始まる片づけ。
      </p>
      <div className="mt-5 flex flex-wrap gap-[calc(9rem/16)] border-t border-hair pt-[calc(18rem/16)]">
        <Button>
          <RecordIcon />
          録画予約
        </Button>
        <NotifyStartButton
          watch={watch}
          onWatch={onWatch}
          onUnwatch={onUnwatch}
        />
        <Button variant="tone">
          <ListIcon />
          シリーズで予約
        </Button>
      </div>
    </div>
  )
}

const meta = {
  title: 'Components/単発の通知',
  component: DetailWithTheNotice,
  parameters: { layout: 'centered' },
  args: { watching: false },
  decorators: [
    (Story) => (
      <Toasts>
        <Story />
      </Toasts>
    ),
  ],
} satisfies Meta<typeof DetailWithTheNotice>

export default meta
type Story = StoryObj<typeof meta>

export const 押す前: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: NOTIFY_START }),
    ).toBeVisible()
  },
}

export const 押すと知らせが出る: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: NOTIFY_START }))

    await expect(
      await screen.findByText('開始の 3 分前に通知します'),
    ).toBeVisible()
    await expect(canvas.getByText('開始 3 分前に通知')).toBeVisible()
  },
}

export const 知らせから取り消す: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: NOTIFY_START }))

    await expect(
      await screen.findByText('開始の 3 分前に通知します'),
    ).toBeVisible()
    await expect(
      canvas.getByRole('button', { name: STOP_NOTIFYING }),
    ).toBeVisible()
    await expect(canvas.getByText('開始 3 分前に通知')).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: '取り消す' }))

    await waitFor(() =>
      expect(canvas.getByRole('button', { name: NOTIFY_START })).toBeVisible(),
    )
  },
}

export const 押したあと: Story = {
  args: { watching: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('button', { name: STOP_NOTIFYING }),
    ).toBeVisible()
    await expect(
      canvas.getByRole('button', { name: /開始 3 分前に通知/ }),
    ).toHaveAttribute('aria-expanded', 'false')
  },
}

export const 札を押して分を選ぶ: Story = {
  args: { watching: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: /開始 3 分前に通知/ }),
    )

    const leads = within(await screen.findByRole('group', { name: '何分前' }))

    await expect(leads.getByRole('button', { name: '3 分前' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await userEvent.click(leads.getByRole('button', { name: '開始時' }))

    await expect(
      await canvas.findByRole('button', { name: /開始時に通知/ }),
    ).toBeVisible()
  },
}

export const 札を開いたまま: Story = {
  render: () => (
    <div className="flex h-[calc(160rem/16)] items-start pt-2">
      <NotifyLeadChip leadMinutes={3} onChangeLead={() => {}} defaultOpen />
    </div>
  ),
  play: async () => {
    await expect(
      await screen.findByRole('group', { name: '何分前' }),
    ).toBeVisible()
  },
}

/** Cells of the guide the way the bell sits in one: at the corner, the title leaving room for it. */
function GuideCells() {
  return (
    <div className="grid w-[calc(444rem/16)] grid-cols-2 gap-1">
      {[
        {
          time: '19:30',
          title: 'ドキュメント 灯りの仕事',
          line: '夜の街を支える人たちの一晩を追う。',
          tone: 'bg-g-doc-deep',
          dot: 'bg-g-doc-dot',
        },
        {
          time: '22:24',
          title: '超巡! 星屑ステーション #9',
          line: '小さな駅に流れ着いた星のかけらを、駅員見習いが届けていく。',
          tone: 'bg-g-anime-deep',
          dot: 'bg-g-anime-dot',
        },
      ].map((cell) => (
        <div
          key={cell.title}
          className={`relative h-[calc(110rem/16)] overflow-hidden rounded-sm px-2.5 pt-[calc(7rem/16)] pb-2 ${cell.tone}`}
        >
          <p className="line-clamp-2 pr-[calc(18rem/16)] text-ui leading-[calc(18rem/16)]">
            <span
              aria-hidden="true"
              className={`mr-1.5 inline-block size-[7px] rounded-full align-[1px] ${cell.dot}`}
            />
            <span className="mr-1.5 text-sub font-medium text-ink-2 tabular-nums">
              {cell.time}
            </span>
            <span className="font-semibold text-ink">{cell.title}</span>
          </p>
          <p className="mt-[3px] line-clamp-2 text-note text-ink-2">
            {cell.line}
          </p>
          <NotifyBell
            label="放送開始を通知"
            className="absolute top-[calc(7rem/16)] right-2 [&_svg]:size-[calc(15rem/16)]"
          />
        </div>
      ))}
    </div>
  )
}

export const 番組表のベル: Story = {
  render: () => <GuideCells />,
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByText('放送開始を通知'),
    ).toHaveLength(2)
  },
}

/** Two single notices among the reservation list's rows, one of them open. */
function ReservationRows({ firstOpen }: { firstOpen: boolean }) {
  const [open, setOpen] = useState<string | undefined>(
    firstOpen ? WATCHED_DOCUMENTARY.id : undefined,
  )

  return (
    <ul className="w-[min(calc(900rem/16),100vw)] px-4 upright:px-0">
      {[WATCHED_DOCUMENTARY, WATCHED_FOOTBALL].map((watch) => (
        <NotifyOnlyRow
          key={watch.id}
          watch={watch}
          destinations={DESTINATIONS}
          open={open === watch.id}
          onToggle={() => setOpen(open === watch.id ? undefined : watch.id)}
          actions={WATCH_ACTIONS}
        />
      ))}
    </ul>
  )
}

export const 予約一覧の行: Story = {
  render: () => <ReservationRows firstOpen={false} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getAllByText(NOTIFY_ONLY)).toHaveLength(2)

    changeLead.mockClear()
    changeDestinations.mockClear()

    await userEvent.click(
      canvas.getByRole('button', { name: /ドキュメント 灯りの仕事/ }),
    )

    const leads = within(canvas.getByRole('group', { name: '何分前' }))

    await userEvent.click(leads.getByRole('button', { name: '10 分前' }))

    await waitFor(() =>
      expect(changeLead).toHaveBeenCalledWith(WATCHED_DOCUMENTARY.id, 10),
    )

    const to = within(canvas.getByRole('group', { name: '送り先' }))

    await userEvent.click(
      to.getByRole('button', { name: 'Discord の通知部屋' }),
    )

    await waitFor(() =>
      expect(changeDestinations).toHaveBeenCalledWith(WATCHED_DOCUMENTARY.id, [
        'dest-slack',
        'dest-ipad',
        'dest-discord',
      ]),
    )
  },
}

export const 予約一覧の行_最後の送り先は外せない: Story = {
  render: () => <ReservationRows firstOpen={false} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: /サッカー中継/ }))

    const to = within(canvas.getByRole('group', { name: '送り先' }))

    await expect(to.getByRole('button', { name: '家の Slack' })).toBeDisabled()
  },
}

export const 予約一覧の行_取り消す: Story = {
  render: () => <ReservationRows firstOpen={false} />,
  play: async ({ canvasElement }) => {
    cancel.mockClear()

    await userEvent.click(
      within(canvasElement).getByRole('button', {
        name: 'サッカー中継 湾岸カップ 準決勝 の通知を取り消す',
      }),
    )

    await waitFor(() =>
      expect(cancel).toHaveBeenCalledWith(WATCHED_FOOTBALL.id),
    )
  },
}

export const 予約一覧の行_電話: Story = {
  parameters: { screen: PHONE, coarse: true, layout: 'fullscreen' },
  render: () => <ReservationRows firstOpen />,
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('group', { name: '何分前' }),
    ).toBeVisible()
  },
}

export const 電話の番組詳細: Story = {
  parameters: { screen: PHONE, coarse: true, layout: 'fullscreen' },
  args: { watching: true },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: STOP_NOTIFYING }),
    ).toBeVisible()
  },
}
