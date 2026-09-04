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
  type LiveRefusalDetail,
  type LiveStartup,
  type LiveSupplyEnd,
  type TranscodeCeiling,
} from '@/lib/live-wire'
import type { LiveScreen } from '@/repository/live'
import { LIVE_SCREEN_FIXTURE } from '@/repository/live.fixtures'
import { CHANNELS_FOLDED_KEY } from '@/hooks/useChannelsFolded'
import { LIVE_SUB_CHANNELS_FOLDED_KEY } from '@/hooks/useLiveSubChannelsFolded'
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

function refusing(
  refusal: LiveRefusal,
  over: { ceiling?: TranscodeCeiling; detail?: LiveRefusalDetail } = {},
) {
  return scripted((socket) => {
    socket.say(frameOf('control', 0, refusalPayload(refusal, over)))
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
    window.localStorage.removeItem(CHANNELS_FOLDED_KEY)
    window.localStorage.removeItem(LIVE_SUB_CHANNELS_FOLDED_KEY)
  },
} satisfies Meta<typeof LiveView>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Nothing chosen: the screen is the channels, laid out across it as cards with
 * what is on each. No player stands on it, because there is nothing to put in
 * one. Pressing a card puts the channel in the URL, and nothing is asked of
 * the API until then.
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
    await expect(
      canvasElement.querySelector('[data-slot="live-player"]'),
    ).toBeNull()
    await expect(
      canvasElement.querySelector('[data-slot="channel-grid"]'),
    ).toBeVisible()

    // What is on now is the largest thing on a card, and the station the line
    // above it.
    await expect(canvas.getAllByText('ニュースの視点9')[0]).toBeVisible()
    await expect(canvas.getAllByText('21:00–22:00')[0]).toBeVisible()
    await expect(canvas.getAllByText(/クローズアップ列島/)[0]).toBeVisible()

    // The width the screen is read at is the step, not the whole window: there
    // is no picture yet to spend the window on.
    await expect(
      canvasElement.querySelector('[data-slot="screen-main"]'),
    ).toHaveAttribute('data-width', 'default')

    await userEvent.click(canvas.getByRole('button', { name: /みなと教育1/ }))

    // Pushed, not written over: the screen the reader is standing on is the
    // one back has to come to, and rewriting it sent back out of the live
    // screen the moment a channel was pressed.
    await expect(getRouter().push).toHaveBeenCalledWith('/live?ch=32737-1032', {
      scroll: false,
    })
    await expect(getRouter().replace).not.toHaveBeenCalled()
  },
}

/**
 * The splits are all there by default, repetitions and all: a channel that can
 * be tuned is one whose card can be read, and which of them are repeating
 * changes hour by hour.
 */
export const 副チャンネルを出している: Story = {
  args: { screen: UNCHOSEN, openSocket: nothingToWatch },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/live' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('button', { name: '副チャンネル' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      canvas.getByRole('button', { name: /みなと総合2/ }),
    ).toBeVisible()
    await expect(
      canvas.getByRole('button', { name: /湾岸放送2/ }),
    ).toBeVisible()
  },
}

/**
 * Folded, the splits showing nothing their station is not showing come out —
 * and the one running a schedule of its own stays, with what only it is
 * showing.
 */
export const 副チャンネルを畳んでいる: Story = {
  args: { screen: UNCHOSEN, openSocket: nothingToWatch },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/live' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const fold = canvas.getByRole('button', { name: '副チャンネル' })

    await userEvent.click(fold)

    await expect(fold).toHaveAttribute('aria-pressed', 'false')
    await expect(
      canvas.queryByRole('button', { name: /みなと総合2/ }),
    ).toBeNull()
    await expect(
      canvas.getByRole('button', { name: /みなと総合1/ }),
    ).toBeVisible()
    await expect(
      canvas.getByRole('button', { name: /湾岸放送2/ }),
    ).toBeVisible()
    await expect(
      window.localStorage.getItem(LIVE_SUB_CHANNELS_FOLDED_KEY),
    ).toBe('folded')
  },
}

/**
 * A line-up with no repetition in it is one the press cannot change, so the
 * press is not drawn.
 */
export const 畳む先が無いときは出さない: Story = {
  args: {
    screen: {
      ...UNCHOSEN,
      channels: UNCHOSEN.channels.filter(
        (channel) => channel.id !== '32736-1025',
      ),
    },
    openSocket: nothingToWatch,
  },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/live' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.queryByRole('button', { name: '副チャンネル' }),
    ).toBeNull()
  },
}

