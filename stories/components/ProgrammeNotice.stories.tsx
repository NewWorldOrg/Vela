import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'

import type {
  NotificationWrite,
  Noticing,
  ProgrammeWatch,
  WatchDraft,
  WatchOffer,
  WatchWrite,
} from '@/lib/notifications'
import {
  NOTIFY_START,
  STOP_NOTIFYING,
} from '@/components/notifications/programme-notice'
import { NotifyBell } from '@/components/notifications/notify-bell'
import { NotifyLeadChip } from '@/components/notifications/notify-lead-chip'
import { NotifyStartButton } from '@/components/notifications/notify-start-button'
import {
  NOTIFY_ONLY,
  NotifyOnlyRow,
} from '@/components/notifications/notify-only-row'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ListIcon, RecordIcon } from '@/components/vela/icons'
import { Toasts } from '@/components/vela/toast'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { PHONE } from '@/stories/rows-as-cards'
import {
  DESTINATIONS,
  WATCHED_DOCUMENTARY,
  WATCHED_FOOTBALL,
} from '@/stories/fixtures/notifications'

const OK: NotificationWrite = { state: 'ok' }

const PROGRAMME = '40001-4001-52001'

const OFFER: WatchOffer = {
  leadMinutes: 3,
  destinations: DESTINATIONS.map(({ id, name }) => ({ id, name })),
}

const ALREADY_SET =
  'この番組の通知はすでに設定してあるか、もう送ったため、設定できませんでした。'

const asked = fn<(programmeId: string, draft: WatchDraft) => void>()

const cancel = fn<(id: string) => Promise<NotificationWrite>>(async () => OK)

/** A programme's detail as far as the single notice reaches into it: the time with the chip beside it once set, and the row of actions with the button. */
function DetailWithTheNotice({
  watching,
  nowhere = false,
  refused = false,
}: {
  watching: boolean
  /** No destination is on, so there is nowhere to send a notice. */
  nowhere?: boolean
  /** The notice is turned away when asked. */
  refused?: boolean
}) {
  const [watch, setWatch] = useState<ProgrammeWatch | undefined>(
    watching ? { id: 'watch-doc', leadMinutes: 3 } : undefined,
  )

  const noticing: Noticing = {
    offer: nowhere ? undefined : OFFER,
    onWatch: async (programmeId, draft): Promise<WatchWrite> => {
      asked(programmeId, draft)

      if (refused) {
        return { state: 'rejected', message: ALREADY_SET }
      }

      const made: ProgrammeWatch = {
        id: 'watch-doc',
        leadMinutes: draft.leadMinutes,
      }

      setWatch(made)

      return { state: 'ok', watch: made }
    },
    onUnwatch: async () => {
      setWatch(undefined)

      return OK
    },
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
        {watch && <NotifyLeadChip leadMinutes={watch.leadMinutes} />}
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
          programmeId={PROGRAMME}
          watch={watch}
          noticing={noticing}
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
  title: 'Components/番組と局/単発の通知',
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

/** Two single notices the way the list of reservations shows them among its rows. */
function ReservationRows() {
  return (
    <ul className="w-[min(calc(900rem/16),100vw)] px-4 upright:px-0">
      {[WATCHED_DOCUMENTARY, WATCHED_FOOTBALL].map((watch, nth) => (
        <NotifyOnlyRow
          key={watch.id}
          watch={watch}
          nth={nth}
          onCancel={cancel}
        />
      ))}
    </ul>
  )
}

async function theAskForm() {
  return within(await screen.findByRole('dialog', { name: NOTIFY_START }))
}

export const 通常: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: NOTIFY_START }),
    ).toBeVisible()
  },
}

export const 押したあと: Story = {
  args: { watching: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('button', { name: STOP_NOTIFYING }),
    ).toBeVisible()
    await expect(canvas.getByText('開始 3 分前に通知')).toBeVisible()
  },
}

export const 送り先が無いとボタンは出ない: Story = {
  args: { nowhere: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('button', { name: '録画予約' })).toBeVisible()
    await expect(
      canvas.queryByRole('button', { name: NOTIFY_START }),
    ).not.toBeInTheDocument()
  },
}

