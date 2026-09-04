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

/** The reading the bubble carries, which is a position and nothing else. */
const READING = /^\d+:\d\d(:\d\d)?$/

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
    await expect(canvas.getByText('0:00 / 4:12:38')).toBeVisible()
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

/**
 * Aiming at the player, which is what a press on the picture does at the
 * moment it goes down.
 *
 * The arrows are the page's until this has happened (v3.37): they scroll, and
 * the screen is scrolled to read the record under the picture. Every story
 * that presses an arrow does this first, because a reader pressing an arrow
 * has done it first.
 */
function aim(on: HTMLElement) {
  on.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
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

    aim(player)
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
      aim(player)
      press(player, 'ArrowRight')
    }

    // The mark and the reading are already there, and nothing has been asked
    // for.
    await waitFor(() =>
      expect(canvas.getByText('0:50 / 4:12:38')).toBeVisible(),
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
      expect(canvas.getByText('0:50 / 4:12:38')).toBeVisible(),
    )

    await waitFor(() => expect(asked).toEqual(['50/720p30']), { timeout: 3000 })

    await new Promise((rest) => setTimeout(rest, 800))
    await expect(asked).toEqual(['50/720p30'])

    // Back the same way, and the mark comes back with it.
    await userEvent.click(canvas.getByRole('button', { name: '10秒戻る' }))
    await waitFor(() =>
      expect(canvas.getByText('0:40 / 4:12:38')).toBeVisible(),
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
      aim(player)
      press(player, 'ArrowLeft')
    }

    await waitFor(() =>
      expect(canvas.getByText('0:00 / 4:12:38')).toBeVisible(),
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
      expect(canvas.getByText('0:10 / 4:12:38')).toBeVisible(),
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
      aim(player)
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

/**
 * The bar is up while the picture is not running, and it is laid over the
 * picture on a wash rather than on a plate.
 */
export const 操作列が出ている: Story = {
  play: async ({ canvasElement }) => {
    const chrome = canvasElement.querySelector('[data-slot="player-chrome"]')

    await expect(chrome).toHaveAttribute('data-up', 'true')
    await expect(getComputedStyle(chrome as Element).backgroundImage).toContain(
      'linear-gradient',
    )
    // A wash and not a plate: no flat fill underneath it.
    await expect(getComputedStyle(chrome as Element).backgroundColor).toMatch(
      /rgba\(0, 0, 0, 0\)|transparent/,
    )
  },
}

/**
 * A stopped picture carries the mark that says so, and every press is answered
 * in the middle whether it came from the bar, the picture or a key.
 */
export const 停止中は中央に印: Story = {
  play: async ({ canvasElement }) => {
    const standing = () =>
      canvasElement.querySelector('[data-slot="player-center-standing"]')

    await expect(standing()).not.toBeNull()

    // A target, not a mark. It was drawn as a mark and could not be pressed,
    // which left the only thing on the screen meaning 再生 at 40px on the
    // bottom edge (v3.37). Five of five real players make this a real button;
    // WCAG 2.5.5 lets the small one on the bar stand beside it.
    await expect(standing()).toHaveProperty('tagName', 'BUTTON')
    await expect(standing()).toHaveAccessibleName('再生')
    await expect(
      getComputedStyle(standing() as Element).pointerEvents,
    ).not.toBe('none')

    const box = (standing() as Element).getBoundingClientRect()

    await expect(box.width).toBeGreaterThanOrEqual(44)
    await expect(box.height).toBeGreaterThanOrEqual(44)

    const bezel = () =>
      canvasElement.querySelector('[data-slot="player-center-bezel"] span')

    await expect(bezel()).toBeNull()

    await userEvent.click(
      canvasElement.querySelector('[data-slot="player-press"]') as HTMLElement,
    )
    await waitFor(() => expect(bezel()).not.toBeNull())
    await expect(getComputedStyle(bezel() as Element).animationName).toBe(
      'player-burst',
    )
  },
}

/**
 * Pressing the target in the middle is what starts a recording that has not
 * been played yet, and the keys stay alive after it.
 *
 * The button goes as soon as the picture runs, and a focused element that
 * unmounts drops the focus to `<body>` — where the keys are dead. So the press
 * hands the focus to the player on its way through.
 */
export const 真ん中の的を押して始める: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    const target = canvasElement.querySelector(
      '[data-slot="player-center-standing"]',
    ) as HTMLElement

    await userEvent.click(target)

    await waitFor(() =>
      expect(canvasElement.querySelector('video')).toHaveAttribute('src'),
    )

    // Not left on the body: the keys have to keep working once it is running.
    await expect(board(canvasElement).contains(document.activeElement)).toBe(
      true,
    )
  },
}

