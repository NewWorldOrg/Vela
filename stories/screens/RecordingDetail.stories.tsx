import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type {
  RecordingDiscarded,
  ThumbnailWrite,
} from '@/repository/recordings'
import type {
  PlaybackPlan,
  PlaybackRead,
  PlaybackRefusal,
  TicketWrite,
} from '@/repository/videos'
import type { EncodeWrite } from '@/repository/encode'
import {
  ENCODE_CHOICES,
  MANY_ENCODE_CHOICES,
  NO_ENCODE_CHOICES,
} from '@/repository/encode.fixtures'
import { RECORDING_DETAIL_FIXTURES } from '@/stories/fixtures/recording-details'
import { RecordingDetailView } from '@/components/recordings/recording-detail-page'

function detail(id: string) {
  const found = RECORDING_DETAIL_FIXTURES.find((r) => r.id === id)
  if (!found) {
    throw new Error(`fixture ${id} not found`)
  }
  return found
}

function planned(over: Partial<PlaybackPlan> = {}): PlaybackRead {
  return {
    state: 'planned',
    plan: {
      standing: 'whole',
      route: 'onTheFly',
      seeking: 'byStartingAgain',
      canSeek: false,
      transcodes: true,
      showsAsAWholeRecording: true,
      mediaType: 'video/mp4',
      ...over,
    },
  }
}

function refused(refusal: PlaybackRefusal): PlaybackRead {
  return { state: 'refused', refusal }
}

const redrawn: string[] = []

async function remade(id: string): Promise<ThumbnailWrite> {
  redrawn.push(id)

  return { state: 'ok', remake: 'drawn' }
}

function stillDrawing(): Promise<ThumbnailWrite> {
  return new Promise(() => {})
}

async function outOfReach(): Promise<ThumbnailWrite> {
  return {
    state: 'rejected',
    message: '録画ファイルかサムネイルの保存先に到達できません。',
  }
}

async function drewNothing(): Promise<ThumbnailWrite> {
  return { state: 'ok', remake: 'failed' }
}

const asked: string[] = []

const queued: [string, string, string | undefined][] = []

async function queuing(
  recordingId: string,
  destinationId: string,
  profileId?: string,
): Promise<EncodeWrite> {
  queued.push([recordingId, destinationId, profileId])

  return { state: 'ok' }
}

async function alreadyEncoded(): Promise<EncodeWrite> {
  return {
    state: 'rejected',
    message: 'この録画はこのプロファイルですでにエンコード済みです。',
  }
}

async function profileRetired(): Promise<EncodeWrite> {
  return {
    state: 'rejected',
    message: 'このプロファイルは退役しているため、エンコードできませんでした。',
  }
}

