import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type { PlaybackPlan, TicketWrite } from '@/repository/videos'
import { RECORDING_DETAIL_FIXTURES } from '@/stories/fixtures/recording-details'
import {
  DRAWN_PICTURE,
  drawnFrame,
  SUBTITLED_FRAME,
} from '@/stories/fixtures/frames'
import { Player } from '@/components/recordings/player'
import {
  drawCapture,
  type TakeCapture,
} from '@/components/recordings/take-capture'
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

function withoutFrames() {
  return '/frames/none-of-them.jpg'
}

function noPicture() {
  return '/pictures/there-is-none.mp4'
}

function stalling() {
  return URL.createObjectURL(new MediaSource())
}

const asked: string[] = []

function keeping(id: string, from: number, profile?: string) {
  asked.push(`${from}/${profile ?? '—'}`)

  return stalling()
}

function answering(fault: PlaybackFault) {
  return async () => fault
}

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

const READING = /^\d+:\d\d(:\d\d)?$/

const meta = {
  title: 'Components/録画プレイヤー',
  component: Player,
  parameters: { layout: 'fullscreen' },
  args: {
    detail: detail('1266'),
    plan: ON_THE_FLY,
    unaskedProfile: '1080p60',
    onTakeTicket: ticketed,
    frameHref: drawnFrame,
  },
  decorators: [
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

    await expect(canvas.queryByRole('button', { name: '再試行' })).toBeNull()
  },
}

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

export const 機械が1080p60と答える: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    unaskedProfile: '1080p60',
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => expect(asked.at(-1)).toBe('0/1080p60'))
    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const quality = await screen.findByRole('group', { name: '画質' })

    await expect(
      within(quality).getByRole('button', { name: '1080p60' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const 機械が720p30と答える: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    unaskedProfile: '720p30',
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => expect(asked.at(-1)).toBe('0/720p30'))
    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const quality = await screen.findByRole('group', { name: '画質' })

    await expect(
      within(quality).getByRole('button', { name: '720p30' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const 機械に聞けなければ何も指定しない: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    unaskedProfile: undefined,
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => expect(asked.at(-1)).toBe('0/—'))
    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const quality = await screen.findByRole('group', { name: '画質' })

    await expect(
      within(quality)
        .getAllByRole('button')
        .map((one) => one.getAttribute('aria-pressed')),
    ).toEqual(['false', 'false', 'false', 'false'])
  },
}

export const 画質を選ぶ: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    unaskedProfile: '1080p60',
    pictureHref: keeping,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const quality = await screen.findByRole('group', { name: '画質' })

    await expect(
      within(quality)
        .getAllByRole('button')
        .map((one) => one.textContent),
    ).toEqual(['1080p60', '1080p30', '720p60', '720p30'])
    await expect(
      within(quality).getByRole('button', { name: '1080p60' }),
    ).toHaveAttribute('aria-pressed', 'true')

    asked.length = 0
    await userEvent.click(
      within(quality).getByRole('button', { name: '720p60' }),
    )

    await waitFor(() => expect(asked).toEqual(['0/720p60']))
    await expect(
      within(quality).getByRole('button', { name: '720p60' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

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

    await expect(
      screen.getAllByText('字幕と音声の選択はこれから実装されます'),
    ).toHaveLength(1)
  },
}

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

const A_WIDE_WINDOW = { width: 1680, height: 1200 }

const A_SHORT_WINDOW = { width: 1680, height: 700 }

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

export const 面いっぱいの映像: Story = {
  parameters: { screen: A_WIDE_WINDOW },
  play: async ({ canvasElement }) => {
    const { face, picture, bar } = faceOf(canvasElement)

    await expect(face.width).toBeGreaterThan(1280)
    await expect(Math.abs(picture.width - face.width)).toBeLessThan(3)
    await expect(Math.abs(picture.height - face.height)).toBeLessThan(3)

    await expect(Math.abs(bar.width - face.width)).toBeLessThan(1)
  },
}

export const 背の低い窓では映像が縮む: Story = {
  parameters: { screen: A_SHORT_WINDOW },
  play: async ({ canvasElement }) => {
    const { face, picture } = faceOf(canvasElement)

    await expect(face.width).toBeLessThan(1000)
    await expect(Math.abs(picture.width - face.width)).toBeLessThan(3)
    await expect(Math.abs(face.width / face.height - 16 / 9)).toBeLessThan(0.02)
  },
}

function board(canvasElement: HTMLElement): HTMLElement {
  const found = canvasElement.querySelector('[data-slot="player"]')

  if (!(found instanceof HTMLElement)) {
    throw new Error('the player is not on the screen')
  }

  return found
}

function aim(on: HTMLElement) {
  on.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
}

function press(on: HTMLElement, key: string) {
  on.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

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

    press(player, 'm')
    await waitFor(() => expect(quiet).toHaveAttribute('aria-pressed', 'false'))
    await expect(level).toHaveValue('95')
  },
}

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

    await waitFor(() =>
      expect(canvas.getByText('0:50 / 4:12:38')).toBeVisible(),
    )
    await expect(asked).toEqual([])
    await expect(
      canvas.getByRole('slider', { name: '再生位置' }),
    ).toHaveAttribute('aria-valuenow', '50')

    await waitFor(() => expect(asked).toEqual(['50/1080p60']), {
      timeout: 3000,
    })

    await new Promise((rest) => setTimeout(rest, 800))
    await expect(asked).toEqual(['50/1080p60'])
  },
}

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

    await waitFor(() => expect(asked).toEqual(['50/1080p60']), {
      timeout: 3000,
    })

    await new Promise((rest) => setTimeout(rest, 800))
    await expect(asked).toEqual(['50/1080p60'])

    await userEvent.click(canvas.getByRole('button', { name: '10秒戻る' }))
    await waitFor(() =>
      expect(canvas.getByText('0:40 / 4:12:38')).toBeVisible(),
    )
  },
}

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
    await waitFor(() => expect(asked).toEqual(['0/1080p60']), { timeout: 3000 })
  },
}