/**
 * Watching one channel and choosing another is an entry of its own, so back is
 * the channel before it rather than the screen the reader entered from. The
 * broadcast type goes the same way, as every other list in Vela puts a filter
 * in the history.
 */
export const 選局は履歴に積む: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: /みなと教育1/ }))
    await expect(getRouter().push).toHaveBeenCalledWith('/live?ch=32737-1032', {
      scroll: false,
    })

    await userEvent.click(canvas.getByRole('button', { name: 'BS' }))
    await expect(getRouter().push).toHaveBeenCalledWith(
      '/live?ch=32736-1024&kind=bs',
      { scroll: false },
    )

    await expect(getRouter().replace).not.toHaveBeenCalled()
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
 * The sound is answered on the picture here as it is on a recording, with the
 * speaker at its new level and the level in words.
 *
 * Seeking is not answered, because seeking is not taken: the live picture is
 * one edge with nowhere to go back to and nothing to go forward into, so ← →
 * are left to the browser (v3.24) and there is no mark for them.
 */
export const キーの印: Story = {
  args: { openSocket: stalling },
  play: async ({ canvasElement }) => {
    const player = livePlayer(canvasElement)
    const said = () =>
      canvasElement.querySelector('[data-slot="player-center-bezel-text"]')

    await expect(said()).toBeNull()

    aim(player)
    press(player, 'ArrowDown')
    await waitFor(() => expect(said()).toHaveTextContent('95%'))

    press(player, 'm')
    await waitFor(() => expect(said()).toHaveTextContent('0%'))

    press(player, 'm')
    await waitFor(() => expect(said()).toHaveTextContent('95%'))

    // Nothing at the side: there is no seek on the live picture to answer.
    press(player, 'ArrowRight')
    await expect(
      canvasElement.querySelector('[data-slot="player-seek-flash"]'),
    ).toBeNull()
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
    await expect(canvas.getByText('選局').closest('li')).toHaveAttribute(
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
  over: {
    ceiling?: TranscodeCeiling
    detail?: LiveRefusalDetail
    retries?: boolean
    looks?: boolean
  } = {},
): Story {
  return {
    args: {
      openSocket: refusing(refusal, {
        ceiling: over.ceiling,
        detail: over.detail,
      }),
    },
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

      // Nothing arrived and nothing will, so the bar that works a picture is
      // not laid over the face. What is on it — the reason, and the retry —
      // is the whole of what there is to press.
      for (const control of ['再生', '字幕', '消音', '全画面']) {
        await expect(canvas.queryByRole('button', { name: control })).toBeNull()
      }
    },
  }
}

export const 断り_チャンネルなし: Story = refused(
  'noSuchChannel',
  'チャンネルが見つかりません',
  { retries: false },
)

/**
 * The wire says nothing about what has the tuner, so neither does the screen.
 */
export const 断り_チューナー枯渇: Story = refused(
  'noTunerFree',
  '空いているチューナーがありません',
  { looks: true },
)

/**
 * A recording has it. It comes back at an hour the guide already shows, so the
 * press that asks again is worth drawing.
 */
export const 断り_チューナー枯渇_録画: Story = refused(
  'noTunerFree',
  'チューナーは録画に使われています',
  { detail: { of: 'heldBy', holder: 'aRecording' }, looks: true },
)

/** Someone else is watching on it. It comes back when they stop. */
export const 断り_チューナー枯渇_別の視聴: Story = refused(
  'noTunerFree',
  'チューナーは別の視聴に使われています',
  { detail: { of: 'heldBy', holder: 'anotherViewer' }, looks: true },
)

/** The wire did not classify the failure, so the screen does not either. */
export const 断り_選局失敗: Story = refused(
  'wouldNotTune',
  '選局できませんでした',
)

/**
 * The aerial was reached and never locked on to. Nothing in the system changes
 * between one press and the next, so there is no press: the same ask is
 * refused the same way, and a control that is always refused is not drawn.
 */
export const 断り_選局失敗_信号を掴めない: Story = refused(
  'wouldNotTune',
  '信号を掴めませんでした',
  { detail: { of: 'tuneFailure', failure: 'noLock' }, retries: false },
)

export const 断り_driver未接続: Story = refused(
  'driverUnavailable',
  'チューナーに接続できません',
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

export const 撤収_driver消失: Story = ended(
  'driverLost',
  'チューナーとの接続が切れました',
)

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

/**
 * A wire that was neither refused nor closed and never carried a picture. The
 * screen stops waiting on its own rather than holding the startup plate for as
 * long as the reader will look at it, and gives the seat up as it goes: a
 * tuner held by a session that will show nothing is one nobody else can have.
 */
export const 起動が終わらない: Story = {
  args: { openSocket: securing, startupDeadlineMs: 700 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      await canvas.findByText('チャンネルを準備しています'),
    ).toBeVisible()

    await expect(
      await canvas.findByText('映像が始まりませんでした', undefined, {
        timeout: 4000,
      }),
    ).toBeVisible()
    await expect(canvas.queryByText('チャンネルを準備しています')).toBeNull()
    await expect(canvas.getByRole('button', { name: '再試行' })).toBeVisible()

    await waitFor(() => expect(opened[0]?.readyState).toBe(3))
    await expect(opened[0]?.sent.length).toBeGreaterThan(0)
  },
}

/**
 * A wire refused at once never carries a picture either, so the clock that
 * waits out a silent startup must not reach past the refusal and rename it.
 * The channel that does not exist is still the channel that does not exist a
 * minute later, and the press it deliberately does not offer stays absent.
 */
export const 断りは時間で書き換わらない: Story = {
  args: { openSocket: refusing('noSuchChannel'), startupDeadlineMs: 300 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      await canvas.findByText('チャンネルが見つかりません'),
    ).toBeVisible()

    await new Promise((rest) => setTimeout(rest, 1200))

    await expect(canvas.getByText('チャンネルが見つかりません')).toBeVisible()
    await expect(canvas.queryByText('映像が始まりませんでした')).toBeNull()
    await expect(canvas.queryByRole('button', { name: '再試行' })).toBeNull()
  },
}