async function throwing(id: string): Promise<RecordingDiscarded> {
  asked.push(id)

  return { state: 'ok', filesRemoved: 1 }
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

const meta = {
  title: 'Screens/録画詳細',
  component: RecordingDetailView,
  parameters: { layout: 'fullscreen' },
  args: {
    onRemakeThumbnail: remade,
    onDelete: throwing,
    onTakeTicket: ticketed,
    onQueueEncode: queuing,
    encodeChoices: ENCODE_CHOICES,
    playback: planned(),
    unaskedProfile: '1080p60',
  },
} satisfies Meta<typeof RecordingDetailView>

export default meta
type Story = StoryObj<typeof meta>

export const 完全: Story = {
  args: { detail: detail('1274') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('link', { name: 'この録画の予約' }),
    ).toHaveAttribute('href', '/reservations?show=all#reservation-r-309')

    const record = canvasElement.querySelector('details')

    await expect(record).not.toHaveAttribute('open')
    await expect(canvas.queryByText('尻切れ')).toBeNull()

    await userEvent.click(canvas.getByText('録画の記録'))
    await expect(canvas.getByText('完全')).toBeVisible()
    await expect(canvas.getByText('完了')).toBeVisible()

    await expect(canvas.getByText('取りこぼし')).toBeVisible()
    await expect(canvas.queryByText(/被覆率/)).toBeNull()
    await expect(canvas.queryByText(/EOVERFLOW/)).toBeNull()

    await expect(
      canvasElement.querySelector('video')?.getAttribute('src'),
    ).toBeNull()

    asked.length = 0

    const remove = canvas.getByRole('button', { name: '削除' })

    await expect(remove).toBeEnabled()
    await userEvent.click(remove)

    const dialog = within(await screen.findByRole('alertdialog'))

    await expect(dialog.getByText('/srv/recordings/1274.m2ts')).toBeVisible()
    await expect(asked).toEqual([])

    await userEvent.click(dialog.getByRole('button', { name: '削除する' }))
    await waitFor(() => expect(asked).toEqual(['1274']))
  },
}
export const 警告水準: Story = {
  args: { detail: detail('1266') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const bar = canvas.getByRole('slider', { name: '再生位置' })

    await expect(bar).toHaveAttribute('aria-valuemax', '15158')
    await expect(bar).toHaveAttribute('aria-valuetext', '0:00:00 / 4:12:38')

    await userEvent.click(canvas.getByText('録画の記録'))

    const spots = canvas.getAllByRole('link', { name: 'この時間帯を再生' })

    await expect(spots[0]).toHaveAttribute('href', '/recordings/1266?at=2580')
  },
}
export const 尻切れ: Story = {
  args: {
    detail: detail('1247'),
    playback: planned({ standing: 'cutShort', showsAsAWholeRecording: false }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const band = within(
      canvasElement.querySelector(
        '[data-slot="recording-outcome"]',
      ) as HTMLElement,
    )

    await expect(band.getByText('尻切れ')).toBeVisible()
    await expect(band.getByText(/書けた尺 36:12 \/ 予定 54:00/)).toBeVisible()

    await userEvent.click(canvas.getByText('録画の記録'))
    await expect(canvas.getAllByText('尻切れ')).toHaveLength(1)
    await expect(canvas.queryByText('結果')).toBeNull()
  },
}
export const スクランブル残存: Story = {
  args: { detail: detail('0906') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByText('録画の記録'))

    await expect(canvas.getByText('視聴不可の恐れ')).toBeVisible()
    await expect(canvas.getByText('解除できなかったスクランブル')).toBeVisible()
    await expect(canvas.getByText('5,042,768 パケット')).toBeVisible()
  },
}
export const 失敗: Story = { args: { detail: detail('1239') } }

function failed(title: string, body?: string): Story {
  return {
    args: {
      detail: {
        ...detail('1239'),
        stopReason: undefined,
        scramble: undefined,
        failureReason: { title, body },
      },
    },
    play: async ({ canvasElement }) => {
      await expect(within(canvasElement).getByText(title)).toBeVisible()
    },
  }
}

export const 予定に届かなかった失敗: Story =
  failed('書けた尺が予定に届かなかった')

export const 何も残らなかった失敗: Story = failed(
  '0 バイトで終わった',
  '録画ファイルは残っていますが、中身がありません。',
)

export const 大きさを観測できなかった失敗: Story = failed(
  'ファイルの大きさを観測できなかった',
  '録画ファイルの大きさを確かめられないまま終わりました。',
)

export const 尺のわりに小さい失敗: Story = failed(
  'ファイルが尺のわりに小さい',
  '書けた尺から見込まれる大きさに届きません。',
)

export const 尺のわりに大きい失敗: Story = failed(
  'ファイルが尺のわりに大きい',
  '書けた尺から見込まれる大きさを超えています。',
)

function watchMeta(canvasElement: HTMLElement) {
  return canvasElement.querySelector('[data-slot="watch-meta"]') as HTMLElement
}

