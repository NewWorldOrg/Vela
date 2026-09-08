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
import type { LiveBacklog } from '@/repository/live-sessions'
import {
  LIVE_CHANNEL_FIXTURES,
  LIVE_PROFILE_FIXTURES_SOFTWARE,
  LIVE_SCREEN_FIXTURE,
} from '@/repository/live.fixtures'
import { CHANNELS_FOLDED_KEY } from '@/hooks/useChannelsFolded'
import { LIVE_SUB_CHANNELS_FOLDED_KEY } from '@/hooks/useLiveSubChannelsFolded'
import {
  CAPTION_CANVAS_FIXTURE,
  CAPTION_PICTURE_FIXTURE,
} from '@/stories/fixtures/captions'
import { AppFrame } from '@/components/vela/app-shell'
import type {
  AskBacklog,
  LiveSocket,
  OpenSocket,
} from '@/components/live/live-session'
import { LiveView } from '@/components/live/live-page'
import type { TakeCapture } from '@/components/recordings/take-capture'

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

const opened: ScriptedSocket[] = []

function scripted(script: (socket: ScriptedSocket) => void): OpenSocket {
  return (href) => {
    const socket = new ScriptedSocket(href, script)

    opened.push(socket)

    return socket
  }
}

function progress(startup: LiveStartup): Uint8Array {
  return frameOf('control', 0, progressPayload(startup))
}

const SECURED: LiveStartup = { tunerSecured: 496, transcoderStarted: 511 }

const LOCKED: LiveStartup = { ...SECURED, channelLocked: 751 }

const starting = scripted((socket) => {
  socket.say(progress(SECURED))
  setTimeout(() => socket.say(progress(LOCKED)), 255)
})

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

const dropping = scripted((socket) => socket.drop(1006))

const droppingOnce = scripted((socket) => {
  if (opened.length === 1) {
    socket.drop(1006)
  } else {
    socket.say(progress(SECURED))
  }
})

const PICTURED = frameOf(
  'picture',
  0,
  new Uint8Array([0, 0, 0, 8, 0x6d, 0x6f, 0x6f, 0x66]),
)

const stalling = scripted((socket) => {
  socket.say(progress(LOCKED))
  socket.say(PICTURED)
})

const CAPTION_CANVAS = frameOf(
  'captionHeader',
  0,
  captionCanvasPayload(CAPTION_CANVAS_FIXTURE),
)

const CAPTION_SHOWN = frameOf(
  'caption',
  0,
  captionPayload(CAPTION_PICTURE_FIXTURE),
)

const CAPTION_CLEARED = frameOf('caption', 0, new Uint8Array(0))

const captioned = scripted((socket) => {
  socket.say(progress(SECURED))
  socket.say(CAPTION_CANVAS)
  socket.say(CAPTION_SHOWN)
})

const uncaptioned = scripted((socket) => {
  socket.say(progress(SECURED))
  socket.say(CAPTION_CANVAS)
  socket.say(CAPTION_SHOWN)
  socket.say(CAPTION_CLEARED)
})

const HEADERLESS = frameOf(
  'pictureHeader',
  0,
  new Uint8Array([0, 0, 0, 8, 0x66, 0x74, 0x79, 0x70]),
)

const undecodable = scripted((socket) => socket.say(HEADERLESS))

function box(type: string, ...payload: (Uint8Array | number[])[]): Uint8Array {
  const parts = payload.map((part) =>
    part instanceof Uint8Array ? part : new Uint8Array(part),
  )
  const bytes = new Uint8Array(
    8 + parts.reduce((sum, part) => sum + part.length, 0),
  )

  new DataView(bytes.buffer).setUint32(0, bytes.length)
  bytes.set(
    [...type].map((char) => char.charCodeAt(0)),
    4,
  )

  let at = 8

  for (const part of parts) {
    bytes.set(part, at)
    at += part.length
  }

  return bytes
}

const CODECS_BUT_NO_TRACK = frameOf(
  'pictureHeader',
  0,
  box(
    'moov',
    box(
      'trak',
      box(
        'mdia',
        box(
          'minf',
          box(
            'stbl',
            box(
              'stsd',
              [0, 0, 0, 0, 0, 0, 0, 1],
              box('avc1', new Uint8Array(78), box('avcC', [1, 0x64, 0, 0x1f])),
            ),
          ),
        ),
      ),
    ),
  ),
)