/**
 * Nothing anywhere: the aerial has never been scanned, and the way on is the
 * screen that scans it. There is no type bar either — three tabs onto this one
 * panel would be three presses that change nothing.
 */
export const 空状態: Story = {
  args: {
    screen: { ...UNCHOSEN, kind: 'terrestrial', kinds: [], channels: [] },
    openSocket: nothingToWatch,
  },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/live' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByText('視聴できるチャンネルがありません'),
    ).toBeVisible()
    await expect(
      canvas.getByRole('link', { name: 'チャンネル設定へ' }),
    ).toHaveAttribute('href', '/settings/channels')
    await expect(canvas.queryByRole('group', { name: '放送の種別' })).toBeNull()

    // Nothing to choose from is one reading, not two: no grid stands beside
    // the panel saying the same thing a second way.
    await expect(
      canvasElement.querySelector('[data-slot="channel-grid"]'),
    ).toBeNull()
  },
}

/**
 * A link named a broadcast type this aerial carries nothing on, while another
 * type carries twenty-seven. Saying there is nothing to watch would be false,
 * and the channel settings are not the way on: the channels are there, and
 * that screen is for adding the ones that are not.
 *
 * The type is answered as the link names it — a URL that says CS110 is not a
 * screen of terrestrial channels — and the way on is the channels there are.
 */
export const 空状態_この種別にチャンネルが無い: Story = {
  args: {
    screen: {
      ...UNCHOSEN,
      kind: 'cs110',
      kinds: ['terrestrial'],
      channels: [],
    },
    openSocket: nothingToWatch,
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/live', query: { kind: 'cs110' } },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByText('CS110のチャンネルがありません'),
    ).toBeVisible()
    await expect(
      canvas.queryByText('視聴できるチャンネルがありません'),
    ).toBeNull()
    await expect(
      canvas.queryByRole('link', { name: 'チャンネル設定へ' }),
    ).toBeNull()

    // The press takes the empty type out of the address, which is what puts
    // the screen back on the channels there are.
    await userEvent.click(
      canvas.getByRole('button', { name: '地上のチャンネルへ' }),
    )
    await waitFor(() => expect(getRouter().push).toHaveBeenCalled())
    await expect(getRouter().push.mock.calls[0][0] as string).not.toContain(
      'kind=',
    )
  },
}

/**
 * Only one type has channels, so there is nothing to switch between: a lone
 * tab, already pressed, is a press onto the face it is already on.
 */
export const 種別が1つなら帯を出さない: Story = {
  args: {
    screen: { ...UNCHOSEN, kinds: ['terrestrial'] },
    openSocket: nothingToWatch,
  },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/live' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.queryByRole('group', { name: '放送の種別' })).toBeNull()
    await expect(
      canvasElement.querySelector('[data-slot="channel-grid"]'),
    ).not.toBeNull()
  },
}

/**
 * No tuner is written down, so nothing on this screen can be watched whichever
 * channel is pressed and whichever broadcast type is looked under. The grid and
 * the type bar both come down: three tabs leading to this same panel would be
 * three presses that change nothing.
 */