/**
 * The screen hands the player the focus as it opens, so Space works without
 * aiming at anything — and the page does not jump doing it.
 *
 * Focus-scoped and not on the document: Plyr, video.js, Shaka and media-chrome
 * are all scoped, and WCAG 2.1.4 wants a single-character shortcut either
 * switchable off, remappable, or live only while the component has focus.
 */
export const 開いた時点で鍵が効く: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(board(canvasElement).contains(document.activeElement)).toBe(true),
    )
  },
}

/**
 * The arrows are the page's until the reader has aimed at the player.
 *
 * They scroll, and this screen is scrolled to read the record under the
 * picture. video.js does not give the arrows to the player at all — its
 * sliders own them — and Shaka passes them only with the seek bar focused or
 * in full screen.
 */
export const 矢印は狙ってから: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const level = canvas.getByRole('slider', { name: '音量' })
    const player = board(canvasElement)

    // Opened, not aimed at: the press is not the player's.
    press(player, 'ArrowDown')
    await expect(level).toHaveValue('100')

    // Pressing the picture is aiming.
    await userEvent.click(
      canvasElement.querySelector('[data-slot="player-press"]') as HTMLElement,
    )
    press(player, 'ArrowDown')
    await waitFor(() => expect(level).toHaveValue('95'))
  },
}

/**
 * A volume press is answered too, and with the level it moved to.
 *
 * YouTube is the only web player that does this, and it is the one worth
 * copying here: the level lives in a slider on a bar that is not up while the
 * keys are being used, so without a mark on the picture a volume press has no
 * answer at all. Its own is a speaker glyph in the same 52px circle and a
 * separate band of text reading `NN%` — `.ytp-bezel-text`, at `top:10%`, not
 * inside the circle and not growing with it. Silence says `0%`, so the number
 * and the speaker beside it agree.
 */
