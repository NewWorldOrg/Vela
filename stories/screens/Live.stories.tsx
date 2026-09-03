import type { Meta, StoryObj } from '@storybook/nextjs'
import { getRouter } from '@storybook/nextjs/navigation.mock'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import {
  captionCanvasPayload,
  captionPayload,
  endingPayload,
  frameOf,
  progressPayload,
  refusalPayload,
  type LiveRefusal,
  type LiveStartup,
  type LiveSupplyEnd,
  type TranscodeCeiling,
} from '@/lib/live-wire'
import type { LiveScreen } from '@/repository/live'
import { LIVE_SCREEN_FIXTURE } from '@/repository/live.fixtures'
import {
  CAPTION_CANVAS_FIXTURE,
  CAPTION_PICTURE_FIXTURE,
} from '@/stories/fixtures/captions'
import { AppFrame } from '@/components/vela/app-shell'
import type { LiveSocket, OpenSocket } from '@/components/live/live-session'
import { LiveView } from '@/components/live/live-page'

/**
 * A socket a story drives. It opens on the next tick, the way a real one opens
 * after the handlers are set, and then runs the script it was given; what the
 * player sends is kept so a story can read it back.
 */
class ScriptedSocket implements LiveSocket {
  binaryType: BinaryType = 'blob'
  readyState = 0
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  readonly sent: Uint8Array[] = []

  constructor(
    readonly href: string,
    script: (socket: ScriptedSocket) => void,
  ) {
    setTimeout(() => {
      this.readyState = 1
      this.onopen?.(new Event('open'))
      script(this)
    }, 0)
  }

  send(data: ArrayBuffer | ArrayBufferView) {
    this.sent.push(
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    )
  }

  close(code = 1000) {
    this.drop(code)
  }

  /** One frame off the wire, in a buffer of exactly its length. */
  say(frame: Uint8Array) {
    const copy = frame.slice()

    this.onmessage?.(new MessageEvent('message', { data: copy.buffer }))
  }

  drop(code: number) {
    if (this.readyState === 3) {
      return
    }

    this.readyState = 3
    this.onclose?.(new CloseEvent('close', { code }))
  }
}

/** The sockets a story opened, in order. */
const opened: ScriptedSocket[] = []

function scripted(script: (socket: ScriptedSocket) => void): OpenSocket {
  return (href) => {
    const socket = new ScriptedSocket(href, script)

    opened.push(socket)

    return socket
  }
}

/** One progress report, as the wire sends one each time a segment is reached. */
function progress(startup: LiveStartup): Uint8Array {
  return frameOf('control', 0, progressPayload(startup))
}

/** What the wire has to say by the handshake: the tuner, and the transcoder beside it. */
const SECURED: LiveStartup = { tunerSecured: 496, transcoderStarted: 511 }

/** The lock, which landed after the transcoder. */
const LOCKED: LiveStartup = { ...SECURED, channelLocked: 751 }

/**
 * A wire that reports the startup the way a channel comes up on air: what was
 * reached by the handshake at once, the lock as it lands, and then nothing
 * more. The two reports after these come with the header and the picture,
 * which no story here has to send.
 */
const starting = scripted((socket) => {
  socket.say(progress(SECURED))
  setTimeout(() => socket.say(progress(LOCKED)), 255)
})

/** A wire heard from once, with the lock still to come. */
const securing = scripted((socket) => socket.say(progress(SECURED)))

function refusing(refusal: LiveRefusal, ceiling?: TranscodeCeiling) {
  return scripted((socket) => {
    socket.say(frameOf('control', 0, refusalPayload(refusal, ceiling)))
    socket.drop(1008)
  })
}

function ending(why: LiveSupplyEnd) {
  return scripted((socket) => {
    socket.say(frameOf('control', 0, endingPayload(why)))
    socket.drop(1000)
  })
}

/** A wire that closes without a word, as one does when the handshake failed. */
const dropping = scripted((socket) => socket.drop(1006))

/**
 * A wire that drops once and is then heard from: the first is lost without a
 * word, and the one opened by the press after it says how far it has come.
 */
const droppingOnce = scripted((socket) => {
  if (opened.length === 1) {
    socket.drop(1006)
  } else {
    socket.say(progress(SECURED))
  }
})

