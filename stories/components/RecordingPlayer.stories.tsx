import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type { PlaybackPlan, TicketWrite } from '@/repository/videos'
import { RECORDING_DETAIL_FIXTURES } from '@/stories/fixtures/recording-details'
import { drawnFrame, SUBTITLED_FRAME } from '@/stories/fixtures/frames'
import { Player } from '@/components/recordings/player'
import { ScreenMain } from '@/components/vela/app-shell'
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
    // The player is read inside the column a screen is given, and the column
    // is now wider than the picture may be. Standing it in the shared step
    // rather than loose in the canvas is what makes the black either side of
    // the picture the same black the screen draws.
    (Story) => (
      <div className="bg-bg py-6">
        <ScreenMain>
          <Story />
        </ScreenMain>
      </div>
    ),
  ],
} satisfies Meta<typeof Player>

export default meta
type Story = StoryObj<typeof meta>

export const 待機中: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // The poster stands where the picture will be, and the bar reads the
    // position. Nothing under it explains what choosing one costs.
    await expect(canvas.getByText('0:00:00 / 4:12:38')).toBeVisible()
    await expect(canvas.queryByText(/トランスコーダ/)).toBeNull()
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
      canvas.getByText('元 TS からのトランスコードに失敗しました。'),
    ).toBeVisible()
  },
}

/**
 * While there is no picture yet, the spinner is drawn on a plate over the
 * middle, and nothing is written beside it: how long the picture takes is not
 * something the player says. Japanese recordings carry their subtitles burnt
 * into the bottom of the frame, and anything laid there in thin grey is read as
 * part of the programme.
 */
