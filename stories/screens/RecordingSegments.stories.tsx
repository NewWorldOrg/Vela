import type { Meta, StoryObj } from '@storybook/nextjs'
import {
  expect,
  fireEvent,
  screen,
  userEvent,
  waitFor,
  within,
} from 'storybook/test'

import type {
  PlaybackChapter,
  PlaybackPlan,
  PlaybackRead,
} from '@/repository/videos'
import type {
  RecordingDiscarded,
  ThumbnailWrite,
} from '@/repository/recordings'
import type {
  AnsweredSegment,
  RecordingSegment,
} from '@/repository/recording-segments'
import type { TicketWrite } from '@/repository/tickets'
import type { EncodeWrite } from '@/repository/encode'
import { ENCODE_CHOICES } from '@/repository/encode.fixtures'
import {
  ANSWERED_SEGMENTS,
  CONFIRMED_SEGMENTS,
  DETECTED_SEGMENTS,
  NO_SEGMENTS,
  NOTHING_FOUND_SEGMENTS,
  UNKNOWN_KIND_SEGMENTS,
} from '@/repository/recording-segments.fixtures'
import { RecordingDetailView } from '@/components/recordings/recording-detail-page'
import type { FeedRecording } from '@/components/recordings/recording-feed'
import { SKIP_THE_BREAK } from '@/components/recordings/player-skip-break'
import {
  answeredAsSent,
  answers,
  refusedForOverlapping,
  skipNoted,
  skips,
  withdrawals,
  withdrawnToTheDetection,
} from '@/stories/answered-segments'
import { RECORDING_DETAIL_FIXTURES } from '@/stories/fixtures/recording-details'
import { drawnFrame } from '@/stories/fixtures/frames'
import { inTheApp } from '@/stories/frames'
import { afterTheArrival } from '@/stories/after-the-arrival'

const HEADING = 'CM・OP・ED'

const BREAK_BAND = 'CM と判定した区間'

function detail(id: string) {
  const found = RECORDING_DETAIL_FIXTURES.find((r) => r.id === id)

  if (!found) {
    throw new Error(`fixture ${id} not found`)
  }

  return found
}

function chaptersOf(
  segments: readonly RecordingSegment[],
  headSkipSec = 0,
): PlaybackChapter[] {
  return segments.map((one, nth) => ({
    startsAtSec: Math.max(0, one.startsAtSec - headSkipSec),
    endsAtSec: one.endsAtSec - headSkipSec,
    kind: one.kind === 'break' ? 'break' : 'programme',
    skippable: one.kind === 'break' && nth < segments.length - 1,
  }))
}

const ON_THE_FLY: PlaybackPlan = {
  standing: 'whole',
  route: 'onTheFly',
  source: 'recording',
  seeking: 'byStartingAgain',
  canSeek: false,
  transcodes: true,
  showsAsAWholeRecording: true,
  mediaType: 'video/mp4',
  sounds: ['main'],
  chapters: [],
  captions: 'none',
}

function planned(over: Partial<PlaybackPlan> = {}): PlaybackRead {
  return { state: 'planned', plan: { ...ON_THE_FLY, ...over } }
}

const MARKED = planned({ chapters: chaptersOf(DETECTED_SEGMENTS.segments) })

const HEAD_SKIP = 14.5

const ARTEFACT_MARKED = planned({
  route: 'direct',
  source: 'artefact',
  seeking: 'byRange',
  canSeek: true,
  transcodes: false,
  chapters: chaptersOf(DETECTED_SEGMENTS.segments, HEAD_SKIP),
})

function stalling() {
  return URL.createObjectURL(new MediaSource())
}

const handedAsItIs: FeedRecording = (video, href) => {
  video.src = href

  return { close: () => {} }
}

async function ticketed(): Promise<TicketWrite> {
  return {
    state: 'ok',
    ticket: {
      inTheClear: 'a-ticket-that-lapses',
      lapsesAt: '2026-08-11T00:00:30Z',
    },
  }
}

async function remade(): Promise<ThumbnailWrite> {
  return { state: 'ok', remake: 'drawn' }
}

async function deleted(): Promise<RecordingDiscarded> {
  return { state: 'ok', filesRemoved: 1 }
}