export const 映像を押して再生: Story = {
  args: { detail: detail('1266'), pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const area = canvasElement.querySelector('[data-slot="player-press"]')

    asked.length = 0
    await userEvent.click(area as HTMLElement)
    await waitFor(() => expect(asked).toEqual(['0/1080p60']))

    asked.length = 0
    await userEvent.dblClick(area as HTMLElement)
    await waitFor(() => expect(document.fullscreenElement).not.toBeNull())
    await expect(asked).toEqual([])

    await document.exitFullscreen()
    await waitFor(() => expect(document.fullscreenElement).toBeNull())
  },
}

export const バーの操作子は再生を動かさない: Story = {
  args: { detail: detail('1266'), pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const quiet = canvas.getByRole('button', { name: '消音' })

    asked.length = 0
    await userEvent.click(quiet)

    await expect(quiet).toHaveAttribute('aria-pressed', 'true')
    await expect(asked).toEqual([])

    quiet.focus()
    press(quiet, ' ')
    await expect(asked).toEqual([])

    const seek = canvas.getByRole('slider', { name: '再生位置' })

    seek.focus()
    press(seek, 'ArrowRight')
    await waitFor(() =>
      expect(canvas.getByText('0:10 / 4:12:38')).toBeVisible(),
    )
  },
}

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

    await new Promise((rest) => setTimeout(rest, 800))
    await expect(asked).toEqual([])
  },
}

export const 操作列が出ている: Story = {
  play: async ({ canvasElement }) => {
    const chrome = canvasElement.querySelector('[data-slot="player-chrome"]')

    await expect(chrome).toHaveAttribute('data-up', 'true')
    await expect(getComputedStyle(chrome as Element).backgroundImage).toContain(
      'linear-gradient',
    )
    await expect(getComputedStyle(chrome as Element).backgroundColor).toMatch(
      /rgba\(0, 0, 0, 0\)|transparent/,
    )
  },
}

export const 停止中は中央に印: Story = {
  play: async ({ canvasElement }) => {
    const standing = () =>
      canvasElement.querySelector('[data-slot="player-center-standing"]')

    await expect(standing()).not.toBeNull()

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

    await expect(board(canvasElement).contains(document.activeElement)).toBe(
      true,
    )
  },
}

export const 開いた時点で鍵が効く: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(board(canvasElement).contains(document.activeElement)).toBe(true),
    )
  },
}