export const 空状態_チューナーなし: Story = {
  args: {
    screen: { ...UNCHOSEN, tuners: 0 },
    openSocket: nothingToWatch,
  },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/live' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByText('チューナーが登録されていません'),
    ).toBeVisible()
    await expect(
      canvas.getByRole('link', { name: 'チューナー設定へ' }),
    ).toHaveAttribute('href', '/settings/tuners')

    // The channels are not offered, and neither is the choice of which ones to
    // be offered: both would be presses that cannot lead to a picture.
    await expect(
      canvasElement.querySelector('[data-slot="channel-grid"]'),
    ).toBeNull()
    await expect(canvas.queryByRole('button', { name: '地上' })).toBeNull()
  },
}

/**
 * The tuners could not be counted, which is not the same as there being none.
 * A screen that said there were none because it failed to ask would send the
 * reader off to add the tuners they already have.
 */
export const 空状態_チューナーが数えられない: Story = {
  args: {
    screen: { ...UNCHOSEN, tuners: undefined },
    openSocket: nothingToWatch,
  },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/live' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.queryByText('チューナーが登録されていません'),
    ).toBeNull()
    await expect(
      canvasElement.querySelector('[data-slot="channel-grid"]'),
    ).not.toBeNull()
  },
}

/**
 * The channels are there and can be tuned; it is the guide behind them that
 * has not been collected. Every card saying it has no programme leaves a reader
 * looking at a screenful of channels that all appear to be broken, so the panel
 * goes under the grid — the channels are still what the screen is for — rather
 * than in place of it.
 */
export const 空状態_番組情報なし: Story = {
  args: {
    screen: {
      ...UNCHOSEN,
      channels: UNCHOSEN.channels.map((channel) => ({
        ...channel,
        now: undefined,
        next: undefined,
        progressPct: undefined,
      })),
    },
    openSocket: nothingToWatch,
  },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/live' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // The cards stay, and stay pressable: a channel with no programme listed
    // is still a channel that tunes.
    await expect(
      canvasElement.querySelectorAll('[data-slot="channel-grid"] > li').length,
    ).toBe(UNCHOSEN.channels.length)
    await expect(canvas.getAllByText('番組情報がありません').length).toBe(
      UNCHOSEN.channels.length,
    )

    await expect(canvas.getByText('EPG をまだ取得していません')).toBeVisible()
    await expect(
      canvas.getByRole('link', { name: 'EPG 取得の状況を見る' }),
    ).toHaveAttribute('href', '/guide')
  },
}

/**
 * One channel between programmes is that channel's own silence, not the
 * guide's, so the panel is not out.
 */
export const 番組情報が一部だけ無いときは言わない: Story = {
  args: {
    screen: {
      ...UNCHOSEN,
      channels: UNCHOSEN.channels.map((channel, at) =>
        at === 0
          ? { ...channel, now: undefined, progressPct: undefined }
          : channel,
      ),
    },
    openSocket: nothingToWatch,
  },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/live' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Cards with a programme and cards without, standing side by side: this is
    // the line-up as it comes, not a guide that failed to arrive.
    const silent = canvas.getAllByText('番組情報がありません')

    await expect(silent.length).toBeLessThan(UNCHOSEN.channels.length)
    await expect(silent.length).toBeGreaterThan(0)
    await expect(canvas.queryByText('EPG をまだ取得していません')).toBeNull()
  },
}

/**
 * Watching, the list folds away on one press and the picture takes the width
 * it leaves. Folded, the types and the rows are out of the page, and the press
 * that brings them back is what is left of the list.
 */
export const 一覧を畳む: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const fold = canvas.getByRole('button', { name: 'チャンネル一覧' })

    await expect(fold).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.getByRole('button', { name: '地上' })).toBeVisible()

    const wide = canvasElement.querySelector('main aside')?.clientWidth ?? 0

    await userEvent.click(fold)

    await expect(fold).toHaveAttribute('aria-expanded', 'false')
    await expect(canvas.queryByRole('button', { name: '地上' })).toBeNull()
    await expect(
      canvasElement.querySelector('main aside')?.clientWidth ?? 0,
    ).toBeLessThan(wide)
    await expect(window.localStorage.getItem(CHANNELS_FOLDED_KEY)).toBe(
      'folded',
    )

    await userEvent.click(fold)

    await expect(fold).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.getByRole('button', { name: '地上' })).toBeVisible()
  },
}