async function done(): Promise<EncodeWrite> {
  return { state: 'ok' }
}

/** The plan asked for again after an answer: its chapters are the stretches last answered, or the detection's before any. */
async function plannedFromTheAnswer(): Promise<PlaybackRead> {
  const last = answers.at(-1)

  return planned({
    chapters: chaptersOf(last ? last.segments : DETECTED_SEGMENTS.segments),
  })
}

function forgetWhatWasSent() {
  answers.length = 0
  withdrawals.length = 0
  skips.length = 0
}

function thePanel(canvasElement: HTMLElement) {
  const panel = canvasElement.querySelector<HTMLElement>(
    '[data-slot="recording-segments"]',
  )

  if (!panel) {
    throw new Error('the CM, OP and ED panel is not on the page')
  }

  return within(panel)
}

async function unfold(canvasElement: HTMLElement) {
  await userEvent.click(
    within(canvasElement).getByRole('button', { name: HEADING }),
  )
  await afterTheArrival(canvasElement)

  return thePanel(canvasElement)
}

async function change(canvasElement: HTMLElement) {
  const panel = await unfold(canvasElement)

  await userEvent.click(panel.getByRole('button', { name: '変更' }))
  await afterTheArrival(canvasElement)

  return panel
}

function rowsOf(panel: ReturnType<typeof within>) {
  return panel.getAllByRole('row').slice(1)
}

function bandOf(canvasElement: HTMLElement) {
  const band = canvasElement.querySelector<HTMLElement>(
    '[data-slot="segments-band"]',
  )

  if (!band) {
    throw new Error('the strip of the whole recording is not drawn')
  }

  return band
}

function dragTo(canvasElement: HTMLElement, grip: HTMLElement, second: number) {
  const box = bandOf(canvasElement).getBoundingClientRect()
  const clientX = box.left + (box.width * second) / DETECTED_SEGMENTS.lengthSec
  const clientY = box.top + box.height / 2
  const pointer = { bubbles: true, pointerId: 1, isPrimary: true, clientY }

  grip.dispatchEvent(
    new PointerEvent('pointerdown', { ...pointer, clientX: clientX - 30 }),
  )
  window.dispatchEvent(new PointerEvent('pointermove', { ...pointer, clientX }))
  window.dispatchEvent(new PointerEvent('pointerup', { ...pointer, clientX }))
}

async function choose(
  canvasElement: HTMLElement,
  kind: HTMLElement,
  named: string,
) {
  await userEvent.click(kind)
  await userEvent.click(await screen.findByRole('option', { name: named }))
  await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
  await afterTheArrival(canvasElement)
}

function sentLast(): AnsweredSegment[] {
  const last = answers.at(-1)

  if (!last) {
    throw new Error('no answer was sent')
  }

  return last.segments
}

function marksOn(canvasElement: HTMLElement, named: string) {
  return canvasElement.querySelectorAll(`[title="${named}"]`).length
}

const meta = {
  title: 'Screens/録画詳細/CM・OP・ED',
  component: RecordingDetailView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/recordings/1274' },
    },
    layout: 'fullscreen',
  },
  args: {
    detail: detail('1274'),
    playback: planned(),
    segments: DETECTED_SEGMENTS,
    unaskedProfile: '1080p60',
    onRemakeThumbnail: remade,
    onDelete: deleted,
    onTakeTicket: ticketed,
    onAskForTheSound: plannedFromTheAnswer,
    onKeepPosition: async () => ({ state: 'ok' as const }),
    onQueueEncode: done,
    onCallOffEncode: done,
    encodeChoices: ENCODE_CHOICES,
    onAnswerSegments: answeredAsSent,
    onWithdrawSegmentAnswer: withdrawnToTheDetection,
    onNoteSkip: skipNoted,
    pictureHref: stalling,
    frameHref: drawnFrame,
    feedRecording: handedAsItIs,
  },
  decorators: [inTheApp],
  beforeEach: forgetWhatWasSent,
} satisfies Meta<typeof RecordingDetailView>

export default meta
type Story = StoryObj<typeof meta>