export const 局のロゴ: Story = {
  args: { detail: detail('1274') },
  play: async ({ canvasElement }) => {
    const meta = watchMeta(canvasElement)

    await waitFor(() => expect(meta.querySelectorAll('img')).toHaveLength(1))
    await expect(meta.querySelector('img')).toHaveAttribute('alt', '')
    await expect(within(meta).getByText('中央テレビ1')).toBeVisible()
    await expect(within(meta).queryByText('131')).toBeNull()
    await expect(canvasElement.querySelectorAll('img')).toHaveLength(1)
  },
}
export const ロゴをまだ読んでいない局: Story = {
  args: { detail: detail('1270') },
  play: async ({ canvasElement }) => {
    const meta = watchMeta(canvasElement)

    await expect(meta.querySelectorAll('img')).toHaveLength(0)
    await expect(within(meta).getByText('141')).toBeVisible()
    await expect(within(meta).getByText('シティ MX1')).toBeVisible()
  },
}
export const ロゴを放送していない局: Story = {
  args: { detail: detail('0412') },
  play: async ({ canvasElement }) => {
    const meta = watchMeta(canvasElement)

    await expect(meta.querySelectorAll('img')).toHaveLength(0)
    await expect(within(meta).getByText('171')).toBeVisible()
    await expect(within(meta).getByText('湾岸放送1')).toBeVisible()
  },
}
export const ファイル不在: Story = { args: { detail: detail('0731') } }
export const 録画中: Story = {
  args: { detail: detail('1291'), playback: refused('stillRecording') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const remove = canvas.getByRole('button', { name: '削除' })

    await expect(remove).toBeDisabled()
    await expect(remove).toHaveAttribute('title', '録画中は削除できません')

    await expect(canvas.getByText('録画中は再生できません')).toBeVisible()
  },
}
export const 未計測: Story = {
  args: { detail: detail('0412') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('湾岸放送1')).toBeVisible()
    await expect(
      canvas.queryByRole('link', { name: 'この録画の予約' }),
    ).toBeNull()

    await userEvent.click(canvas.getByText('録画の記録'))
    await expect(canvas.getAllByText('未計測').length).toBeGreaterThan(0)
  },
}
export const 到達できないファイル: Story = {
  args: { detail: detail('1266'), playback: refused('outOfReach') },
}
export const 応答を読めない: Story = {
  args: { detail: detail('1266'), playback: refused('unreadable') },
}
export const 再生できる成果物がない: Story = {
  args: {
    detail: detail('1266'),
    playback: planned({
      standing: 'failed',
      route: 'nothing',
      seeking: undefined,
      transcodes: false,
      showsAsAWholeRecording: false,
    }),
  },
}
export const Range直配信: Story = {
  args: {
    detail: detail('1274'),
    playback: planned({
      route: 'direct',
      seeking: 'byRange',
      canSeek: true,
      transcodes: false,
      bytes: 3_490_550_128,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByText('録画の記録'))

    const source = canvas.getByRole('group', { name: '再生ソース' })

    await expect(within(source).getByText(/^H\.264/)).toHaveAttribute(
      'aria-current',
      'true',
    )
  },
}

export const サムネイルを作り直す: Story = {
  args: { detail: detail('1274') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    redrawn.length = 0

    const redraw = canvas.getByRole('button', { name: 'サムネイルを作り直す' })

    await expect(redraw).toBeEnabled()
    await userEvent.click(redraw)
    await waitFor(() => expect(redrawn).toEqual(['1274']))

    await expect(
      await canvas.findByText('サムネイルを作り直しました。'),
    ).toBeVisible()

    await waitFor(() =>
      expect(
        canvasElement.querySelector('video')?.getAttribute('poster'),
      ).toMatch(/redrawn=\d+$/),
    )

    await userEvent.click(canvas.getByText('録画の記録'))
    await expect(canvas.getByText('生成済み')).toBeVisible()
    await expect(
      canvas.getAllByRole('button', { name: 'サムネイルを作り直す' }),
    ).toHaveLength(1)
  },
}
export const サムネイルを作り直している最中: Story = {
  args: { detail: detail('1274'), onRemakeThumbnail: stillDrawing },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const redraw = canvas.getByRole('button', { name: 'サムネイルを作り直す' })

    await userEvent.click(redraw)

    await waitFor(() => expect(redraw).toHaveAttribute('aria-disabled', 'true'))
  },
}
export const サムネイルを作り直せない: Story = {
  args: { detail: detail('1291'), playback: refused('stillRecording') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const redraw = canvas.getByRole('button', { name: 'サムネイルを作り直す' })

    await expect(redraw).toBeDisabled()
    await expect(redraw).toHaveAttribute('title', '録画中は作り直せません')
  },
}
export const 作り直せないファイル不在: Story = {
  args: { detail: detail('0731') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const redraw = canvas.getByRole('button', { name: 'サムネイルを作り直す' })

    await expect(redraw).toBeDisabled()
    await expect(redraw).toHaveAttribute(
      'title',
      'ファイルが見つからないため作り直せません',
    )
  },
}
export const 作り直せない中身なし: Story = {
  args: { detail: { ...detail('1274'), sizeBytes: 0 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const redraw = canvas.getByRole('button', { name: 'サムネイルを作り直す' })

    await expect(redraw).toBeDisabled()
    await expect(redraw).toHaveAttribute(
      'title',
      '中身が書かれていないため作り直せません',
    )
  },
}
export const 作り直しの操作子を出さない: Story = {
  args: { detail: detail('1239') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.queryByRole('button', { name: 'サムネイルを作り直す' }),
    ).toBeNull()
  },
}
export const サムネイルを作り直せなかった: Story = {
  args: { detail: detail('1266'), onRemakeThumbnail: outOfReach },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'サムネイルを作り直す' }),
    )

    await expect(
      await canvas.findByText(
        '録画ファイルかサムネイルの保存先に到達できません。',
      ),
    ).toBeVisible()
  },
}
export const 作り直しても絵が取れなかった: Story = {
  args: { detail: detail('0412'), onRemakeThumbnail: drewNothing },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'サムネイルを作り直す' }),
    )

    await expect(
      await canvas.findByText('サムネイルを作り直せませんでした。'),
    ).toBeVisible()

    await expect(
      canvasElement.querySelector('video')?.getAttribute('poster'),
    ).not.toMatch(/redrawn=/)
  },
}