/**
 * A picture frame the wire said before anything the element could be opened
 * for: the moment between the first picture arriving and the first frame
 * drawn, which is also where the playhead stands when the picture stalls.
 */
const PICTURED = frameOf(
  'picture',
  0,
  new Uint8Array([0, 0, 0, 8, 0x6d, 0x6f, 0x6f, 0x66]),
)

const stalling = scripted((socket) => {
  socket.say(progress(LOCKED))
  socket.say(PICTURED)
})

/** The caption canvas, said once before any caption. */
const CAPTION_CANVAS = frameOf(
  'captionHeader',
  0,
  captionCanvasPayload(CAPTION_CANVAS_FIXTURE),
)

/**
 * A caption stamped at the start of the clock. The element here has no picture
 * and its clock stands at zero, so a stamp of zero is one the playhead has
 * already reached — the case a viewer joining late is in, handed the caption
 * that is showing now.
 */
const CAPTION_SHOWN = frameOf(
  'caption',
  0,
  captionPayload(CAPTION_PICTURE_FIXTURE),
)

/** The caption taken off, as an empty frame. */
const CAPTION_CLEARED = frameOf('caption', 0, new Uint8Array(0))

/** A wire with a caption showing on it. */
const captioned = scripted((socket) => {
  socket.say(progress(SECURED))
  socket.say(CAPTION_CANVAS)
  socket.say(CAPTION_SHOWN)
})

/** A wire whose caption has been taken off. */
const uncaptioned = scripted((socket) => {
  socket.say(progress(SECURED))
  socket.say(CAPTION_CANVAS)
  socket.say(CAPTION_SHOWN)
  socket.say(CAPTION_CLEARED)
})

/** A header with no H.264 in it, which no `MediaSource` here can be opened for. */
const HEADERLESS = frameOf(
  'pictureHeader',
  0,
  new Uint8Array([0, 0, 0, 8, 0x66, 0x74, 0x79, 0x70]),
)

const undecodable = scripted((socket) => socket.say(HEADERLESS))

const nothingToWatch = () => {
  throw new Error('no channel was chosen, so no wire is opened')
}

const stillSignedIn = async () => false

const signedOut = async () => true

const CHOSEN: LiveScreen = LIVE_SCREEN_FIXTURE

const UNCHOSEN: LiveScreen = { ...LIVE_SCREEN_FIXTURE, watching: undefined }

const meta = {
  title: 'Screens/ライブ',
  component: LiveView,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/live', query: { ch: '32736-1024' } },
    },
  },
  args: {
    screen: CHOSEN,
    openSocket: starting,
    askSignedOut: stillSignedIn,
  },
  decorators: [
    (Story) => (
      <AppFrame>
        <Story />
      </AppFrame>
    ),
  ],
  beforeEach: () => {
    opened.length = 0
  },
} satisfies Meta<typeof LiveView>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Nothing chosen: the face is black and the list is the whole of the screen's
 * business. Pressing a row puts the channel in the URL, and nothing is asked
 * of the API until then.
 */
export const 選局前: Story = {
  args: { screen: UNCHOSEN, openSocket: nothingToWatch },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/live' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.queryByText('生放送')).toBeNull()
    await expect(canvas.queryByRole('heading', { level: 1 })).toBeNull()

    await userEvent.click(canvas.getByRole('button', { name: /みなと教育1/ }))

    await expect(getRouter().replace).toHaveBeenCalledWith(
      '/live?ch=32737-1032',
      { scroll: false },
    )
  },
}

/**
 * Between the press and the picture. The wire has said how far it is, and the
 * rows read what each segment took — from what it waited for, so the lock
 * landing after the transcoder reads its own span rather than a negative one —
 * and how long the one underway has run.
 */
export const 起動中: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      await canvas.findByText('チャンネルを準備しています'),
    ).toBeVisible()
    await expect(canvas.getByText('準備中')).toBeVisible()
    await waitFor(() => expect(canvas.getByText('0.3 秒')).toBeVisible())
    await expect(canvas.getByText('0.5 秒')).toBeVisible()
    await expect(canvas.getByText('0.0 秒')).toBeVisible()
    await expect(canvas.getByText(/^経過 /)).toBeVisible()
    await expect(canvas.getByText('最初の絵').closest('li')).toHaveAttribute(
      'data-startup',
      'now',
    )

    // The wire was asked for this channel, in the profile the API defaults to.
    await expect(opened[0].href).toBe(
      '/api/live/ws?network=32736&service=1024&profile=720p30',
    )

    // Nothing to press yet: the picture has not come.
    await expect(canvas.getByRole('button', { name: '再生' })).toBeDisabled()
  },
}