export const 畳んだまま: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const heading = canvas.getByRole('button', { name: HEADING })

    await expect(heading).toHaveAttribute('aria-expanded', 'false')
    await expect(canvas.queryByRole('table')).toBeNull()
    await expect(canvas.queryByText('確認済み')).toBeNull()
    await expect(canvas.queryByRole('button', { name: '変更' })).toBeNull()

    const record = canvasElement.querySelector('details')
    const panel = canvasElement.querySelector(
      '[data-slot="recording-segments"]',
    )

    await expect(
      panel !== null &&
        record !== null &&
        Boolean(
          panel.compareDocumentPosition(record) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ),
    ).toBe(true)
  },
}

export const 自動で判定した録画を開いた: Story = {
  play: async ({ canvasElement }) => {
    const panel = await unfold(canvasElement)

    await expect(
      within(canvasElement).getByRole('button', { name: HEADING }),
    ).toHaveAttribute('aria-expanded', 'true')
    await expect(bandOf(canvasElement)).toBeVisible()
    await expect(
      canvasElement.querySelectorAll('[data-slot="segments-break"]'),
    ).toHaveLength(2)
    await expect(
      canvasElement.querySelector('[data-slot="segments-playhead"]'),
    ).not.toBeNull()

    const rows = rowsOf(panel)

    await expect(rows).toHaveLength(5)
    await expect(within(rows[1]).getByText('CM')).toBeVisible()
    await expect(within(rows[1]).getByText('0:06:52')).toBeVisible()
    await expect(within(rows[1]).getByText('0:08:22')).toBeVisible()
    await expect(within(rows[1]).getByText('0:01:30')).toBeVisible()
    await expect(within(rows[4]).getByText('0:30:04')).toBeVisible()

    await expect(panel.getByRole('button', { name: '変更' })).toBeEnabled()
    await expect(
      panel.getByRole('button', { name: '確認済みにする' }),
    ).toBeEnabled()
    await expect(
      panel.queryByRole('button', { name: '自動の判定に戻す' }),
    ).toBeNull()
    await expect(panel.queryByRole('slider')).toBeNull()
  },
}

export const 帯と行を押すとその位置へ飛ぶ: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const panel = await unfold(canvasElement)

    await userEvent.click(rowsOf(panel)[1])
    await waitFor(() => expect(canvas.getByText('6:52 / 30:04')).toBeVisible())

    const box = bandOf(canvasElement).getBoundingClientRect()

    fireEvent.click(bandOf(canvasElement), {
      clientX: box.left + box.width / 2,
      clientY: box.top + box.height / 2,
    })
    await waitFor(() => expect(canvas.getByText('15:02 / 30:04')).toBeVisible())

    rowsOf(panel)[3].focus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(canvas.getByText('19:35 / 30:04')).toBeVisible())
  },
}

export const 変更の途中: Story = {
  play: async ({ canvasElement }) => {
    const panel = await change(canvasElement)

    await expect(panel.getAllByRole('slider', { name: '境目' })).toHaveLength(4)
    await expect(panel.getAllByRole('combobox', { name: '種類' })).toHaveLength(
      5,
    )
    await expect(panel.getAllByRole('textbox', { name: '開始' })).toHaveLength(
      4,
    )
    await expect(panel.getAllByRole('button', { name: '削除' })).toHaveLength(5)
    await expect(
      panel.getByRole('button', { name: '現在位置で分割' }),
    ).toBeVisible()
    await expect(panel.getByRole('button', { name: '保存する' })).toBeDisabled()
    await expect(panel.queryByRole('button', { name: '変更' })).toBeNull()
    await expect(
      panel.queryByRole('button', { name: '確認済みにする' }),
    ).toBeNull()

    await userEvent.click(panel.getByRole('button', { name: 'キャンセル' }))

    await expect(panel.queryByRole('slider')).toBeNull()
    await expect(panel.getByRole('button', { name: '変更' })).toBeVisible()
    await expect(answers).toEqual([])
  },
}

export const 変更の途中_ダーク: Story = {
  globals: { theme: 'dark' },
  play: async ({ canvasElement }) => {
    const panel = await change(canvasElement)

    await expect(panel.getAllByRole('slider', { name: '境目' })).toHaveLength(4)
  },
}