const unappendable = scripted((socket) => {
  socket.say(progress(SECURED))
  socket.say(CODECS_BUT_NO_TRACK)
})

const closingCleanly = scripted((socket) => socket.drop(1000))

const nothingToWatch = () => {
  throw new Error('no channel was chosen, so no wire is opened')
}

const stillSignedIn = async () => false

const probed: string[] = []

const probing = async () => {
  probed.push('whether the session is still ours')

  return false
}

const signedOut = async () => true

const uncounted: AskBacklog = async () => undefined

function counting(dropped: number[]): AskBacklog {
  let asked = 0

  return async () => {
    const read: LiveBacklog = {
      dropped: dropped[Math.min(asked, dropped.length - 1)],
      queued: 0,
    }

    asked += 1

    return read
  }
}

const CHOSEN: LiveScreen = LIVE_SCREEN_FIXTURE

const UNCHOSEN: LiveScreen = { ...LIVE_SCREEN_FIXTURE, watching: undefined }

const MANY: LiveScreen = {
  ...LIVE_SCREEN_FIXTURE,
  channels: Array.from({ length: 34 }, (unused, nth) => ({
    ...LIVE_CHANNEL_FIXTURES[nth % LIVE_CHANNEL_FIXTURES.length],
    id: nth === 0 ? LIVE_CHANNEL_FIXTURES[0].id : `32800-${2000 + nth}`,
    serviceId: 2000 + nth,
    no: `${nth + 1}`,
    kind: 'terrestrial' as const,
    sub: false,
    whole: undefined,
  })),
}

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
    askBacklog: uncounted,
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
    probed.length = 0
    window.localStorage.removeItem(CHANNELS_FOLDED_KEY)
    window.localStorage.removeItem(LIVE_SUB_CHANNELS_FOLDED_KEY)
  },
} satisfies Meta<typeof LiveView>

export default meta
type Story = StoryObj<typeof meta>

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

    await expect(canvas.getAllByText('ニュースの視点9')[0]).toBeVisible()
    await expect(canvas.getAllByText('21:00–22:00')[0]).toBeVisible()
    await expect(canvas.getAllByText(/クローズアップ列島/)[0]).toBeVisible()

    await expect(
      canvasElement.querySelector('[data-slot="screen-main"]'),
    ).toHaveAttribute('data-width', 'default')

    await userEvent.click(canvas.getByRole('button', { name: /みなと教育1/ }))

    await expect(getRouter().push).toHaveBeenCalledWith('/live?ch=32737-1032', {
      scroll: false,
    })
    await expect(getRouter().replace).not.toHaveBeenCalled()
  },
}

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

    await expect(opened[0].href).toBe(
      '/api/live/ws?network=32736&service=1024&profile=1080p60',
    )

    await expect(canvas.getByRole('button', { name: '再生' })).toBeDisabled()
  },
}

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

    press(player, 'ArrowRight')
    await expect(
      canvasElement.querySelector('[data-slot="player-seek-flash"]'),
    ).toBeNull()
  },
}

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