/**
 * The lock and the transcoder run side by side once the tuner is secured. The
 * transcoder has been reached and the lock has not, so the one is done and the
 * other underway, each counting from the tuner.
 */
export const 起動中_選局を待つ: Story = {
  args: { openSocket: securing },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => expect(canvas.getByText('0.5 秒')).toBeVisible())
    await expect(canvas.getByText('選局(lock)').closest('li')).toHaveAttribute(
      'data-startup',
      'now',
    )
    await expect(
      canvas.getByText('トランスコーダ起動').closest('li'),
    ).toHaveAttribute('data-startup', 'done')
    await expect(canvas.getByText('0.0 秒')).toBeVisible()
    await expect(canvas.getByText('最初の絵').closest('li')).toHaveAttribute(
      'data-startup',
      'ahead',
    )
  },
}

/**
 * The profile is part of the session's key: choosing another leaves the wire
 * — saying so, rather than going quiet — and opens a new one in that profile.
 */
export const 画質を選ぶ: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await canvas.findByText('チャンネルを準備しています')
    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const quality = await screen.findByRole('group', { name: '画質' })

    await expect(
      within(quality)
        .getAllByRole('button')
        .map((one) => one.textContent),
    ).toEqual(['1080p60', '1080p30', '720p60', '720p30'])

    await userEvent.click(
      within(quality).getByRole('button', { name: '1080p30' }),
    )

    await waitFor(() => expect(opened).toHaveLength(2))
    await expect(opened[1].href).toContain('profile=1080p30')

    // The first wire was told the viewer is leaving: a control frame carrying
    // the one byte that says so.
    await expect(opened[0].sent.map((frame) => [...frame])).toContainEqual([
      0x40, 0, 0, 0, 0, 0, 0, 0, 0, 0x03,
    ])
    await expect(opened[0].readyState).toBe(3)
  },
}

function refused(
  refusal: LiveRefusal,
  title: string,
  over: { ceiling?: TranscodeCeiling; retries?: boolean; looks?: boolean } = {},
): Story {
  return {
    args: { openSocket: refusing(refusal, over.ceiling) },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement)

      await expect(await canvas.findByText(title)).toBeVisible()

      if (over.retries === false) {
        await expect(
          canvas.queryByRole('button', { name: '再試行' }),
        ).toBeNull()
      } else {
        await expect(
          canvas.getByRole('button', { name: '再試行' }),
        ).toBeEnabled()
      }

      if (over.looks) {
        await expect(
          canvas.getByRole('link', { name: '使用状況を見る' }),
        ).toHaveAttribute('href', '/settings/tuners')
      } else {
        await expect(
          canvas.queryByRole('link', { name: '使用状況を見る' }),
        ).toBeNull()
      }
    },
  }
}

export const 断り_チャンネルなし: Story = refused(
  'noSuchChannel',
  'チャンネルが見つかりません',
  { retries: false },
)

export const 断り_チューナー枯渇: Story = refused(
  'noTunerFree',
  '空いているチューナーがありません',
  { looks: true },
)

export const 断り_選局失敗: Story = refused(
  'wouldNotTune',
  '選局できませんでした',
)

export const 断り_driver未接続: Story = refused(
  'driverUnavailable',
  'driver 未接続',
)

export const 断り_同時本数上限: Story = {
  ...refused('tooManyAlready', '同時に配信できる本数の上限です', {
    ceiling: { running: 4, atOnce: 4 },
    looks: true,
  }),
  play: async (context) => {
    await refused('tooManyAlready', '同時に配信できる本数の上限です', {
      ceiling: { running: 4, atOnce: 4 },
      looks: true,
    }).play?.(context)

    await expect(
      within(context.canvasElement).getByText('実行中 4 本 / 上限 4 本'),
    ).toBeVisible()
  },
}

export const 断り_トランスコーダ起動失敗: Story = refused(
  'transcoderWouldNotStart',
  '再生を開始できませんでした',
)