export const 矢印は狙ってから: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const level = canvas.getByRole('slider', { name: '音量' })
    const player = board(canvasElement)

    press(player, 'ArrowDown')
    await expect(level).toHaveValue('100')

    await userEvent.click(
      canvasElement.querySelector('[data-slot="player-press"]') as HTMLElement,
    )
    press(player, 'ArrowDown')
    await waitFor(() => expect(level).toHaveValue('95'))
  },
}

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

    await expect(
      canvasElement.querySelector('[data-slot="player-center-bezel"] span'),
    ).toBeNull()

    press(player, 'ArrowRight')
    press(player, 'ArrowRight')
    await waitFor(() => expect(mark()).toHaveTextContent('30秒'))

    press(player, 'ArrowLeft')
    await waitFor(() => expect(mark()).toHaveAttribute('data-way', 'back'))
    await expect(mark()).toHaveTextContent('10秒')
  },
}

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
    await waitFor(() => expect(canvas.getByText(/^2:06:19 \//)).toBeVisible())
    await expect(asked).toEqual([])

    seek.dispatchEvent(new PointerEvent('pointerup', at(0.5)))
    await waitFor(() => expect(asked.length).toBe(1))
  },
}

export const 設定を開いているあいだ操作列は消えない: Story = {
  args: { detail: detail('1266'), pictureHref: keeping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const chrome = canvasElement.querySelector('[data-slot="player-chrome"]')

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const surface = await screen.findByRole('dialog', { name: '設定' })

    await expect(surface.closest('[data-slot="player-chrome"]')).toBeNull()

    canvasElement.querySelector('video')?.dispatchEvent(new Event('playing'))
    await new Promise((rest) => setTimeout(rest, 3400))

    await expect(chrome).toHaveAttribute('data-up', 'true')
    await expect(surface).toBeVisible()
  },
}

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

    await userEvent.click(area)
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '設定' })).toBeNull(),
    )
    await expect(canvas.getByRole('button', { name: '一時停止' })).toBeVisible()

    await new Promise((rest) => setTimeout(rest, 700))
    await userEvent.click(area)
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: '再生' })).toBeVisible(),
    )
  },
}

export const 立て直しのあいだ映っていたコマが残る: Story = {
  args: {
    detail: { ...detail('1266'), thumbnailHref: SUBTITLED_FRAME },
    startAt: 0,
    pictureHref: (_id: string, from: number) =>
      from === 0 ? DRAWN_PICTURE : stalling(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const held = canvasElement.querySelector(
      '[data-slot="player-held-frame"]',
    ) as HTMLCanvasElement

    await expect(held).not.toHaveAttribute('data-holding')

    const picture = canvasElement.querySelector('video') as HTMLVideoElement
    await waitFor(() => expect(picture.readyState).toBeGreaterThan(1), {
      timeout: 10000,
    })

    await userEvent.click(canvas.getByRole('button', { name: '10秒進む' }))

    await waitFor(() => expect(held).toHaveAttribute('data-holding', 'true'), {
      timeout: 5000,
    })
    await expect(picture.readyState).toBe(0)
    await expect(held.width).toBe(640)
    await expect(held.height).toBe(360)

    const drawn = held
      .getContext('2d')
      ?.getImageData(0, 0, held.width, held.height).data as Uint8ClampedArray
    let lit = 0
    for (let at = 0; at < drawn.length; at += 4) {
      if (drawn[at] > 40 || drawn[at + 1] > 40 || drawn[at + 2] > 40) {
        lit += 1
      }
    }
    await expect(lit).toBeGreaterThan(drawn.length / 4 / 10)

    await expect(canvas.getByRole('status')).toBeVisible()
    await expect(
      canvasElement.querySelector('[data-slot="player-center-standing"]'),
    ).toBeNull()
  },
}

export const 立て直しに失敗したらコマごと断りに変わる: Story = {
  args: {
    detail: { ...detail('1266'), thumbnailHref: SUBTITLED_FRAME },
    startAt: 0,
    pictureHref: (_id: string, from: number) =>
      from === 0 ? DRAWN_PICTURE : noPicture(),
    askWhy: answering('transcode'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const picture = canvasElement.querySelector('video') as HTMLVideoElement

    await waitFor(() => expect(picture.readyState).toBeGreaterThan(1), {
      timeout: 10000,
    })

    await userEvent.click(canvas.getByRole('button', { name: '10秒進む' }))

    await waitFor(
      () =>
        expect(
          canvas.getByText('元 TS からのトランスコードに失敗しました。'),
        ).toBeVisible(),
      { timeout: 10000 },
    )
    await expect(
      canvasElement.querySelector('[data-slot="player-held-frame"]'),
    ).toBeNull()
  },
}

const showing = (canvasElement: HTMLElement) => {
  const picture = canvasElement.querySelector('video') as HTMLVideoElement

  return waitFor(() => expect(picture.readyState).toBeGreaterThan(1), {
    timeout: 10000,
  })
}

const taken: { name: string; blob: Blob | null }[] = []

const capturing: TakeCapture = async ({ video, name, over }) => {
  const blob = await drawCapture({ video, over })

  taken.push({ name, blob })

  return blob ? 'saved' : 'refused'
}

async function sizeOf(blob: Blob) {
  const bitmap = await createImageBitmap(blob)

  return { width: bitmap.width, height: bitmap.height }
}

async function litIn(blob: Blob) {
  const bitmap = await createImageBitmap(blob)
  const plate = document.createElement('canvas')

  plate.width = bitmap.width
  plate.height = bitmap.height
  plate.getContext('2d')?.drawImage(bitmap, 0, 0)

  const pixels = plate
    .getContext('2d')
    ?.getImageData(0, 0, plate.width, plate.height).data as Uint8ClampedArray
  let lit = 0

  for (let at = 0; at < pixels.length; at += 4) {
    if (pixels[at] > 40 || pixels[at + 1] > 40 || pixels[at + 2] > 40) {
      lit += 1
    }
  }

  return lit / (pixels.length / 4)
}

export const キャプチャ: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    pictureHref: () => DRAWN_PICTURE,
    takeCapture: capturing,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await showing(canvasElement)

    taken.length = 0
    await userEvent.click(canvas.getByRole('button', { name: 'キャプチャ' }))
    await waitFor(() => expect(taken).toHaveLength(1))

    const got = taken[0]

    await expect(got.name).toBe(`${detail('1266').title} 0-00.png`)
    await expect(got.blob?.type).toBe('image/png')
    await expect(await sizeOf(got.blob as Blob)).toEqual({
      width: 640,
      height: 360,
    })
    await expect(await litIn(got.blob as Blob)).toBeGreaterThan(0.1)
    await expect(canvas.getByText('キャプチャを保存しました')).toBeVisible()
  },
}

