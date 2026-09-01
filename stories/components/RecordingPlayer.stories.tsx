import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import type { PlaybackPlan, TicketWrite } from '@/repository/videos'
import { RECORDING_DETAIL_FIXTURES } from '@/stories/fixtures/recording-details'
import { drawnFrame, SUBTITLED_FRAME } from '@/stories/fixtures/frames'
import { Player } from '@/components/recordings/player'
import type { PlaybackFault } from '@/components/recordings/playback-fault'

function detail(id: string) {
  const found = RECORDING_DETAIL_FIXTURES.find((r) => r.id === id)
  if (!found) {
    throw new Error(`fixture ${id} not found`)
  }
  return found
}

const ON_THE_FLY: PlaybackPlan = {
  standing: 'whole',
  route: 'onTheFly',
  seeking: 'byStartingAgain',
  canSeek: false,
  transcodes: true,
  showsAsAWholeRecording: true,
  mediaType: 'video/mp4',
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

/** A recording the API keeps no frames for. Every second answers 404. */
function withoutFrames() {
  return '/frames/none-of-them.jpg'
}

/** A picture nothing answers, which is how a story reaches the failure. */
function noPicture() {
  return '/pictures/there-is-none.mp4'
}

/**
 * A picture that never arrives and never fails either. A `MediaSource` nothing
 * is appended to leaves the element loading, which is the state the plate over
 * the middle is drawn in.
 */
function stalling() {
  return URL.createObjectURL(new MediaSource())
}

/** What the screen asked the API for, in the order it asked. */
const asked: string[] = []

function keeping(id: string, from: number, profile?: string) {
  asked.push(`${from}/${profile ?? '—'}`)

  return stalling()
}

/** The answer a story hands back in place of the API's. */
function answering(fault: PlaybackFault) {
  return async () => fault
}

/**
 * Put the pointer part way along the bar and leave it there, which is what
 * draws the bubble. The frame under it is asked for only once the pointer has
 * rested, so the wait is for the picture and not for the reading.
 */
function scrub(canvasElement: HTMLElement, share: number) {
  const bar = within(canvasElement).getByRole('slider', { name: '再生位置' })
  const box = bar.getBoundingClientRect()

  bar.dispatchEvent(
    new PointerEvent('pointermove', {
      clientX: box.left + box.width * share,
      clientY: box.top + box.height / 2,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      bubbles: true,
    }),
  )
}

/** The reading the bubble carries, which is a playhead and nothing else. */
const READING = /^\d+:\d\d:\d\d$/

const meta = {
  title: 'Components/録画プレイヤー',
  component: Player,
  parameters: { layout: 'fullscreen' },
  args: {
    detail: detail('1266'),
    plan: ON_THE_FLY,
    onTakeTicket: ticketed,
    frameHref: drawnFrame,
  },
  decorators: [
    (Story) => (
      <div className="bg-bg py-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Player>

export default meta
type Story = StoryObj<typeof meta>

export const 待機中: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // The poster stands where the picture will be, and the bar says what
    // choosing a position on it costs.
    await expect(
      canvas.getByText(
        'シークのたびにトランスコーダを立て直すため、シーク後に絵が出るまで数秒かかります。',
      ),
    ).toBeVisible()
    await expect(canvas.getByText('0:00:00 / 4:12:38')).toBeVisible()
  },
}

export const スクラブ: Story = {
  play: async ({ canvasElement }) => {
    scrub(canvasElement, 0.52)

    const canvas = within(canvasElement)

    await waitFor(() => expect(canvas.getByText(READING)).toBeVisible())
    await waitFor(() =>
      expect(canvasElement.querySelectorAll('img').length).toBe(1),
    )
  },
}

export const フレームを持たない録画: Story = {
  args: { frameHref: withoutFrames },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    scrub(canvasElement, 0.52)
    await waitFor(() => expect(canvas.getByText(READING)).toBeVisible())

    // The first 404 is the answer for every second of this recording, so the
    // picture is not asked for again. The reading stays; nothing is drawn as
    // broken.
    await waitFor(() =>
      expect(
        canvasElement.querySelector('img[src*="none-of-them"]'),
      ).toBeNull(),
    )

    scrub(canvasElement, 0.72)
    await waitFor(() => expect(canvas.getByText(READING)).toBeVisible())
    await expect(canvasElement.querySelectorAll('img').length).toBe(0)
  },
}

export const 尻切れ: Story = {
  args: {
    detail: detail('1247'),
    plan: {
      ...ON_THE_FLY,
      standing: 'cutShort',
      showsAsAWholeRecording: false,
    },
  },
}

export const Range直配信: Story = {
  args: {
    detail: detail('1274'),
    plan: {
      ...ON_THE_FLY,
      route: 'direct',
      seeking: 'byRange',
      canSeek: true,
      transcodes: false,
      bytes: 3_490_550_128,
    },
  },
}

/**
 * The recording was written before its packets were ever descrambled, so there
 * is no picture in it and there never will be. Nothing is offered to press:
 * both a retry and a player outside the browser would meet the same cipher.
 */
export const 再生できない_スクランブル残存: Story = {
  args: {
    detail: detail('0906'),
    startAt: 0,
    pictureHref: noPicture,
    askWhy: answering('transcode'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(canvas.getByText('スクランブルが解けていません')).toBeVisible(),
    )
    await expect(
      canvas.getByText(/時間をおいても再生できるようにはなりません/),
    ).toBeVisible()

    // The reading is read off the recording, so the API is never asked — and
    // a press that could only fail again is not drawn.
    await expect(canvas.queryByRole('button', { name: '再試行' })).toBeNull()
  },
}

/**
 * The machine is transcoding as many recordings as it is asked to. This one
 * does come back on its own, so the press that asks again is here.
 */
export const 再生できない_同時視聴の上限: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    pictureHref: noPicture,
    askWhy: answering('tooManyAtOnce'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(
        canvas.getByText('同時に再生できる本数の上限に達しています'),
      ).toBeVisible(),
    )
    await expect(canvas.getByRole('button', { name: '再試行' })).toBeEnabled()
  },
}