export const 画質は_API_が既定と言うもので開く: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await canvas.findByText('チャンネルを準備しています')
    await expect(opened[0].href).toContain('profile=1080p60')

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const quality = await screen.findByRole('group', { name: '画質' })

    await expect(
      within(quality).getByRole('button', { name: '1080p60' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const 画質は機械が変われば変わる: Story = {
  args: {
    screen: { ...CHOSEN, profiles: LIVE_PROFILE_FIXTURES_SOFTWARE },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await canvas.findByText('チャンネルを準備しています')
    await expect(opened[0].href).toContain('profile=720p30')

    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const quality = await screen.findByRole('group', { name: '画質' })

    await expect(
      within(quality).getByRole('button', { name: '720p30' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const 画質が一つも無ければ開かない: Story = {
  args: {
    screen: { ...CHOSEN, profiles: [] },
    openSocket: nothingToWatch,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(livePlayer(canvasElement)).toBeVisible()
    await expect(opened).toHaveLength(0)
    await expect(canvas.queryByRole('button', { name: '設定' })).toBeNull()
  },
}

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

    await expect(opened[0].sent.map((frame) => [...frame])).toContainEqual([
      0x40, 0, 0, 0, 0, 0, 0, 0, 0, 0x03,
    ])
    await expect(opened[0].readyState).toBe(3)
  },
}

export const ドロップを数える: Story = {
  args: { openSocket: stalling, askBacklog: counting([18, 19]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await canvas.findByText('チャンネルを準備しています')
    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const gear = await screen.findByRole('dialog', { name: '設定' })
    const dropped = () =>
      gear.querySelector('[data-slot="live-dropped"]')?.textContent

    await waitFor(() => expect(dropped()).toBe('18 件'))
    await expect(within(gear).getByText('ドロップ')).toBeVisible()
    await expect(within(gear).queryByText(/捨てた/)).toBeNull()

    await waitFor(() => expect(dropped()).toBe('19 件'), { timeout: 5000 })
  },
}

export const ドロップが読めなければ出さない: Story = {
  args: { openSocket: stalling, askBacklog: uncounted },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await canvas.findByText('チャンネルを準備しています')
    await userEvent.click(canvas.getByRole('button', { name: '設定' }))

    const gear = await screen.findByRole('dialog', { name: '設定' })

    await expect(
      within(gear).getByRole('group', { name: '画質' }),
    ).toBeVisible()
    await expect(within(gear).queryByText('ドロップ')).toBeNull()
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

export const 断り_チューナー枯渇: Story = refused(
  'noTunerFree',
  '空いているチューナーがありません',
  { looks: true },
)

export const 断り_チューナー枯渇_録画: Story = refused(
  'noTunerFree',
  'チューナーは録画に使われています',
  { detail: { of: 'heldBy', holder: 'aRecording' }, looks: true },
)

export const 断り_チューナー枯渇_別の視聴: Story = refused(
  'noTunerFree',
  'チューナーは別の視聴に使われています',
  { detail: { of: 'heldBy', holder: 'anotherViewer' }, looks: true },
)

export const 断り_選局失敗: Story = refused(
  'wouldNotTune',
  '選局できませんでした',
)

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

    await expect(opened).toHaveLength(1)
  },
}

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

function captionLayer(canvasElement: HTMLElement): HTMLElement {
  const layer = canvasElement.querySelector('[data-slot="live-captions"]')

  if (!(layer instanceof HTMLElement)) {
    throw new Error('the caption layer is not on the screen')
  }

  return layer
}

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

export const 映像を受け付けられない: Story = {
  args: { openSocket: unappendable },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      await canvas.findByText('映像を再生できなくなりました'),
    ).toBeVisible()
    await expect(
      canvas.queryByText('このブラウザでは再生できません'),
    ).toBeNull()
    await expect(canvas.getByRole('button', { name: '再試行' })).toBeEnabled()
    await waitFor(() => expect(opened[0]?.readyState).toBe(3))
  },
}

export const 何も言わずに閉じた: Story = {
  args: { openSocket: closingCleanly, askSignedOut: probing },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(await canvas.findByText('配信が終了しました')).toBeVisible()
    await expect(canvas.queryByText('接続が切れました')).toBeNull()
    await expect(canvas.getByRole('button', { name: '再試行' })).toBeEnabled()
    await expect(probed).toHaveLength(0)
  },
}

export const 失敗すれば字幕は残らない: Story = {
  args: { openSocket: captioned },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(captionLayer(canvasElement)).toHaveAttribute(
        'data-caption',
        'shown',
      ),
    )

    opened[0].say(frameOf('control', 0, endingPayload('takenForARecording')))
    opened[0].drop(1000)

    await expect(
      await canvas.findByText('録画のために切れました'),
    ).toBeVisible()
    await waitFor(() =>
      expect(captionLayer(canvasElement)).toHaveAttribute('data-drawn', 'no'),
    )
    await expect(captionLayer(canvasElement)).toHaveAttribute(
      'data-caption',
      'off',
    )
  },
}

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

    await expect(
      canvasElement.querySelector('[data-slot="channel-grid"]'),
    ).toBeNull()
  },
}

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

    await userEvent.click(
      canvas.getByRole('button', { name: '地上のチャンネルへ' }),
    )
    await waitFor(() => expect(getRouter().push).toHaveBeenCalled())
    await expect(getRouter().push.mock.calls[0][0] as string).not.toContain(
      'kind=',
    )
  },
}

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

    await expect(
      canvasElement.querySelector('[data-slot="channel-grid"]'),
    ).toBeNull()
    await expect(canvas.queryByRole('button', { name: '地上' })).toBeNull()
  },
}

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

    const silent = canvas.getAllByText('番組情報がありません')

    await expect(silent.length).toBeLessThan(UNCHOSEN.channels.length)
    await expect(silent.length).toBeGreaterThan(0)
    await expect(canvas.queryByText('EPG をまだ取得していません')).toBeNull()
  },
}