export const エンコードを登録する: Story = {
  args: { detail: detail('1274') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    queued.length = 0

    const encode = canvas.getByRole('button', { name: 'エンコード' })

    await expect(encode).toBeEnabled()
    await userEvent.click(encode)
    await waitFor(() => expect(queued).toEqual([['1274', 'ds-1', undefined]]))
    await expect(
      await canvas.findByText('エンコードを登録しました。'),
    ).toBeVisible()
  },
}

export const エンコードの保存先を選ぶ: Story = {
  args: { detail: detail('1274'), encodeChoices: MANY_ENCODE_CHOICES },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    queued.length = 0

    await userEvent.click(canvas.getByRole('button', { name: 'エンコード' }))

    const dialog = await screen.findByRole('dialog', { name: 'エンコード' })

    await expect(within(dialog).getByText('棚')).toBeVisible()
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'エンコード' }),
    )
    await waitFor(() => expect(queued).toEqual([['1274', 'ds-1', undefined]]))
  },
}

export const エンコードを断られた: Story = {
  args: { detail: detail('1274'), onQueueEncode: alreadyEncoded },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: 'エンコード' }))
    await expect(
      await canvas.findByText(
        'この録画はこのプロファイルですでにエンコード済みです。',
      ),
    ).toBeVisible()
  },
}

export const 退役したプロファイルでエンコードを断られた: Story = {
  args: { detail: detail('1274'), onQueueEncode: profileRetired },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: 'エンコード' }))
    await expect(
      await canvas.findByText(
        'このプロファイルは退役しているため、エンコードできませんでした。',
      ),
    ).toBeVisible()
  },
}

export const エンコードの保存先がない: Story = {
  args: { detail: detail('1274'), encodeChoices: NO_ENCODE_CHOICES },
  play: async ({ canvasElement }) => {
    const encode = within(canvasElement).getByRole('button', {
      name: 'エンコード',
    })

    await expect(encode).toBeDisabled()
    await expect(encode).toHaveAttribute(
      'title',
      '保存先がないためエンコードできません',
    )
  },
}

export const 録画中はエンコードできない: Story = {
  args: { detail: detail('1291') },
  play: async ({ canvasElement }) => {
    const encode = within(canvasElement).getByRole('button', {
      name: 'エンコード',
    })

    await expect(encode).toBeDisabled()
    await expect(encode).toHaveAttribute(
      'title',
      '録画中はエンコードできません',
    )
  },
}

export const 失敗した録画にエンコードの操作子を出さない: Story = {
  args: { detail: detail('1239') },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole('button', { name: 'エンコード' }),
    ).toBeNull()
  },
}