/** The transcoder itself would not produce a picture. */
export const 再生できない_トランスコード失敗: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    pictureHref: noPicture,
    askWhy: answering('transcode'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(canvas.getByText('再生を開始できませんでした')).toBeVisible(),
    )
    await expect(
      canvas.getByText(
        '元 TS からのトランスコードに失敗しました。時間をおいて再試行するか、外部プレイヤーで開いてください。',
      ),
    ).toBeVisible()
  },
}

/**
 * While there is no picture yet, what the player is doing is drawn on a plate
 * over the middle. Japanese recordings carry their subtitles burnt into the
 * bottom of the frame, and a thin grey line laid there is read as part of the
 * programme.
 */
export const 読み込み中: Story = {
  args: {
    detail: { ...detail('1266'), thumbnailHref: SUBTITLED_FRAME },
    startAt: 0,
    pictureHref: stalling,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('status')).toHaveTextContent(
      '絵が出るまで数秒かかります',
    )
  },
}

/**
 * The profile is an argument the API takes, so choosing one asks for the
 * picture again in it. It used to move its own pill and nothing else.
 */
export const 画質を選ぶ: Story = {
  args: { detail: detail('1266'), startAt: 0, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const quality = canvas.getByRole('group', { name: '画質' })

    // The steps are the profiles the API names, and nothing besides. 480p was
    // on the control and on no endpoint.
    await expect(
      within(quality)
        .getAllByRole('button')
        .map((one) => one.textContent),
    ).toEqual(['1080p60', '1080p30', '720p60', '720p30'])
    await expect(
      within(quality).getByRole('button', { name: '720p30' }),
    ).toHaveAttribute('aria-pressed', 'true')

    asked.length = 0
    await userEvent.click(
      within(quality).getByRole('button', { name: '1080p30' }),
    )

    // Choosing one asks for the picture again in it. The pill used to move on
    // its own over a stream nobody had asked to change.
    await waitFor(() => expect(asked).toEqual(['0/1080p30']))
    await expect(
      within(quality).getByRole('button', { name: '1080p30' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

/**
 * Two controls the API takes no argument for. They stay on the chrome and are
 * drawn switched off, with the reason beside them, rather than moving their
 * own pills over a picture that never changes.
 */
export const 効かない操作子: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const subtitles = canvas.getByRole('button', { name: '字幕' })

    await expect(subtitles).toBeDisabled()
    await expect(subtitles).toHaveAttribute('aria-pressed', 'false')

    for (const track of within(
      canvas.getByRole('group', { name: '音声' }),
    ).getAllByRole('button')) {
      await expect(track).toBeDisabled()
    }

    await expect(
      canvas.getByText(
        '字幕と音声の選択はこれから実装されます。画面に見えている字幕は映像に焼き付いたものです。',
      ),
    ).toBeVisible()
  },
}

/** The level, not merely whether. */
export const 音量: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const level = canvas.getByRole('slider', { name: '音量' })

    await expect(level).toHaveValue('100')
    await expect(canvas.getByRole('button', { name: '消音' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  },
}