function asideWidth(canvasElement: HTMLElement): number {
  return canvasElement.querySelector('main aside')?.clientWidth ?? 0
}

function foldPhaseOf(canvasElement: HTMLElement): string | null {
  return (
    canvasElement
      .querySelector('[data-slot="channel-list"]')
      ?.getAttribute('data-fold') ?? null
  )
}

function rowDelaysOf(canvasElement: HTMLElement): string[] {
  return [
    ...canvasElement.querySelectorAll<HTMLElement>(
      '[data-slot="channel-list"] li',
    ),
  ].map((one) => one.style.transitionDelay)
}

function listWidth(canvasElement: HTMLElement): number {
  return (
    canvasElement.querySelector('[data-slot="channel-list"]')?.clientWidth ?? 0
  )
}

function columnRunning(canvasElement: HTMLElement): string[] {
  const aside = canvasElement.querySelector('main aside')

  return (aside?.getAnimations() ?? []).map((one) =>
    one instanceof CSSTransition ? one.transitionProperty : '',
  )
}

function transitionOn(
  element: Element | null,
  property: string,
): CSSTransition | undefined {
  return (element?.getAnimations() ?? []).find(
    (one): one is CSSTransition =>
      one instanceof CSSTransition && one.transitionProperty === property,
  )
}

function runsFor(element: Element | null, property: string): number {
  const took = transitionOn(element, property)?.effect?.getComputedTiming()
    .duration

  return typeof took === 'number' ? took : 0
}

function waitsFor(element: Element | null, property: string): number {
  const held = transitionOn(element, property)?.effect?.getComputedTiming()
    .delay

  return typeof held === 'number' ? held : 0
}

function firstRow(canvasElement: HTMLElement): Element | null {
  return canvasElement.querySelector('[data-slot="channel-list"] li')
}

function foldLengths(canvasElement: HTMLElement): {
  column: number
  band: number
} {
  return {
    column: runsFor(canvasElement.querySelector('main aside'), 'width'),
    band: runsFor(firstRow(canvasElement), 'translate'),
  }
}

function rowTravelOf(canvasElement: HTMLElement): number {
  const row = firstRow(canvasElement)
  const listed = canvasElement.querySelector('[data-slot="channel-list"] ul')

  if (row === null || listed === null) {
    return Number.NaN
  }

  return Math.round(
    row.getBoundingClientRect().left - listed.getBoundingClientRect().left,
  )
}

function pageScrollsSideways(): boolean {
  const page = document.documentElement

  return page.scrollWidth > page.clientWidth
}

function foldRunning(canvasElement: HTMLElement): Animation[] {
  const listed = canvasElement.querySelector('[data-slot="channel-list"]')
  const press = listed?.querySelector('button[aria-label="チャンネル一覧"]')

  return (listed?.getAnimations({ subtree: true }) ?? []).filter((one) => {
    const moved =
      one.effect instanceof KeyframeEffect ? one.effect.target : null

    return moved !== null && press?.contains(moved) !== true
  })
}

function askedForLessMotion(): () => void {
  const asked = window.matchMedia.bind(window)

  window.matchMedia = ((query: string) =>
    query.includes('prefers-reduced-motion')
      ? ({
          matches: true,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        } as MediaQueryList)
      : asked(query)) as typeof window.matchMedia

  return () => {
    window.matchMedia = asked
  }
}

export const 一覧を畳む: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const fold = canvas.getByRole('button', { name: 'チャンネル一覧' })

    await expect(fold).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.getByRole('button', { name: '地上' })).toBeVisible()

    const wide = asideWidth(canvasElement)

    await userEvent.click(fold)

    await expect(fold).toHaveAttribute('aria-expanded', 'false')
    await expect(window.localStorage.getItem(CHANNELS_FOLDED_KEY)).toBe(
      'folded',
    )

    await waitFor(async () => {
      await expect(canvas.queryByRole('button', { name: '地上' })).toBeNull()
      await expect(asideWidth(canvasElement)).toBeLessThan(wide)
    })

    await userEvent.click(fold)

    await expect(fold).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.getByRole('button', { name: '地上' })).toBeVisible()

    await waitFor(async () => {
      await expect(foldPhaseOf(canvasElement)).toBe('still')
      await expect(asideWidth(canvasElement)).toBe(wide)
    })
  },
}

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
    await expect(foldPhaseOf(canvasElement)).toBe('still')
    await expect(foldRunning(canvasElement)).toHaveLength(0)
    await expect(columnRunning(canvasElement)).toHaveLength(0)
  },
}

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