export const 境目を動かすと候補に吸い付く: Story = {
  play: async ({ canvasElement }) => {
    const panel = await change(canvasElement)
    const grips = panel.getAllByRole('slider', { name: '境目' })

    dragTo(canvasElement, grips[0], 412.9)

    await waitFor(() =>
      expect(grips[0]).toHaveAttribute('aria-valuetext', '0:06:52.31'),
    )
    await expect(
      panel.getAllByRole('textbox', { name: '開始' })[0],
    ).toHaveValue('0:06:52.31')

    dragTo(canvasElement, grips[2], 1200)

    await waitFor(() =>
      expect(
        Math.abs(Number(grips[2].getAttribute('aria-valuenow')) - 1200),
      ).toBeLessThan(0.2),
    )

    const field = panel.getAllByRole('textbox', { name: '開始' })[3]

    await userEvent.clear(field)
    await userEvent.type(field, '0:21:35{Enter}')
    await expect(field).toHaveValue('0:21:35.6')

    await userEvent.clear(field)
    await userEvent.type(field, '0:21:50{Enter}')
    await expect(field).toHaveValue('0:21:50')

    await userEvent.clear(field)
    await userEvent.type(field, 'あいう')
    await userEvent.tab()
    await expect(field).toHaveValue('0:21:50')

    grips[0].focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(grips[0]).toHaveAttribute('aria-valuetext', '0:06:52.41')

    await userEvent.click(panel.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(answers).toHaveLength(1))
    await expect(answers[0].confirmed).toBe(false)
    await expect(sentLast()[1].startsAtSec).toBe(412.41)
    await expect(sentLast()[0].endsAtSec).toBe(412.41)
    await expect(sentLast()[4].startsAtSec).toBe(1310)
    await expect(panel.queryByRole('slider')).toBeNull()
  },
}

export const 現在位置で分割: Story = {
  args: { startAt: 900 },
  play: async ({ canvasElement }) => {
    const panel = await change(canvasElement)

    await userEvent.click(panel.getByRole('button', { name: '現在位置で分割' }))
    await afterTheArrival(canvasElement)

    const rows = rowsOf(panel)

    await expect(rows).toHaveLength(6)
    await expect(within(rows[2]).getByText('0:15:00')).toBeVisible()
    await expect(within(rows[3]).getByRole('textbox')).toHaveValue('0:15:00')
    await expect(
      panel.getByRole('button', { name: '現在位置で分割' }),
    ).toBeDisabled()

    await userEvent.click(panel.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(answers).toHaveLength(1))
    await expect(sentLast()).toHaveLength(6)
    await expect(sentLast()[2]).toEqual({
      startsAtSec: 502.3,
      endsAtSec: 900,
      kind: 'programme',
    })
    await expect(sentLast()[3].kind).toBe('programme')
  },
}

export const 種類を変える: Story = {
  play: async ({ canvasElement }) => {
    const panel = await change(canvasElement)
    const kinds = panel.getAllByRole('combobox', { name: '種類' })

    await choose(canvasElement, kinds[1], '本編')

    await expect(kinds[1]).toHaveTextContent('本編')
    await expect(panel.getByRole('button', { name: '保存する' })).toBeEnabled()

    await userEvent.click(panel.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(answers).toHaveLength(1))
    await expect(sentLast().map((one) => one.kind)).toEqual([
      'programme',
      'programme',
      'programme',
      'break',
      'programme',
    ])
  },
}

export const 区間を削除すると前の区間に含める: Story = {
  play: async ({ canvasElement }) => {
    const panel = await change(canvasElement)

    await userEvent.click(panel.getAllByRole('button', { name: '削除' })[1])
    await afterTheArrival(canvasElement)

    const rows = rowsOf(panel)

    await expect(rows).toHaveLength(4)
    await expect(within(rows[0]).getAllByRole('cell')[2]).toHaveTextContent(
      '0:08:22',
    )

    await userEvent.click(panel.getAllByRole('button', { name: '削除' })[0])

    await expect(rowsOf(panel)).toHaveLength(3)
    await expect(
      within(rowsOf(panel)[0]).getByRole('combobox', { name: '種類' }),
    ).toHaveTextContent('本編')
  },
}