export const 音量の押しにも印: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = board(canvasElement)
    const said = () =>
      canvasElement.querySelector('[data-slot="player-center-bezel-text"]')

    await expect(said()).toBeNull()

    aim(player)
    press(player, 'ArrowDown')
    await waitFor(() => expect(said()).toHaveTextContent('95%'))

    press(player, 'm')
    await waitFor(() => expect(said()).toHaveTextContent('0%'))
    await expect(canvas.getByRole('button', { name: '消音' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    press(player, 'm')
    await waitFor(() => expect(said()).toHaveTextContent('95%'))
  },
}

/**
 * A seek is answered at the side the picture went towards, and not in the
 * middle.
 *
 * Measured on YouTube's shipping player, the arrow keys and J / L do not touch
 * `.ytp-bezel`: they drive `ytp-doubletap-ui-legacy`, a 110px circle at
 * `rgba(0,0,0,.6)` placed at one side, hidden after 700ms, with three arrows on
 * staggered keyframes and a label that adds up over a run of presses.
 * Chromium's own `<video>` controls draw the same mark with the same 700ms and
 * the same three arrows for a double tap. Two implementations, one answer.
 */
export const 送り戻しの印は脇に立つ: Story = {
  args: { detail: detail('1266'), startAt: 0, pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const player = board(canvasElement)
    const mark = () =>
      canvasElement.querySelector('[data-slot="player-seek-flash"]')

    await expect(mark()).toBeNull()

    aim(player)
    press(player, 'ArrowRight')
    await waitFor(() => expect(mark()).not.toBeNull())
    await expect(mark()).toHaveAttribute('data-way', 'forward')
    await expect(mark()).toHaveTextContent('10秒')
    await expect(getComputedStyle(mark() as Element).animationDuration).toBe(
      '0.7s',
    )

    // The middle stays out of it.
    await expect(
      canvasElement.querySelector('[data-slot="player-center-bezel"] span'),
    ).toBeNull()

    // A run of presses is one answer that adds up, not one answer per press.
    press(player, 'ArrowRight')
    press(player, 'ArrowRight')
    await waitFor(() => expect(mark()).toHaveTextContent('30秒'))

    press(player, 'ArrowLeft')
    await waitFor(() => expect(mark()).toHaveAttribute('data-way', 'back'))
    await expect(mark()).toHaveTextContent('10秒')
  },
}

/**
 * While a position is being dragged out the bar stays a band, the knob stays
 * out, the controls stay up, and the reading follows the hand. The position is
 * asked for once, when the hand lets go.
 */
export const シーク中: Story = {
  args: { detail: detail('1266'), pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const seek = canvas.getByRole('slider', { name: '再生位置' })
    const chrome = canvasElement.querySelector('[data-slot="player-chrome"]')
    const box = seek.getBoundingClientRect()
    const at = (share: number) => ({
      clientX: box.left + box.width * share,
      clientY: box.top + box.height / 2,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      bubbles: true,
    })

    seek.setPointerCapture = () => undefined
    seek.releasePointerCapture = () => undefined

    asked.length = 0
    seek.dispatchEvent(new PointerEvent('pointerdown', at(0.2)))
    seek.dispatchEvent(new PointerEvent('pointermove', at(0.5)))

    await waitFor(() => expect(seek).toHaveAttribute('data-wanted', 'true'))
    await expect(chrome).toHaveAttribute('data-up', 'true')
    // The line is a band and the knob is out, both held there by the drag.
    await waitFor(() =>
      expect(getComputedStyle(seek.firstElementChild as Element).height).toBe(
        '5px',
      ),
    )
    await waitFor(() =>
      expect(
        getComputedStyle(
          canvasElement.querySelector(
            '[data-slot="player-seek-knob"]',
          ) as Element,
        ).scale,
      ).toBe('1'),
    )
    // The reading moved with the hand, and nothing has been asked for yet.
    await waitFor(() => expect(canvas.getByText(/^2:06:19 \//)).toBeVisible())
    await expect(asked).toEqual([])

    seek.dispatchEvent(new PointerEvent('pointerup', at(0.5)))
    await waitFor(() => expect(asked.length).toBe(1))
  },
}

/**
 * The settings surface is drawn into the pane the picture is in, so it is not
 * inside the bar and does not go down with it. While it is open the bar stays
 * up, which is what YouTube does: a surface left standing over a picture whose
 * controls have gone is the one piece of chrome with nothing behind it.
 */
export const 設定を開いているあいだ操作列は消えない: Story = {
  args: { detail: detail('1266'), pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const chrome = canvasElement.querySelector('[data-slot="player-chrome"]')

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const surface = await screen.findByRole('dialog', { name: '設定' })

    // Outside the bar, which is why the bar going down used to leave it
    // standing on its own.
    await expect(surface.closest('[data-slot="player-chrome"]')).toBeNull()

    // The picture is told it is running, which is the only state the bar goes
    // down in. It has to stay up anyway, and stay up past the count.
    canvasElement.querySelector('video')?.dispatchEvent(new Event('playing'))
    await new Promise((rest) => setTimeout(rest, 3400))

    await expect(chrome).toHaveAttribute('data-up', 'true')
    await expect(surface).toBeVisible()
  },
}

/**
 * A press outside the surface dismisses it and is not also a press on the
 * picture. The surface shuts as the press goes down, so what the click has to
 * read is what was open when the press began.
 */
export const 設定を閉じる押下は再生を動かさない: Story = {
  args: { detail: detail('1266'), pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const area = canvasElement.querySelector(
      '[data-slot="player-press"]',
    ) as HTMLElement

    canvasElement.querySelector('video')?.dispatchEvent(new Event('playing'))
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: '一時停止' })).toBeVisible(),
    )

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))
    await screen.findByRole('dialog', { name: '設定' })

    // The press lands on the picture, the surface goes, and the picture is
    // still running — the transport still offers to stop it.
    await userEvent.click(area)
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '設定' })).toBeNull(),
    )
    await expect(canvas.getByRole('button', { name: '一時停止' })).toBeVisible()

    // Far enough after the last press that the browser reads a second one and
    // not a double. With nothing open, it is a press on the picture again.
    await new Promise((rest) => setTimeout(rest, 700))
    await userEvent.click(area)
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: '再生' })).toBeVisible(),
    )
  },
}