export const 一覧を開いたまま: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('button', { name: '地上' })).toBeVisible()
    await expect(foldPhaseOf(canvasElement)).toBe('still')
    await expect(foldRunning(canvasElement)).toHaveLength(0)
    await expect(rowDelaysOf(canvasElement).join('')).toBe('')
    await expect(rowTravelOf(canvasElement)).toBe(0)
  },
}

export const 一覧が開くあいだ: Story = {
  beforeEach: () => {
    opened.length = 0
    window.localStorage.setItem(CHANNELS_FOLDED_KEY, 'folded')
    window.localStorage.removeItem(LIVE_SUB_CHANNELS_FOLDED_KEY)
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const fold = canvas.getByRole('button', { name: 'チャンネル一覧' })

    await userEvent.click(fold)

    const phase = foldPhaseOf(canvasElement)
    const delays = rowDelaysOf(canvasElement)
    const running = foldRunning(canvasElement).length

    await expect(phase).toBe('opening')
    await expect(running).toBeGreaterThan(0)
    await expect(columnRunning(canvasElement)).toEqual(['width'])
    await expect(listWidth(canvasElement)).toBe(344)
    await expect(foldLengths(canvasElement)).toEqual({ column: 300, band: 300 })
    await expect(
      waitsFor(canvasElement.querySelector('main aside'), 'width'),
    ).toBe(0)
    await expect(delays).toHaveLength(9)
    await expect(delays[0]).toBe('44ms')
    await expect(delays[1]).toBe('66ms')
    await expect(delays.at(-1)).toBe('220ms')
    await expect(pageScrollsSideways()).toBe(false)

    await waitFor(async () => {
      await expect(foldPhaseOf(canvasElement)).toBe('still')
    })
    await expect(foldRunning(canvasElement)).toHaveLength(0)
  },
}

export const 一覧が閉じるあいだ: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const fold = canvas.getByRole('button', { name: 'チャンネル一覧' })
    const wide = asideWidth(canvasElement)

    await userEvent.click(fold)

    const phase = foldPhaseOf(canvasElement)
    const delays = rowDelaysOf(canvasElement)
    const column = columnRunning(canvasElement)
    const inside = listWidth(canvasElement)

    await expect(phase).toBe('closing')
    await expect(column).toEqual(['width'])
    await expect(inside).toBe(wide)
    await expect(foldLengths(canvasElement)).toEqual({ column: 300, band: 300 })
    await expect(
      waitsFor(canvasElement.querySelector('main aside'), 'width'),
    ).toBe(220)
    await expect(delays).toHaveLength(9)
    await expect(delays[0]).toBe('176ms')
    await expect(delays[1]).toBe('154ms')
    await expect(delays.at(-1)).toBe('0ms')
    await expect(pageScrollsSideways()).toBe(false)

    await waitFor(async () => {
      await expect(asideWidth(canvasElement)).toBeLessThan(wide)
    })
    await waitFor(async () => {
      await expect(foldPhaseOf(canvasElement)).toBe('still')
    })
    await expect(columnRunning(canvasElement)).toHaveLength(0)
  },
}

export const 畳みかけて開き直す: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const fold = canvas.getByRole('button', { name: 'チャンネル一覧' })
    const wide = asideWidth(canvasElement)

    await userEvent.click(fold)
    await expect(foldPhaseOf(canvasElement)).toBe('closing')

    await userEvent.click(fold)

    const phase = foldPhaseOf(canvasElement)
    const delays = rowDelaysOf(canvasElement)

    await expect(phase).toBe('opening')
    await expect(delays.join('')).toBe('')
    await expect(
      waitsFor(canvasElement.querySelector('main aside'), 'width'),
    ).toBe(0)

    await waitFor(async () => {
      await expect(foldPhaseOf(canvasElement)).toBe('still')
    })
    await expect(canvas.getByRole('button', { name: '地上' })).toBeVisible()
    await expect(asideWidth(canvasElement)).toBe(wide)
    await expect(foldRunning(canvasElement)).toHaveLength(0)
  },
}