export const 一つだけの区間は削除できない: Story = {
  args: { segments: NOTHING_FOUND_SEGMENTS },
  play: async ({ canvasElement }) => {
    const panel = await change(canvasElement)

    await expect(rowsOf(panel)).toHaveLength(1)
    await expect(panel.queryByRole('button', { name: '削除' })).toBeNull()
    await expect(panel.queryByRole('slider')).toBeNull()
  },
}

export const 確認済み: Story = {
  args: { segments: CONFIRMED_SEGMENTS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('確認済み')).toBeVisible()

    const panel = await unfold(canvasElement)

    await expect(
      panel.getByRole('button', { name: '確認を取り消し' }),
    ).toBeVisible()
    await expect(
      panel.getByRole('button', { name: '自動の判定に戻す' }),
    ).toBeVisible()

    await userEvent.click(panel.getByRole('button', { name: '確認を取り消し' }))

    await waitFor(() => expect(answers).toHaveLength(1))
    await expect(answers[0].confirmed).toBe(false)
    await expect(answers[0].segments).toEqual(CONFIRMED_SEGMENTS.segments)
    await waitFor(() => expect(canvas.queryByText('確認済み')).toBeNull())
  },
}

export const 確認済みにする: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const panel = await unfold(canvasElement)

    await userEvent.click(panel.getByRole('button', { name: '確認済みにする' }))

    await waitFor(() => expect(answers).toHaveLength(1))
    await expect(answers[0].confirmed).toBe(true)
    await expect(answers[0].segments).toEqual(DETECTED_SEGMENTS.segments)
    await waitFor(() => expect(canvas.getByText('確認済み')).toBeVisible())
    await expect(
      panel.getByRole('button', { name: '確認を取り消し' }),
    ).toBeVisible()
    await expect(
      panel.getByRole('button', { name: '自動の判定に戻す' }),
    ).toBeVisible()
  },
}

export const 保存の断り: Story = {
  args: { onAnswerSegments: refusedForOverlapping },
  play: async ({ canvasElement }) => {
    const panel = await change(canvasElement)

    await userEvent.click(panel.getAllByRole('button', { name: '削除' })[1])
    await userEvent.click(panel.getByRole('button', { name: '保存する' }))

    await expect(
      await panel.findByText('区間が重なっているため、保存できませんでした。'),
    ).toBeVisible()
    await expect(panel.getByRole('button', { name: '保存する' })).toBeEnabled()
    await expect(rowsOf(panel)).toHaveLength(4)

    await userEvent.click(panel.getByRole('button', { name: 'キャンセル' }))

    await expect(
      panel.queryByText('区間が重なっているため、保存できませんでした。'),
    ).toBeNull()
    await expect(rowsOf(panel)).toHaveLength(5)
  },
}

export const 人が直した録画は自動の判定に戻せる: Story = {
  args: { segments: ANSWERED_SEGMENTS },
  play: async ({ canvasElement }) => {
    const panel = await unfold(canvasElement)

    await expect(within(rowsOf(panel)[3]).getByText('0:21:35')).toBeVisible()
    await expect(
      panel.getByRole('button', { name: '確認済みにする' }),
    ).toBeVisible()

    await userEvent.click(
      panel.getByRole('button', { name: '自動の判定に戻す' }),
    )

    const dialog = within(await screen.findByRole('alertdialog'))

    await expect(
      dialog.getByText('この録画の手直しを取り消します'),
    ).toBeVisible()
    await expect(
      dialog.getByText('自動で判定した位置に戻ります。元に戻せません。'),
    ).toBeVisible()
    await expect(withdrawals).toEqual([])

    await userEvent.click(dialog.getByRole('button', { name: '取り消す' }))

    await waitFor(() => expect(withdrawals).toEqual(['1274']))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    await afterTheArrival(canvasElement)
    await expect(within(rowsOf(panel)[3]).getByText('0:21:05')).toBeVisible()
    await expect(
      panel.queryByRole('button', { name: '自動の判定に戻す' }),
    ).toBeNull()
  },
}

export const 区間の無い録画には出さない: Story = {
  args: { segments: NO_SEGMENTS },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole('button', { name: HEADING }),
    ).toBeNull()
  },
}