export const 押すと分と送り先を選ぶ面が開く: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: NOTIFY_START }),
    )

    const form = await theAskForm()
    const leads = within(form.getByRole('group', { name: '何分前' }))

    await expect(leads.getByRole('button', { name: '3 分前' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    const to = within(form.getByRole('group', { name: '送り先' }))

    for (const destination of DESTINATIONS) {
      await expect(
        to.getByRole('button', { name: destination.name }),
      ).toHaveAttribute('aria-pressed', 'true')
    }
  },
}

export const 送り先を全部外すと頼めない: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: NOTIFY_START }),
    )

    const form = await theAskForm()
    const to = within(form.getByRole('group', { name: '送り先' }))

    for (const destination of DESTINATIONS) {
      await userEvent.click(to.getByRole('button', { name: destination.name }))
    }

    await expect(form.getByRole('button', { name: '通知する' })).toBeDisabled()
  },
}

export const 選んだ分と送り先で頼む: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    asked.mockClear()

    await userEvent.click(canvas.getByRole('button', { name: NOTIFY_START }))

    const form = await theAskForm()

    await userEvent.click(
      within(form.getByRole('group', { name: '何分前' })).getByRole('button', {
        name: '10 分前',
      }),
    )
    await userEvent.click(
      within(form.getByRole('group', { name: '送り先' })).getByRole('button', {
        name: 'Discord の通知部屋',
      }),
    )
    await userEvent.click(form.getByRole('button', { name: '通知する' }))

    await waitFor(() =>
      expect(asked).toHaveBeenCalledWith(PROGRAMME, {
        leadMinutes: 10,
        destinations: ['dest-slack', 'dest-ipad'],
      }),
    )
    await expect(
      await screen.findByText('開始の 10 分前に通知します'),
    ).toBeVisible()
    await expect(canvas.getByText('開始 10 分前に通知')).toBeVisible()
    await expect(
      canvas.getByRole('button', { name: STOP_NOTIFYING }),
    ).toBeVisible()
  },
}

export const 知らせから取り消す: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: NOTIFY_START }))
    await userEvent.click(
      (await theAskForm()).getByRole('button', { name: '通知する' }),
    )

    await expect(
      await screen.findByText('開始の 3 分前に通知します'),
    ).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: '取り消す' }))

    await waitFor(() =>
      expect(canvas.getByRole('button', { name: NOTIFY_START })).toBeVisible(),
    )
    await expect(
      canvas.queryByText('開始 3 分前に通知'),
    ).not.toBeInTheDocument()
  },
}

export const 断られると面の中に理由が出る: Story = {
  args: { refused: true },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: NOTIFY_START }),
    )

    const form = await theAskForm()

    await userEvent.click(form.getByRole('button', { name: '通知する' }))

    await expect(await form.findByText(ALREADY_SET)).toBeVisible()
    await expect(form.getByRole('button', { name: '通知する' })).toBeEnabled()
  },
}

export const 取り消すボタンで取り消す: Story = {
  args: { watching: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: STOP_NOTIFYING }))

    await waitFor(() =>
      expect(canvas.getByRole('button', { name: NOTIFY_START })).toBeVisible(),
    )
  },
}

export const 番組表のベル: Story = {
  render: () => <GuideCells />,
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByText('放送開始を通知'),
    ).toHaveLength(2)
  },
}

export const 予約一覧の行: Story = {
  render: () => <ReservationRows />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await afterTheArrival(canvasElement)
    await expect(canvas.getAllByText(NOTIFY_ONLY)).toHaveLength(2)
    await expect(
      canvas.getByText('みなと総合1 · 3 分前 · 家の Slack・iPad の Safari'),
    ).toBeVisible()
    await expect(
      canvas.getByText('第一テレビ · 5 分前 · 家の Slack'),
    ).toBeVisible()
  },
}

export const 予約一覧の行_取り消す: Story = {
  render: () => <ReservationRows />,
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
    await expect(
      await screen.findByText(
        '通知を取り消しました サッカー中継 湾岸カップ 準決勝',
      ),
    ).toBeVisible()
  },
}

export const 予約一覧の行_電話: Story = {
  parameters: { screen: PHONE, coarse: true, layout: 'fullscreen' },
  render: () => <ReservationRows />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText(NOTIFY_ONLY)).toHaveLength(
      2,
    )
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

export const 電話で頼む面: Story = {
  parameters: { screen: PHONE, coarse: true, layout: 'fullscreen' },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: NOTIFY_START }),
    )

    await expect(
      (await theAskForm()).getByRole('button', { name: '通知する' }),
    ).toBeEnabled()
  },
}