export const 動きを減らす設定では一息で畳む: Story = {
  beforeEach: () => {
    opened.length = 0
    window.localStorage.removeItem(CHANNELS_FOLDED_KEY)
    window.localStorage.removeItem(LIVE_SUB_CHANNELS_FOLDED_KEY)

    return askedForLessMotion()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const fold = canvas.getByRole('button', { name: 'チャンネル一覧' })
    const wide = asideWidth(canvasElement)

    await userEvent.click(fold)

    await expect(foldPhaseOf(canvasElement)).toBe('still')
    await expect(canvas.queryByRole('button', { name: '地上' })).toBeNull()
    await expect(asideWidth(canvasElement)).toBeLessThan(wide)
    await expect(foldRunning(canvasElement)).toHaveLength(0)
    await expect(columnRunning(canvasElement)).toHaveLength(0)

    await userEvent.click(fold)

    await expect(foldPhaseOf(canvasElement)).toBe('still')
    await expect(canvas.getByRole('button', { name: '地上' })).toBeVisible()
    await expect(asideWidth(canvasElement)).toBe(wide)
    await expect(foldRunning(canvasElement)).toHaveLength(0)
  },
}

export const 長い一覧でも畳みの長さは変わらない: Story = {
  args: { screen: MANY },
  beforeEach: () => {
    opened.length = 0
    window.localStorage.setItem(CHANNELS_FOLDED_KEY, 'folded')
    window.localStorage.removeItem(LIVE_SUB_CHANNELS_FOLDED_KEY)
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const fold = canvas.getByRole('button', { name: 'チャンネル一覧' })

    await userEvent.click(fold)

    const delays = rowDelaysOf(canvasElement)

    await expect(delays).toHaveLength(MANY.channels.length)
    await expect(delays[0]).toBe('44ms')
    await expect(delays[8]).toBe('220ms')
    await expect(new Set(delays.slice(8)).size).toBe(1)

    await waitFor(async () => {
      await expect(foldPhaseOf(canvasElement)).toBe('still')
    })
    await expect(foldRunning(canvasElement)).toHaveLength(0)
  },
}

function livePlayer(canvasElement: HTMLElement): HTMLElement {
  const found = canvasElement.querySelector('[data-slot="live-player"]')

  if (!(found instanceof HTMLElement)) {
    throw new Error('the live player is not on the screen')
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
    await expect(title).toHaveAttribute('data-up', 'true')
  },
}

export const 停止中は中央に印: Story = {
  args: { openSocket: stalling },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(
        canvasElement.querySelector('[data-slot="player-press"]'),
      ).not.toBeNull(),
    )

    const video = canvasElement.querySelector('video') as HTMLVideoElement

    video.dispatchEvent(new Event('playing'))
    video.dispatchEvent(new Event('pause'))

    await waitFor(() =>
      expect(
        canvasElement.querySelector('[data-slot="player-center-standing"]'),
      ).not.toBeNull(),
    )

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

const withAPicture = scripted((socket) => {
  socket.say(progress(LOCKED))
  socket.say(CAPTION_CANVAS)
  socket.say(CAPTION_SHOWN)
  socket.say(PICTURED)
})

interface Laid {
  name: string
  lit: number
}

const laid: Laid[] = []

const OVER_A_BROADCAST = { width: 1440, height: 1080 }

const capturing: TakeCapture = async ({ name, over }) => {
  const plate = document.createElement('canvas')

  plate.width = OVER_A_BROADCAST.width
  plate.height = OVER_A_BROADCAST.height

  const context = plate.getContext('2d') as CanvasRenderingContext2D

  over?.(context, OVER_A_BROADCAST)

  const pixels = context.getImageData(0, 0, plate.width, plate.height).data
  let lit = 0

  for (let at = 3; at < pixels.length; at += 4) {
    if (pixels[at] > 0) {
      lit += 1
    }
  }

  laid.push({ name, lit })

  return 'saved'
}

const CAPTURED_NAME = /^みなと総合1 \d{4}-\d{2}-\d{2} \d{2}-\d{2}-\d{2}\.png$/