function ended(why: LiveSupplyEnd, title: string): Story {
  return {
    args: { openSocket: ending(why) },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement)

      await expect(await canvas.findByText(title)).toBeVisible()
      await expect(canvas.getByRole('button', { name: '再試行' })).toBeEnabled()
      await expect(canvas.queryByText('生放送')).toBeNull()
    },
  }
}

export const 撤収_録画に奪われた: Story = ended(
  'takenForARecording',
  '録画のために切れました',
)

export const 撤収_driver停止処理: Story = ended(
  'driverDraining',
  'サーバが停止処理に入りました',
)

export const 撤収_視聴時間の上限: Story = ended(
  'windowClosed',
  '視聴時間の上限に達しました',
)

export const 撤収_チューナー停止: Story = ended(
  'tunerFailed',
  'チューナーが停止しました',
)

export const 撤収_別の操作で停止: Story = ended(
  'stoppedByAnother',
  '別の操作で停止されました',
)

export const 撤収_driver消失: Story = ended('driverLost', 'driver 消失')

export const 撤収_配信終了: Story = ended('letGo', '配信が終了しました')

/**
 * The wire closed without a word and the session is gone with it. The socket
 * is not reopened: the one way on is to sign in, and the way back is this
 * channel.
 */
export const セッション切れ: Story = {
  args: { openSocket: dropping, askSignedOut: signedOut },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      await canvas.findByText('セッションが切れました'),
    ).toBeVisible()
    await expect(
      canvas.getByRole('link', { name: 'ログイン' }),
    ).toHaveAttribute('href', '/login?next=%2Flive%3Fch%3D32736-1024')
    await expect(canvas.queryByRole('button', { name: '再試行' })).toBeNull()

    // One wire, and no second one opened behind the reader's back.
    await expect(opened).toHaveLength(1)
  },
}

/**
 * The wire closed without a word and the session still stands. Nothing is
 * retried on its own; the press that asks again is here, and it opens a new
 * wire.
 */
export const 接続が切れた: Story = {
  args: { openSocket: dropping },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByText('接続が切れました')).toBeVisible()
    await expect(opened).toHaveLength(1)

    await userEvent.click(canvas.getByRole('button', { name: '再試行' }))

    await waitFor(() => expect(opened).toHaveLength(2))
  },
}

/**
 * The press after a lost wire opens the next one, and the startup over the
 * picture says it is a reconnection and which one — not the words a channel
 * tuned for the first time gets. Nothing counts down beside it: the wire is
 * reopened by the press and by nothing else.
 */
export const 再接続中: Story = {
  args: { openSocket: droppingOnce },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByText('接続が切れました')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: '再試行' }))

    await expect(await canvas.findByText('再接続中')).toBeVisible()
    await expect(canvas.getByText('1 回目')).toBeVisible()
    await expect(canvas.queryByText('チャンネルを準備しています')).toBeNull()
    await expect(canvas.getByText('準備中')).toBeVisible()
    await waitFor(() => expect(canvas.getByText('0.5 秒')).toBeVisible())
    await expect(opened).toHaveLength(2)
  },
}

/**
 * The wire has said a picture and the element has nothing to draw yet: the
 * startup plate is down, the channel reads as on air, and the one word over
 * the picture is that it is buffering.
 */
export const バッファリング: Story = {
  args: { openSocket: stalling },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByText('バッファリング中')).toBeVisible()
    await expect(canvas.getByText('生放送')).toBeVisible()
    await expect(canvas.queryByText('チャンネルを準備しています')).toBeNull()
    await expect(
      canvasElement.querySelector('[data-slot="live-player"]'),
    ).toHaveAttribute('data-phase', 'buffering')
  },
}

/** The canvas the captions are laid on, as the story's canvas element. */
function captionLayer(canvasElement: HTMLElement): HTMLElement {
  const layer = canvasElement.querySelector('[data-slot="live-captions"]')

  if (!(layer instanceof HTMLElement)) {
    throw new Error('the caption layer is not on the screen')
  }

  return layer
}

/**
 * A caption on the wire, drawn over the picture as soon as the playhead has
 * reached its stamp. The switch on the bar is on, as it starts.
 */
