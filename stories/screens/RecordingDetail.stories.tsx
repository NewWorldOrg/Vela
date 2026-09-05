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

/**
 * The plan the API answers with before any picture is asked for. The recording
 * this system has is transcoded as it plays, so seeking is a restart; the
 * `direct` plan below is what an encoded artefact the browser can decode
 * answers with instead.
 */
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

/** A press the API has not answered yet, so the button can be read mid-press. */
function stillDrawing(): Promise<ThumbnailWrite> {
  return new Promise(() => {})
}

async function outOfReach(): Promise<ThumbnailWrite> {
  return {
    state: 'rejected',
    message: '録画ファイルかサムネイルの保存先に到達できません。',
  }
}

/** A finished pass that drew nothing: a 200, and no picture behind it. */
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
  },
} satisfies Meta<typeof RecordingDetailView>

export default meta
type Story = StoryObj<typeof meta>

export const 完全: Story = {
  args: { detail: detail('1274') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // The row it lands on, not the top of the list. A link naming only the
    // screen would pass a check that pressed it and left the reader to find
    // the reservation among the rest.
    await expect(
      canvas.getByRole('link', { name: 'この録画の予約' }),
    ).toHaveAttribute('href', '/reservations#reservation-r-309')

    // 完全 is not on the screen at all: the picture plays to its end and says
    // so, and a band above it repeating the word made the two outcomes that do
    // change what can be watched read like the one that does not (v3.35). It
    // is kept, as the first value in the record.
    const record = canvasElement.querySelector('details')

    await expect(record).not.toHaveAttribute('open')
    await expect(canvas.queryByText('尻切れ')).toBeNull()

    await userEvent.click(canvas.getByText('録画の記録'))
    await expect(canvas.getByText('完全')).toBeVisible()

    // The names on the left are the reader's, and no ratio is drawn from two
    // clocks that start at different instants.
    await expect(canvas.getByText('取りこぼし')).toBeVisible()
    await expect(canvas.queryByText(/被覆率/)).toBeNull()
    await expect(canvas.queryByText(/EOVERFLOW/)).toBeNull()

    // Nothing is asked for until the play button is pressed, so no transcoder
    // is started for a reader who came to read the record.
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

    // The bar carries the whole recording, and the drops sit on it where they
    // fell. Choosing one sends the reader to the second it fell at.
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

    // On the band above the picture, which is where a reader about to watch
    // half a programme has to meet it — not somewhere further down the page.
    // Values and not a sentence: the lengths it is short by are the whole of it.
    const band = within(
      canvasElement.querySelector(
        '[data-slot="recording-outcome"]',
      ) as HTMLElement,
    )

    await expect(band.getByText('尻切れ')).toBeVisible()
    await expect(band.getByText(/書けた尺 36:12 \/ 予定 54:00/)).toBeVisible()

    // And said once. The record carries the outcome only where the screen has
    // not already said it, which is 完全 and nothing else.
    await userEvent.click(canvas.getByText('録画の記録'))
    await expect(canvas.getAllByText('尻切れ')).toHaveLength(1)
    await expect(canvas.queryByText('結果')).toBeNull()
  },
}
/**
 * Nothing was dropped and the whole stream stayed scrambled, which is a
 * recording that cannot be watched and reads as one. The count is on the
 * record below under スクランブル残存, which is where the notice sends anyone
 * who presses play.
 */
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
export const ファイル不在: Story = { args: { detail: detail('0731') } }
export const 録画中: Story = {
  args: { detail: detail('1291'), playback: refused('stillRecording') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // A recording still being written is not thrown away, and the reason is on
    // the button rather than left for the API to say after the press.
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

    // A recording no reservation asked for. The rest of the line of values is
    // still there, so what is missing is one value and not the line.
    await expect(canvas.getByText('湾岸放送1')).toBeVisible()
    await expect(
      canvas.queryByRole('link', { name: 'この録画の予約' }),
    ).toBeNull()

    // Nothing was measured, and the record says so rather than saying 0.
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

    // The source reading marks the encoded artefact as the one in use, and
    // that is all the page says about it: what a seek costs is not written.
    // It is a reading and not a control, so it stands in the record rather
    // than on a band under the picture (v3.35).
    await userEvent.click(canvas.getByText('録画の記録'))

    const source = canvas.getByRole('group', { name: '再生ソース' })

    await expect(within(source).getByText(/^H\.264/)).toHaveAttribute(
      'aria-current',
      'true',
    )
  },
}

/**
 * The picture of a recording is drawn again from the recording itself, one at a
 * time, and the press stands with the other things done with this recording.
 * The four states it can be read in are below.
 */
export const サムネイルを作り直す: Story = {
  args: { detail: detail('1274') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    redrawn.length = 0

    // With the other things done with the recording, and not inside the
    // record, which is shut: one press for it, in one place.
    const redraw = canvas.getByRole('button', { name: 'サムネイルを作り直す' })

    await expect(redraw).toBeEnabled()
    await userEvent.click(redraw)
    await waitFor(() => expect(redrawn).toEqual(['1274']))

    // The picture changes where it is drawn, and the press says what it came
    // to as well: the poster is only on screen before the first play.
    await expect(
      await canvas.findByText('サムネイルを作り直しました。'),
    ).toBeVisible()

    // Asked for as it stands after the press. Without the moment on it the
    // browser answers the poster out of the minute it is holding the picture
    // the press has just replaced for.
    await waitFor(() =>
      expect(
        canvasElement.querySelector('video')?.getAttribute('poster'),
      ).toMatch(/redrawn=\d+$/),
    )

    // And the record carries the reading only, with no second button on it.
    await userEvent.click(canvas.getByText('録画の記録'))
    await expect(canvas.getByText('生成済み')).toBeVisible()
    await expect(
      canvas.getAllByRole('button', { name: 'サムネイルを作り直す' }),
    ).toHaveLength(1)
  },
}
/** Pressed, and the pass has not answered. It cannot be pressed again. */
export const サムネイルを作り直している最中: Story = {
  args: { detail: detail('1274'), onRemakeThumbnail: stillDrawing },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const redraw = canvas.getByRole('button', { name: 'サムネイルを作り直す' })

    await userEvent.click(redraw)

    await waitFor(() => expect(redraw).toHaveAttribute('aria-disabled', 'true'))
  },
}
/**
 * The three states that refuse the press, and the one that is never offered it.
 *
 * A recording being written, a file that is not there and a recording nothing
 * was written into all leave the state they are in, so the button stands with
 * the reason on it. A failed recording never gets a picture — the pass answers
 * `skipped` for it and always will — so no button is drawn, and the band over
 * the picture and the record both already say why.
 */
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
/**
 * The two ways a press comes back with no picture behind it: a refusal read off
 * the status, and a finished pass that drew nothing, which is a 200. Either way
 * the press says so rather than leaving the screen unchanged and silent.
 */
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
// A recording of its own, because a picture redrawn is remembered for the tab
// and a screen standing on the recording the story above redrew would carry the
// moment of that press.
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

    // Nothing was drawn, so nothing asks the browser for a new picture.
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