export const キャプチャは画面のとおり字幕ごと: Story = {
  args: { openSocket: withAPicture, takeCapture: capturing },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(captionLayer(canvasElement)).toHaveAttribute(
        'data-caption',
        'shown',
      ),
    )

    laid.length = 0
    await userEvent.click(canvas.getByRole('button', { name: 'キャプチャ' }))
    await waitFor(() => expect(laid).toHaveLength(1))

    await expect(laid[0].name).toMatch(CAPTURED_NAME)
    await expect(laid[0].lit).toBeGreaterThan(0)
    await expect(canvas.getByText('キャプチャを保存しました')).toBeVisible()
  },
}

export const 字幕を消したキャプチャに字幕は入らない: Story = {
  args: { openSocket: withAPicture, takeCapture: capturing },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(captionLayer(canvasElement)).toHaveAttribute(
        'data-caption',
        'shown',
      ),
    )

    await userEvent.click(canvas.getByRole('button', { name: '字幕' }))
    await expect(captionLayer(canvasElement)).toHaveAttribute(
      'data-caption',
      'off',
    )

    laid.length = 0
    await userEvent.click(canvas.getByRole('button', { name: 'キャプチャ' }))
    await waitFor(() => expect(laid).toHaveLength(1))

    await expect(laid[0].lit).toBe(0)
  },
}

export const ピクチャーインピクチャー: Story = {
  args: { openSocket: withAPicture },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(captionLayer(canvasElement)).toHaveAttribute(
        'data-caption',
        'shown',
      ),
    )

    const picture = canvasElement.querySelector('video') as HTMLVideoElement
    const control = canvas.getByRole('button', {
      name: 'ピクチャーインピクチャー',
    })

    await expect(control).toHaveAttribute('aria-pressed', 'false')

    const outIs = (out: boolean) => {
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

    try {
      outIs(true)

      await waitFor(() =>
        expect(control).toHaveAttribute('aria-pressed', 'true'),
      )
      await expect(
        canvas.getByText('ピクチャーインピクチャーで再生中'),
      ).toBeVisible()
      await waitFor(() =>
        expect(captionLayer(canvasElement)).toHaveAttribute(
          'data-caption',
          'off',
        ),
      )

      outIs(false)

      await waitFor(() =>
        expect(control).toHaveAttribute('aria-pressed', 'false'),
      )
      await waitFor(() =>
        expect(captionLayer(canvasElement)).toHaveAttribute(
          'data-caption',
          'shown',
        ),
      )
      await expect(
        canvas.queryByText('ピクチャーインピクチャーで再生中'),
      ).toBeNull()
    } finally {
      Reflect.deleteProperty(document, 'pictureInPictureElement')
    }
  },
}

function liveTipOf(
  canvasElement: HTMLElement,
  name: string | RegExp,
): HTMLElement {
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

function liveNamed(canvasElement: HTMLElement): HTMLElement | null {
  return canvasElement.querySelector('[data-slot="player-tip-name"]')
}

function liveCapsOn(said: HTMLElement): string[] {
  return [...said.querySelectorAll('kbd')].map((cap) => cap.textContent ?? '')
}

async function liveRestOn(canvasElement: HTMLElement, name: string | RegExp) {
  await userEvent.hover(liveTipOf(canvasElement, name))
  await waitFor(() => expect(liveNamed(canvasElement)).not.toBeNull(), {
    timeout: 3000,
  })

  return liveNamed(canvasElement) as HTMLElement
}

export const 操作子の名前が出る: Story = {
  args: { openSocket: captioned },
  play: async ({ canvasElement }) => {
    const captions = await liveRestOn(canvasElement, '字幕')

    await expect(captions).toHaveTextContent('字幕')
    await expect(liveCapsOn(captions)).toEqual(['C'])

    await userEvent.unhover(liveTipOf(canvasElement, '字幕'))
    await waitFor(() => expect(liveNamed(canvasElement)).toBeNull())

    const capture = await liveRestOn(canvasElement, 'キャプチャ')

    await expect(capture).toHaveTextContent('キャプチャ')
    await expect(liveCapsOn(capture)).toEqual([])
  },
}

export const 送り戻しの鍵は名前にも出ない: Story = {
  args: { openSocket: captioned },
  play: async ({ canvasElement }) => {
    const said = await liveRestOn(canvasElement, /^(再生|一時停止)$/)

    await expect(liveCapsOn(said)).toEqual(['Space'])
    await expect(said).not.toHaveTextContent('←')
    await expect(said).not.toHaveTextContent('→')
  },
}