export const 読み込み中: Story = {
  args: {
    detail: { ...detail('1266'), thumbnailHref: SUBTITLED_FRAME },
    startAt: 0,
    pictureHref: stalling,
  },
  play: async ({ canvasElement }) => {
    const plate = within(canvasElement).getByRole('status')

    await expect(plate).toBeVisible()
    await expect(plate.querySelector('[data-slot="spinner"]')).not.toBeNull()
    await expect(plate.textContent).toBe('')
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

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const quality = await screen.findByRole('group', { name: '画質' })

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
 * Two controls the API takes no argument for. They are kept and drawn switched
 * off, with the reason beside them, rather than moving their own pills over a
 * picture that never changes. The one on the bar is the toggle a player is
 * reached for; the tracks, and the reason for both, are in the gear.
 */
export const 効かない操作子: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const subtitles = canvas.getByRole('button', { name: '字幕' })

    await expect(subtitles).toBeDisabled()
    await expect(subtitles).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    for (const track of within(
      await screen.findByRole('group', { name: '音声' }),
    ).getAllByRole('button')) {
      await expect(track).toBeDisabled()
    }

    // Once, beside the two rows it answers for, and nowhere else on the page.
    await expect(
      screen.getAllByText('字幕と音声の選択はこれから実装されます'),
    ).toHaveLength(1)
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

/**
 * Wider than the step the screen is read at, and tall enough that the height
 * the window allows is more than the step — so what stops the picture growing
 * is the column and not the window.
 */
const A_WIDE_WINDOW = { width: 1680, height: 1200 }

/** Wide, but too short for the column: here the window stops the picture. */
const A_SHORT_WINDOW = { width: 1680, height: 700 }

/** The face, the picture on it, and the bar over both. */
function faceOf(canvasElement: HTMLElement) {
  const bar = canvasElement.querySelector(
    '[data-slot="player-chrome"]',
  ) as HTMLElement

  return {
    face: (bar.parentElement as HTMLElement).getBoundingClientRect(),
    picture: (
      canvasElement.querySelector('video') as HTMLVideoElement
    ).getBoundingClientRect(),
    bar: bar.getBoundingClientRect(),
  }
}

/**
 * The picture is the face, and the face is the column.
 *
 * It used to stop at 1280 — the width of the smallest profile the API offers —
 * so a window with more column than that showed the picture with black either
 * side of it and the rest of the desk empty. It takes the column now, and the
 * black is left for a broadcast whose own shape is not 16:9.
 */
export const 面いっぱいの映像: Story = {
  parameters: { screen: A_WIDE_WINDOW },
  play: async ({ canvasElement }) => {
    const { face, picture, bar } = faceOf(canvasElement)

    // The column, not a cap of the picture's own: wider than the old 1280.
    await expect(face.width).toBeGreaterThan(1280)
    await expect(Math.abs(picture.width - face.width)).toBeLessThan(3)
    await expect(Math.abs(picture.height - face.height)).toBeLessThan(3)

    // The bar runs the face, as every player anyone has used does.
    await expect(Math.abs(bar.width - face.width)).toBeLessThan(1)
  },
}

/**
 * A window too short for the column brings the picture down by its width, so
 * it keeps its shape and the reading under it stays on the screen. Black is
 * not stacked over and under to hold the width.
 */
export const 背の低い窓では映像が縮む: Story = {
  parameters: { screen: A_SHORT_WINDOW },
  play: async ({ canvasElement }) => {
    const { face, picture } = faceOf(canvasElement)

    // (700 - 210) * 16 / 9 is about 871, well inside the column the 1440 step
    // would otherwise give it.
    await expect(face.width).toBeLessThan(1000)
    await expect(Math.abs(picture.width - face.width)).toBeLessThan(3)
    await expect(Math.abs(face.width / face.height - 16 / 9)).toBeLessThan(0.02)
  },
}

/** The player, as a press on the picture or a tab into the bar leaves it. */
function board(canvasElement: HTMLElement): HTMLElement {
  const found = canvasElement.querySelector('[data-slot="player"]')

  if (!(found instanceof HTMLElement)) {
    throw new Error('the player is not on the screen')
  }

  return found
}

/** One press, on the player itself, the way the browser sends one. */
function press(on: HTMLElement, key: string) {
  on.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

/**
 * The keys every player has. They are the player's while the focus is inside
 * it, which a press on the picture gives it.
 */
export const キーで音量と消音: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const level = canvas.getByRole('slider', { name: '音量' })
    const quiet = canvas.getByRole('button', { name: '消音' })
    const player = board(canvasElement)

    press(player, 'ArrowDown')
    press(player, 'ArrowDown')
    await waitFor(() => expect(level).toHaveValue('90'))

    press(player, 'ArrowUp')
    await waitFor(() => expect(level).toHaveValue('95'))

    press(player, 'm')
    await waitFor(() => expect(quiet).toHaveAttribute('aria-pressed', 'true'))
    await expect(level).toHaveValue('0')

    // The level the mute was pressed at comes back with it.
    press(player, 'm')
    await waitFor(() => expect(quiet).toHaveAttribute('aria-pressed', 'false'))
    await expect(level).toHaveValue('95')
  },
}

/**
 * A run of presses moves the mark on every one of them and asks for the
 * picture once, when the presses stop.
 *
 * Where the picture is made as it plays, a position is a request and a
 * transcoder built behind it. Asked for on every press, five presses would
 * queue five rebuilds, four of them for a second nobody is waiting for any
 * more.
 */
export const 送りを続けても要求は一度: Story = {
  args: { detail: detail('1266'), startAt: 0, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = board(canvasElement)

    asked.length = 0

    for (let i = 0; i < 5; i += 1) {
      press(player, 'ArrowRight')
    }

    // The mark and the reading are already there, and nothing has been asked
    // for.
    await waitFor(() =>
      expect(canvas.getByText('0:00:50 / 4:12:38')).toBeVisible(),
    )
    await expect(asked).toEqual([])
    await expect(
      canvas.getByRole('slider', { name: '再生位置' }),
    ).toHaveAttribute('aria-valuenow', '50')

    // One request, for where the presses left off.
    await waitFor(() => expect(asked).toEqual(['50/720p30']), { timeout: 3000 })

    // And no second one behind it.
    await new Promise((rest) => setTimeout(rest, 800))
    await expect(asked).toEqual(['50/720p30'])
  },
}

/**
 * The same run, made with the buttons on the bar rather than the keys.
 *
 * The two are one path: the button is what the key does with a face on it, so
 * a run of presses on the bar costs one rebuild too, and the number written on
 * the button is the number the mark moves by.
 */
export const 送りのボタンも要求は一度: Story = {
  args: { detail: detail('1266'), startAt: 0, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    asked.length = 0

    const forward = canvas.getByRole('button', { name: '10秒進む' })

    for (let i = 0; i < 5; i += 1) {
      await userEvent.click(forward)
    }

    await waitFor(() =>
      expect(canvas.getByText('0:00:50 / 4:12:38')).toBeVisible(),
    )

    await waitFor(() => expect(asked).toEqual(['50/720p30']), { timeout: 3000 })

    await new Promise((rest) => setTimeout(rest, 800))
    await expect(asked).toEqual(['50/720p30'])

    // Back the same way, and the mark comes back with it.
    await userEvent.click(canvas.getByRole('button', { name: '10秒戻る' }))
    await waitFor(() =>
      expect(canvas.getByText('0:00:40 / 4:12:38')).toBeVisible(),
    )
  },
}

/** Back the same way, and never past the start. */
export const 戻しは頭で止まる: Story = {
  args: { detail: detail('1266'), startAt: 0, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = board(canvasElement)

    asked.length = 0

    for (let i = 0; i < 3; i += 1) {
      press(player, 'ArrowLeft')
    }

    await waitFor(() =>
      expect(canvas.getByText('0:00:00 / 4:12:38')).toBeVisible(),
    )
    await waitFor(() => expect(asked).toEqual(['0/720p30']), { timeout: 3000 })
  },
}

/**
 * The picture is pressed to run it, and pressed twice to put it on the whole
 * screen. Two presses ask for the picture once: the second is the undo of the
 * first, not a second start.
 */
export const 映像を押して再生: Story = {
  args: { detail: detail('1266'), pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const area = canvasElement.querySelector('[data-slot="player-press"]')

    asked.length = 0
    await userEvent.click(area as HTMLElement)
    await waitFor(() => expect(asked).toEqual(['0/720p30']))

    // Two presses: the picture goes on the whole screen and is not asked for
    // again — the second press of the double is the undo of the first.
    asked.length = 0
    await userEvent.dblClick(area as HTMLElement)
    await waitFor(() => expect(document.fullscreenElement).not.toBeNull())
    await expect(asked).toEqual([])

    await document.exitFullscreen()
    await waitFor(() => expect(document.fullscreenElement).toBeNull())
  },
}

/**
 * A press on a control on the bar is that control being pressed, and nothing
 * else. The picture underneath is not started by it, and space on it does not
 * reach the picture either.
 */
export const バーの操作子は再生を動かさない: Story = {
  args: { detail: detail('1266'), pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const quiet = canvas.getByRole('button', { name: '消音' })

    asked.length = 0
    await userEvent.click(quiet)

    await expect(quiet).toHaveAttribute('aria-pressed', 'true')
    await expect(asked).toEqual([])

    // Space on a focused control presses that control. Read as the player's,
    // it would silence the sound and start the picture with one press.
    quiet.focus()
    press(quiet, ' ')
    await expect(asked).toEqual([])

    // An arrow on the seek bar is the seek bar's own step, taken once.
    const seek = canvas.getByRole('slider', { name: '再生位置' })

    seek.focus()
    press(seek, 'ArrowRight')
    await waitFor(() =>
      expect(canvas.getByText('0:00:10 / 4:12:38')).toBeVisible(),
    )
  },
}

/**
 * Where the file answers a byte range there is nothing to build again, so the
 * position moves inside the picture already loaded and nothing is asked for.
 */
export const Range直配信は待たずに動く: Story = {
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
    startAt: 0,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = board(canvasElement)

    asked.length = 0

    for (let i = 0; i < 4; i += 1) {
      press(player, 'ArrowRight')
    }

    await waitFor(() =>
      expect(canvas.getByRole('slider', { name: '再生位置' })).toHaveAttribute(
        'aria-valuenow',
        '40',
      ),
    )

    // Nothing was asked for, then or after the wait the other route takes.
    await new Promise((rest) => setTimeout(rest, 800))
    await expect(asked).toEqual([])
  },
}