export const キャプチャを断られる: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    pictureHref: () => DRAWN_PICTURE,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await showing(canvasElement)

    const reading = CanvasRenderingContext2D.prototype.getImageData

    CanvasRenderingContext2D.prototype.getImageData = () => {
      throw new DOMException(
        'Tainted canvases may not be exported.',
        'SecurityError',
      )
    }

    try {
      await userEvent.click(canvas.getByRole('button', { name: 'キャプチャ' }))
      await waitFor(() =>
        expect(canvas.getByText('この映像は保存できません')).toBeVisible(),
      )
    } finally {
      CanvasRenderingContext2D.prototype.getImageData = reading
    }

    await expect(
      canvas.getByRole('button', { name: 'キャプチャ' }),
    ).toBeEnabled()
    await expect(
      canvasElement.querySelector('video') as HTMLVideoElement,
    ).toBeVisible()
  },
}

function pictureOut(canvasElement: HTMLElement, out: boolean) {
  const picture = canvasElement.querySelector('video') as HTMLVideoElement

  Object.defineProperty(document, 'pictureInPictureElement', {
    value: out ? picture : null,
    configurable: true,
  })
  picture.dispatchEvent(
    new Event(out ? 'enterpictureinpicture' : 'leavepictureinpicture', {
      bubbles: true,
    }),
  )
}

function pictureBack() {
  Reflect.deleteProperty(document, 'pictureInPictureElement')
}

export const ピクチャーインピクチャー: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    pictureHref: () => DRAWN_PICTURE,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await showing(canvasElement)

    const control = canvas.getByRole('button', {
      name: 'ピクチャーインピクチャー',
    })

    await expect(control).toHaveAttribute('aria-pressed', 'false')
    await expect(
      canvas.queryByText('ピクチャーインピクチャーで再生中'),
    ).toBeNull()

    try {
      pictureOut(canvasElement, true)

      await waitFor(() =>
        expect(control).toHaveAttribute('aria-pressed', 'true'),
      )
      await expect(
        canvas.getByText('ピクチャーインピクチャーで再生中'),
      ).toBeVisible()
      await expect(
        canvasElement.querySelector('[data-slot="player-press"]'),
      ).toBeNull()
      await expect(
        canvasElement.querySelector('[data-slot="player-chrome"]'),
      ).toHaveAttribute('data-up', 'true')

      pictureOut(canvasElement, false)

      await waitFor(() =>
        expect(control).toHaveAttribute('aria-pressed', 'false'),
      )
      await expect(
        canvas.queryByText('ピクチャーインピクチャーで再生中'),
      ).toBeNull()
      await expect(
        canvasElement.querySelector('[data-slot="player-press"]'),
      ).not.toBeNull()
    } finally {
      pictureBack()
    }
  },
}