export const 字幕あり: Story = {
  args: { openSocket: captioned },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(captionLayer(canvasElement)).toHaveAttribute(
        'data-caption',
        'shown',
      ),
    )
    await expect(canvas.getByRole('button', { name: '字幕' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  },
}

/** The caption was taken off by an empty frame, and the layer is clear. */
export const 字幕なし: Story = {
  args: { openSocket: uncaptioned },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await canvas.findByText('チャンネルを準備しています')
    await waitFor(() =>
      expect(captionLayer(canvasElement)).toHaveAttribute(
        'data-caption',
        'none',
      ),
    )
  },
}

/**
 * The switch stops the drawing and nothing else: what is showing is gone from
 * the layer while it is off, and back the moment it is on again.
 */
export const 字幕を消す: Story = {
  args: { openSocket: captioned },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(captionLayer(canvasElement)).toHaveAttribute(
        'data-caption',
        'shown',
      ),
    )

    const toggle = canvas.getByRole('button', { name: '字幕' })

    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(captionLayer(canvasElement)).toHaveAttribute(
      'data-caption',
      'off',
    )

    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(captionLayer(canvasElement)).toHaveAttribute(
      'data-caption',
      'shown',
    )
  },
}

/** A header this browser cannot open a buffer for. */
export const 再生不能: Story = {
  args: { openSocket: undecodable },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      await canvas.findByText('このブラウザでは再生できません'),
    ).toBeVisible()
    await expect(canvas.queryByRole('button', { name: '再試行' })).toBeNull()
  },
}

/** A broadcast type with nothing on it. */
export const 空状態: Story = {
  args: {
    screen: { ...UNCHOSEN, kind: 'bs', channels: [] },
    openSocket: nothingToWatch,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/live', query: { kind: 'bs' } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByText('視聴できるチャンネルがありません'),
    ).toBeVisible()
    await expect(
      canvas.getByRole('link', { name: 'チャンネル設定へ' }),
    ).toHaveAttribute('href', '/settings/channels')
    await expect(canvas.getByRole('button', { name: 'BS' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  },
}

/** The live player, as a press on the picture or a tab into the bar leaves it. */
function livePlayer(canvasElement: HTMLElement): HTMLElement {
  const found = canvasElement.querySelector('[data-slot="live-player"]')

  if (!(found instanceof HTMLElement)) {
    throw new Error('the live player is not on the screen')
  }

  return found
}

/** One press, on the player itself, the way the browser sends one. */
function press(on: HTMLElement, key: string) {
  on.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

/** The keys the live player shares with the recording one. */
export const キーで音量と消音: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const level = canvas.getByRole('slider', { name: '音量' })
    const quiet = canvas.getByRole('button', { name: '消音' })
    const player = livePlayer(canvasElement)

    press(player, 'ArrowDown')
    press(player, 'ArrowDown')
    await waitFor(() => expect(level).toHaveValue('90'))

    press(player, 'm')
    await waitFor(() => expect(quiet).toHaveAttribute('aria-pressed', 'true'))

    press(player, 'm')
    await waitFor(() => expect(quiet).toHaveAttribute('aria-pressed', 'false'))
    await expect(level).toHaveValue('90')
  },
}

/**
 * Live has no position, so the arrows that move one are not taken.
 *
 * There is one picture on a live wire and it is the edge: back would leave the
 * seconds the browser is holding and forward has nothing to go into. There is
 * no seek bar on this player for a key to mirror, so the keys are left where
 * they were rather than given a meaning invented for them.
 */
export const 送りと戻しはライブに無い: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = livePlayer(canvasElement)

    await expect(canvas.queryByRole('slider', { name: '再生位置' })).toBeNull()

    const level = canvas.getByRole('slider', { name: '音量' })

    press(player, 'ArrowLeft')
    press(player, 'ArrowRight')

    await expect(level).toHaveValue('100')
    await expect(canvas.getByRole('button', { name: '消音' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  },
}

/**
 * The press area is over a picture and nowhere else. A wire still coming up
 * has its own plate there, and one that faulted has a press on it that has to
 * be reachable.
 */
export const 映像の上だけが押せる: Story = {
  args: { openSocket: stalling },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(
        canvasElement.querySelector('[data-slot="player-press"]'),
      ).not.toBeNull(),
    )
  },
}

/** Faulted, the press on the notice is the only thing over the face. */
export const 失敗中は映像を押せない: Story = {
  args: { openSocket: ending('takenForARecording') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await canvas.findByRole('button', { name: '再試行' })
    await expect(
      canvasElement.querySelector('[data-slot="player-press"]'),
    ).toBeNull()
  },
}