/** A fold made earlier is the state the screen comes back in. */
export const 畳んだまま開く: Story = {
  beforeEach: () => {
    opened.length = 0
    window.localStorage.setItem(CHANNELS_FOLDED_KEY, 'folded')
    window.localStorage.removeItem(LIVE_SUB_CHANNELS_FOLDED_KEY)
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('button', { name: 'チャンネル一覧' }),
    ).toHaveAttribute('aria-expanded', 'false')
    await expect(canvas.queryByRole('button', { name: '地上' })).toBeNull()
  },
}

/**
 * Before a channel is chosen there is no list beside a picture to fold away,
 * so there is no press for it — whatever an earlier fold said.
 */
export const 選局前は畳めない: Story = {
  args: { screen: UNCHOSEN, openSocket: nothingToWatch },
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/live' } },
  },
  beforeEach: () => {
    opened.length = 0
    window.localStorage.setItem(CHANNELS_FOLDED_KEY, 'folded')
    window.localStorage.removeItem(LIVE_SUB_CHANNELS_FOLDED_KEY)
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.queryByRole('button', { name: 'チャンネル一覧' }),
    ).toBeNull()
    await expect(canvas.getByRole('button', { name: '地上' })).toBeVisible()
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

    aim(player)
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

    aim(player)
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

/**
 * The bar is laid over the picture on a wash, and what is being watched sits
 * on a wash of its own at the top. Neither is a plate.
 */
export const 操作列は透かしの上: Story = {
  args: { openSocket: stalling },
  play: async ({ canvasElement }) => {
    const chrome = canvasElement.querySelector('[data-slot="player-chrome"]')
    const title = canvasElement.querySelector('[data-slot="live-title"]')

    await waitFor(() => expect(chrome).toHaveAttribute('data-up', 'true'))
    await expect(getComputedStyle(chrome as Element).backgroundImage).toContain(
      'linear-gradient',
    )
    await expect(getComputedStyle(title as Element).backgroundImage).toContain(
      'linear-gradient',
    )
    // The title comes and goes with the bar: it is the same statement.
    await expect(title).toHaveAttribute('data-up', 'true')
  },
}

/** Stopped, the middle carries the mark, and every press is answered there. */
export const 停止中は中央に印: Story = {
  // A wire that carries a picture and then stalls: there is something to stop,
  // which is what the mark in the middle is about. `captioned` sends captions
  // and no picture, so nothing there is ever pressable.
  args: { openSocket: stalling },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // A press only reaches the picture once there is one, so the press area
    // is what says the wire has come up. The transport reads 再生 or 一時停止
    // by what the element is doing; either way it is the control aimed at.
    await waitFor(() =>
      expect(
        canvasElement.querySelector('[data-slot="player-press"]'),
      ).not.toBeNull(),
    )

    // A wire that stalls never reaches playing on its own, so the element is
    // told what it is doing: what is under test is the rule the phase drives,
    // not the decoder. Stopped, the middle carries the standing mark.
    const video = canvasElement.querySelector('video') as HTMLVideoElement

    video.dispatchEvent(new Event('playing'))
    video.dispatchEvent(new Event('pause'))

    await waitFor(() =>
      expect(
        canvasElement.querySelector('[data-slot="player-center-standing"]'),
      ).not.toBeNull(),
    )

    // And the press that starts it again is answered in the middle too. The
    // press is the one on the bar: there are two controls named 再生 on a
    // stopped picture now — the big target in the middle and the small one on
    // the bar — which is the pair WCAG 2.5.5 allows and every real player
    // ships (v3.37). This story is about the bar's.
    const bar = canvasElement.querySelector(
      '[data-slot="player-chrome"]',
    ) as HTMLElement

    await userEvent.click(
      await within(bar).findByRole('button', { name: '再生' }),
    )
    await waitFor(() =>
      expect(
        canvasElement.querySelector('[data-slot="player-center-bezel"] span'),
      ).not.toBeNull(),
    )
  },
}

/** C presses the caption switch, which is the control on the bar it mirrors. */
export const 鍵で字幕: Story = {
  args: { openSocket: captioned },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const player = livePlayer(canvasElement)
    const toggle = await canvas.findByRole('button', { name: '字幕' })

    await expect(toggle).toHaveAttribute('aria-pressed', 'true')

    press(player, 'c')
    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'false'))

    press(player, 'c')
    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'))
  },
}

/** Refused, the bar goes with the picture — nothing on it has anything to act on. */
export const 断られたらバーごと消える: Story = {
  args: { openSocket: ending('takenForARecording') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await canvas.findByRole('button', { name: '再試行' })
    await expect(canvas.queryByRole('button', { name: '全画面' })).toBeNull()
    await expect(canvas.queryByRole('button', { name: '字幕' })).toBeNull()
    await expect(canvas.queryByRole('slider', { name: '音量' })).toBeNull()
  },
}