export const ピクチャーインピクチャーを断るブラウザ: Story = {
  args: {
    detail: detail('1266'),
    startAt: 0,
    pictureHref: () => DRAWN_PICTURE,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await showing(canvasElement)

    const picture = canvasElement.querySelector('video') as HTMLVideoElement

    picture.disablePictureInPicture = true
    picture.dispatchEvent(new Event('leavepictureinpicture', { bubbles: true }))

    await waitFor(() =>
      expect(
        canvas.queryByRole('button', { name: 'ピクチャーインピクチャー' }),
      ).toBeNull(),
    )
    await expect(
      canvas.getByRole('button', { name: 'キャプチャ' }),
    ).toBeVisible()
  },
}

function tipOf(canvasElement: HTMLElement, name: string | RegExp): HTMLElement {
  const bar = canvasElement.querySelector('[data-slot="player-chrome"]')

  if (!(bar instanceof HTMLElement)) {
    throw new Error('the bar is not on the screen')
  }

  const control = within(bar).getByRole('button', { name })
  const held = control.closest('[data-slot="player-tip"]')

  if (!(held instanceof HTMLElement)) {
    throw new Error(`${name} is not held by anything that names it`)
  }

  return held
}

function named(canvasElement: HTMLElement): HTMLElement | null {
  return canvasElement.querySelector('[data-slot="player-tip-name"]')
}

function capsOn(said: HTMLElement): string[] {
  return [...said.querySelectorAll('kbd')].map((cap) => cap.textContent ?? '')
}

async function restOn(canvasElement: HTMLElement, name: string | RegExp) {
  await userEvent.hover(tipOf(canvasElement, name))
  await waitFor(() => expect(named(canvasElement)).not.toBeNull(), {
    timeout: 3000,
  })

  return named(canvasElement) as HTMLElement
}

export const 操作子の名前は待ってから出る: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.hover(tipOf(canvasElement, '再生'))
    await expect(named(canvasElement)).toBeNull()

    await waitFor(() => expect(named(canvasElement)).not.toBeNull(), {
      timeout: 3000,
    })

    const said = named(canvasElement) as HTMLElement

    await expect(said).toHaveTextContent('再生')
    await expect(capsOn(said)).toEqual(['Space'])

    const bubble = said.getBoundingClientRect()
    const on = tipOf(canvasElement, '再生').getBoundingClientRect()
    const board = (
      canvasElement.querySelector('[data-slot="player"]') as HTMLElement
    ).getBoundingClientRect()

    await expect(bubble.bottom).toBeLessThanOrEqual(on.top)
    await expect(bubble.top).toBeGreaterThanOrEqual(board.top)
    await expect(bubble.left).toBeGreaterThanOrEqual(board.left)
    await expect(bubble.right).toBeLessThanOrEqual(board.right)
  },
}

export const 鍵を持たない操作子は名前だけ: Story = {
  play: async ({ canvasElement }) => {
    const said = await restOn(canvasElement, 'キャプチャ')

    await expect(said).toHaveTextContent('キャプチャ')
    await expect(capsOn(said)).toEqual([])
  },
}

export const 押せない操作子にも名前は出る: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: '字幕' }),
    ).toBeDisabled()

    const said = await restOn(canvasElement, '字幕')

    await expect(said).toHaveTextContent('字幕')
    await expect(capsOn(said)).toEqual([])
    await expect(said).not.toHaveTextContent('これから')
  },
}

export const 隣へ移ってもまた待つ: Story = {
  play: async ({ canvasElement }) => {
    const full = await restOn(canvasElement, '全画面')

    await expect(capsOn(full)).toEqual(['F'])

    await userEvent.unhover(tipOf(canvasElement, '全画面'))
    await waitFor(() => expect(named(canvasElement)).toBeNull())

    await userEvent.hover(tipOf(canvasElement, '消音'))
    await expect(named(canvasElement)).toBeNull()

    await waitFor(() => expect(named(canvasElement)).not.toBeNull(), {
      timeout: 3000,
    })

    const said = named(canvasElement) as HTMLElement

    await expect(said).toHaveTextContent('消音')
    await expect(capsOn(said)).toEqual(['M'])
  },
}