export const 録画中の録画には出さない: Story = {
  args: {
    detail: detail('1291'),
    playback: { state: 'refused', refusal: 'stillRecording' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('録画中は再生できません')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: HEADING })).toBeNull()
  },
}

export const 再生できない録画では帯も行も飛ばない: Story = {
  args: { playback: { state: 'refused', refusal: 'outOfReach' } },
  play: async ({ canvasElement }) => {
    const panel = await unfold(canvasElement)

    await expect(rowsOf(panel)[1]).not.toHaveAttribute('data-pressable-row')
    await expect(
      canvasElement.querySelector('[data-slot="segments-playhead"]'),
    ).toBeNull()

    await userEvent.click(panel.getByRole('button', { name: '変更' }))

    await expect(
      panel.queryByRole('button', { name: '現在位置で分割' }),
    ).toBeNull()
    await expect(panel.getAllByRole('slider', { name: '境目' })).toHaveLength(4)
  },
}

export const この版が知らない種類の区間は直せない: Story = {
  args: { segments: UNKNOWN_KIND_SEGMENTS },
  play: async ({ canvasElement }) => {
    const panel = await unfold(canvasElement)

    await expect(rowsOf(panel)).toHaveLength(6)
    await expect(within(rowsOf(panel)[0]).getByText('—')).toBeVisible()
    await expect(panel.queryByRole('button', { name: '変更' })).toBeNull()
    await expect(
      panel.queryByRole('button', { name: '確認済みにする' }),
    ).toBeNull()
  },
}

export const 保存するとプレイヤーの印も直る: Story = {
  args: { playback: MARKED },
  play: async ({ canvasElement }) => {
    await expect(marksOn(canvasElement, BREAK_BAND)).toBe(2)

    const panel = await change(canvasElement)
    const kinds = panel.getAllByRole('combobox', { name: '種類' })

    await choose(canvasElement, kinds[3], '本編')
    await userEvent.click(panel.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(marksOn(canvasElement, BREAK_BAND)).toBe(1))
  },
}

export const CMを飛ばすと操作を送る: Story = {
  args: { playback: MARKED, startAt: 420 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: SKIP_THE_BREAK }))

    await waitFor(() => expect(canvas.getByText('8:22 / 30:04')).toBeVisible())
    await expect(skips).toEqual([
      {
        event: 'skipped',
        kind: 'break',
        fromSec: 420,
        toSec: 502.3,
        modelVersion: 3,
      },
    ])
  },
}

export const CMを飛ばすを閉じると操作を送る: Story = {
  args: { playback: MARKED, startAt: 420 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '閉じる' }))

    await expect(
      canvas.queryByRole('button', { name: SKIP_THE_BREAK }),
    ).toBeNull()
    await expect(skips).toEqual([
      {
        event: 'dismissed',
        kind: 'break',
        fromSec: 420,
        toSec: 502.3,
        modelVersion: 3,
      },
    ])
  },
}

export const 人が直した録画で飛ばすとモデルのバージョンを送らない: Story = {
  args: {
    segments: ANSWERED_SEGMENTS,
    playback: planned({ chapters: chaptersOf(ANSWERED_SEGMENTS.segments) }),
    startAt: 420,
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: SKIP_THE_BREAK }),
    )

    await waitFor(() => expect(skips).toHaveLength(1))
    await expect(skips[0].modelVersion).toBeUndefined()
  },
}

export const エンコード済みの再生でも録画の中の時刻で扱う: Story = {
  args: {
    playback: ARTEFACT_MARKED,
    artefactHeadSkipSec: HEAD_SKIP,
    startAt: 405.5,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: SKIP_THE_BREAK }))

    await waitFor(() => expect(skips).toHaveLength(1))
    await expect(skips[0]).toEqual({
      event: 'skipped',
      kind: 'break',
      fromSec: 420,
      toSec: 502.3,
      modelVersion: 3,
    })

    const panel = await unfold(canvasElement)

    await userEvent.click(rowsOf(panel)[3])
    await waitFor(() => expect(canvas.getByText('19:21 / 30:04')).toBeVisible())
  },
}
