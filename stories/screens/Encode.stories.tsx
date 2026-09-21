import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'

import {
  AUTO_RUN_AS_DEPLOYED,
  AUTO_RUN_SETTLED,
  CANCELLED_JOB,
  COMPLETED_JOB,
  EMPTY_ENCODE_SCREEN,
  ENCODE_SCREEN,
  FAILED_JOB,
  MORE_JOBS_THAN_FIT,
  QUEUED_JOB,
  RETIRED_DEFINITIONS,
  RUNNING_JOB,
  AUTO_RUN_ON_A_LATER_BUILD,
  AUTO_RUN_WITH_NOTHING_NAMED,
  SPELLS_NONE,
  SPELLS_TOO_FEW,
  STALLED_JOB,
  jobsPage,
  screenWith,
} from '@/repository/encode.fixtures'
import type { EncodeActions } from '@/components/encode/encode-page'
import { EncodeView } from '@/components/encode/encode-page'
import {
  cellOf,
  fillsTheColumn,
  rowsOfTheTableHeaded,
  tipIn,
  widthOf,
} from '@/stories/pills-in-a-column'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'

const callOff = fn(async () => ({ state: 'ok' }) as const)

const settleAutoRun = fn<EncodeActions['onSettleAutoRun']>(async () => ({
  state: 'ok',
}))

const reviseProfile = fn<EncodeActions['onReviseProfile']>(async () => ({
  state: 'ok',
}))

const reviseDestination = fn<EncodeActions['onReviseDestination']>(
  async () => ({
    state: 'ok',
  }),
)

const removeProfile = fn<EncodeActions['onRemoveProfile']>(async () => ({
  state: 'ok',
  removal: 'deleted',
}))

const removeDestination = fn<EncodeActions['onRemoveDestination']>(
  async () => ({
    state: 'ok',
    removal: 'deleted',
  }),
)

const ACTIONS: EncodeActions = {
  onDefineProfile: async () => ({ state: 'ok' }) as const,
  onReviseProfile: reviseProfile,
  onRemoveProfile: removeProfile,
  onDefineDestination: async () => ({ state: 'ok' }) as const,
  onReviseDestination: reviseDestination,
  onRemoveDestination: removeDestination,
  onCallOff: callOff,
  onSettleAutoRun: settleAutoRun,
}

const HELD_BY_A_JOB =
  'このプロファイルを使うジョブが実行中か待機中のため、変更できませんでした。'

const ALREADY_RETIRED = 'この保存先は退役しているため、変更できませんでした。'

const STILL_THE_DEFAULT =
  'このプロファイルを既定にしている保存先があるため、撤去できませんでした。'

const THE_LAST_ONE = 'この保存先は最後の 1 つのため、撤去できませんでした。'

const JOB_STATE_COLUMN = 1

const STARTED_COLUMN = 6

const meta = {
  title: 'Screens/設定・エンコード',
  component: EncodeView,
  parameters: { layout: 'fullscreen' },
  args: { screen: ENCODE_SCREEN, actions: ACTIONS },
} satisfies Meta<typeof EncodeView>

export default meta
type Story = StoryObj<typeof meta>

async function counts(
  canvas: ReturnType<typeof within>,
  waiting: number,
  failed: number,
) {
  await expect(canvas.getByText(`待機 ${waiting} 本`)).toBeVisible()
  await expect(canvas.getByText(`失敗 ${failed} 本`)).toBeVisible()
}

function spellsLine(canvasElement: HTMLElement) {
  const line = canvasElement.querySelector<HTMLElement>(
    '[data-slot="recent-spells"]',
  )

  if (!line) {
    throw new Error('the recent spells are not on the screen')
  }

  return within(line)
}

function autoRunPanel(canvasElement: HTMLElement) {
  const panel = canvasElement.querySelector<HTMLElement>(
    '[data-slot="auto-run"]',
  )

  if (!panel) {
    throw new Error('the auto run panel is not on the screen')
  }

  return within(panel)
}

function runningCard(canvasElement: HTMLElement) {
  const card = canvasElement.querySelector<HTMLElement>(
    '[data-slot="running-job"]',
  )

  if (!card) {
    throw new Error('the running job is not on the screen')
  }

  return within(card)
}

export const 通常: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const jobs = within(canvas.getAllByRole('table')[0])

    await expect(canvas.getByText('ジョブの現在地')).toBeVisible()
    await expect(jobs.getAllByRole('button', { name: '中止' })).toHaveLength(2)
    await expect(jobs.getByText('録画削除済み')).toBeVisible()
    await counts(canvas, 1, 1)
  },
}

export const 空の状態: Story = {
  args: { screen: EMPTY_ENCODE_SCREEN },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('ジョブの履歴がありません')).toBeVisible()
    await expect(canvas.getByText('プロファイルがありません')).toBeVisible()
    await expect(canvas.getByText('保存先がありません')).toBeVisible()
    await counts(canvas, 0, 0)

    const destination = canvas.getByRole('button', { name: '保存先を追加' })
    await expect(destination).toBeDisabled()
    await expect(destination).toHaveAttribute(
      'title',
      'プロファイルがないため追加できません',
    )
  },
}

export const 待機中: Story = {
  args: { screen: screenWith(QUEUED_JOB) },
  play: async ({ canvasElement }) => {
    callOff.mockClear()

    const canvas = within(canvasElement)

    const jobs = within(canvas.getAllByRole('table')[0])

    await expect(jobs.getByText('待機中')).toBeVisible()
    await counts(canvas, 1, 0)

    await userEvent.click(jobs.getByRole('button', { name: '中止' }))

    await waitFor(() => expect(callOff).toHaveBeenCalledWith('job-q'))
    await expect(screen.queryByRole('alertdialog')).toBeNull()
  },
}

export const 実行中: Story = {
  args: { screen: screenWith(RUNNING_JOB) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('progressbar', { name: 'エンコードの進捗' }),
    ).toHaveAttribute('aria-valuenow', '42')
    await expect(canvas.getAllByText('残り 10:23').length).toBeGreaterThan(0)
    await expect(
      within(canvas.getAllByRole('table')[0]).getByRole('button', {
        name: '中止',
      }),
    ).toBeEnabled()
    await expect(
      runningCard(canvasElement).getByRole('button', { name: '中止' }),
    ).toBeEnabled()
    await counts(canvas, 0, 0)
  },
}

export const 実行中の中止を確かめる: Story = {
  args: { screen: screenWith(RUNNING_JOB) },
  play: async ({ canvasElement }) => {
    callOff.mockClear()

    await userEvent.click(
      runningCard(canvasElement).getByRole('button', { name: '中止' }),
    )

    const dialog = await screen.findByRole('alertdialog', {
      name: 'このエンコードを中止します',
    })

    await expect(
      within(dialog).getByText('のエンコードを途中で止めます。', {
        exact: false,
      }),
    ).toBeVisible()
    await expect(within(dialog).getByText('週末キッチンの手帖')).toBeVisible()
    await expect(callOff).not.toHaveBeenCalled()
  },
}

export const 実行中を中止する: Story = {
  args: { screen: screenWith(RUNNING_JOB) },
  play: async ({ canvasElement }) => {
    callOff.mockClear()

    const jobs = within(within(canvasElement).getAllByRole('table')[0])

    await userEvent.click(jobs.getByRole('button', { name: '中止' }))

    const dialog = await screen.findByRole('alertdialog', {
      name: 'このエンコードを中止します',
    })

    await userEvent.click(
      within(dialog).getByRole('button', { name: '中止する' }),
    )

    await waitFor(() => expect(callOff).toHaveBeenCalledWith('job-r'))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  },
}

export const 実行中の中止を断られる: Story = {
  args: {
    screen: screenWith(RUNNING_JOB),
    actions: {
      ...ACTIONS,
      onCallOff: async () =>
        ({
          state: 'rejected',
          message: 'このジョブはすでに終わっているため、中止できませんでした。',
        }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      runningCard(canvasElement).getByRole('button', { name: '中止' }),
    )

    const dialog = await screen.findByRole('alertdialog', {
      name: 'このエンコードを中止します',
    })

    await userEvent.click(
      within(dialog).getByRole('button', { name: '中止する' }),
    )

    await expect(
      await within(dialog).findByText(
        'このジョブはすでに終わっているため、中止できませんでした。',
      ),
    ).toBeVisible()
  },
}

export const 中止が入れ違う: Story = {
  args: {
    screen: screenWith(RUNNING_JOB),
    actions: {
      ...ACTIONS,
      onCallOff: async () =>
        ({
          state: 'rejected',
          message:
            'このジョブは中止の途中で状態が変わったため、中止できませんでした。',
        }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      runningCard(canvasElement).getByRole('button', { name: '中止' }),
    )

    const dialog = await screen.findByRole('alertdialog', {
      name: 'このエンコードを中止します',
    })

    await userEvent.click(
      within(dialog).getByRole('button', { name: '中止する' }),
    )

    await expect(
      await within(dialog).findByText(
        'このジョブは中止の途中で状態が変わったため、中止できませんでした。',
      ),
    ).toBeVisible()
  },
}

export const 停滞: Story = {
  args: { screen: screenWith(STALLED_JOB) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getAllByText('停滞').length).toBeGreaterThan(0)
    await expect(canvas.getAllByText('停滞 12分34秒').length).toBeGreaterThan(0)
    await expect(
      canvas.getAllByText('GPU に到達できない').length,
    ).toBeGreaterThan(0)
  },
}

export const 失敗: Story = {
  args: { screen: screenWith(FAILED_JOB) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const jobs = within(canvas.getAllByRole('table')[0])

    await expect(jobs.getByText('失敗')).toBeVisible()
    const said = await tipIn(
      cellOf(rowsOfTheTableHeaded(canvasElement, '番組')[0], JOB_STATE_COLUMN),
    )

    await expect(said).toHaveTextContent('ffmpeg 非0終了')
    await expect(said).toHaveTextContent('2 回目')
    await counts(canvas, 0, 1)
  },
}

export const 完了: Story = {
  args: { screen: screenWith(COMPLETED_JOB) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const jobs = within(canvas.getAllByRole('table')[0])

    await expect(jobs.getByText('完了')).toBeVisible()
    await expect(jobs.getByText('100%')).toBeVisible()
  },
}

export const 中止: Story = {
  args: { screen: screenWith(CANCELLED_JOB) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const jobs = within(canvas.getAllByRole('table')[0])

    await expect(jobs.getByText('中止')).toBeVisible()
    await expect(jobs.getByText('録画削除済み')).toBeVisible()
    await expect(jobs.queryByRole('button', { name: '中止' })).toBeNull()
  },
}

export const 失敗だけに絞る: Story = {
  args: {
    screen: {
      ...ENCODE_SCREEN,
      jobs: jobsPage([FAILED_JOB], { status: 'failed' }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('button', { name: '失敗', pressed: true }),
    ).toBeVisible()
    await expect(canvas.getByText(/該当/)).toBeVisible()
  },
}

export const 条件に合うジョブがない: Story = {
  args: {
    screen: {
      ...ENCODE_SCREEN,
      jobs: jobsPage([], { status: 'cancelled' }),
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText('条件に合うジョブがありません'),
    ).toBeVisible()
  },
}

export const 収まらないほどのジョブ: Story = {
  args: { screen: MORE_JOBS_THAN_FIT },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await scrollsInsideWithItsHeaderHeld(canvasElement, '番組')
    await expect(
      canvas.getByRole('button', { name: '2 ページ目' }),
    ).toHaveAttribute('aria-current', 'page')
  },
}

export const 狭い幅で収まらないほどのジョブ: Story = {
  args: { screen: MORE_JOBS_THAN_FIT },
  parameters: { screen: { width: 768, height: 1024 } },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, '番組')
  },
}

export const 設定の枠に収まるジョブ表: Story = {
  args: { screen: MORE_JOBS_THAN_FIT },
  parameters: { screen: { width: 1182, height: 1000 } },
  play: async ({ canvasElement }) => {
    const rows = rowsOfTheTableHeaded(canvasElement, '番組')
    const box = rows[0].closest('[data-slot="table-container"]')

    if (!box) {
      throw new Error('the job table has no container')
    }

    await expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth)
    await expect(
      within(canvasElement).queryByRole('columnheader', { name: '登録' }),
    ).toBeNull()

    const started = cellOf(rows[0], STARTED_COLUMN)

    await expect(await tipIn(started)).toHaveTextContent(/^登録 /)
  },
}

export const プロファイルを追加する: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'プロファイルを追加' }),
    )

    const dialog = await screen.findByRole('dialog', {
      name: 'プロファイルを追加',
    })

    await expect(
      within(dialog).getByRole('button', { name: 'H.265' }),
    ).toBeVisible()

    await userEvent.click(
      within(dialog).getByRole('button', { name: '追加する' }),
    )
    await expect(
      within(dialog).getByText('名称を入力してください。'),
    ).toBeVisible()
  },
}

export const 保存先を追加する: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '保存先を追加' }))

    const dialog = await screen.findByRole('dialog', { name: '保存先を追加' })

    await expect(within(dialog).getByText('encodes')).toBeVisible()
    await expect(within(dialog).getByText('録画再生用')).toBeVisible()
  },
}

export const 保存先の追加を断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onDefineDestination: async () =>
        ({
          state: 'rejected',
          message:
            'この出力ルートには成果物を置けないため、保存できませんでした。',
        }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '保存先を追加' }))

    const dialog = await screen.findByRole('dialog', { name: '保存先を追加' })

    await userEvent.type(within(dialog).getByLabelText(/名称/), '書庫')
    await userEvent.click(
      within(dialog).getByRole('button', { name: '追加する' }),
    )

    await expect(
      await within(dialog).findByText(
        'この出力ルートには成果物を置けないため、保存できませんでした。',
      ),
    ).toBeVisible()
  },
}

export const 保存先の追加をdriverが断る: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onDefineDestination: async () =>
        ({
          state: 'rejected',
          message: 'driver に接続できないため、保存できませんでした。',
        }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '保存先を追加' }))

    const dialog = await screen.findByRole('dialog', { name: '保存先を追加' })

    await userEvent.type(within(dialog).getByLabelText(/名称/), '書庫')
    await userEvent.click(
      within(dialog).getByRole('button', { name: '追加する' }),
    )

    await expect(
      await within(dialog).findByText(
        'driver に接続できないため、保存できませんでした。',
      ),
    ).toBeVisible()
  },
}

export const プロファイルを変更する: Story = {
  play: async ({ canvasElement }) => {
    reviseProfile.mockClear()

    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: '録画再生用 を変更' }),
    )

    const dialog = await screen.findByRole('dialog', {
      name: 'プロファイルを変更',
    })
    const rateFactor = within(dialog).getByLabelText('品質(CRF)')

    await expect(within(dialog).getByLabelText(/名称/)).toHaveValue(
      '録画再生用',
    )
    await expect(rateFactor).toHaveValue('22')

    await userEvent.clear(rateFactor)
    await userEvent.type(rateFactor, '20')
    await userEvent.click(
      within(dialog).getByRole('button', { name: '変更する' }),
    )

    await waitFor(() =>
      expect(reviseProfile).toHaveBeenCalledWith('pf-1', {
        label: '録画再生用',
        codec: 'h264',
        resolution: 'asSource',
        deinterlace: 'everyFrame',
        rateFactor: 20,
        quantiser: 24,
      }),
    )
  },
}

export const 保存先を変更する: Story = {
  play: async ({ canvasElement }) => {
    reviseDestination.mockClear()

    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '棚 を変更' }))

    const dialog = await screen.findByRole('dialog', { name: '保存先を変更' })
    const label = within(dialog).getByLabelText(/名称/)

    await expect(label).toHaveValue('棚')
    await expect(within(dialog).getByText('encodes')).toBeVisible()
    await expect(within(dialog).getByText('録画再生用')).toBeVisible()

    await userEvent.clear(label)
    await userEvent.type(label, '書庫')
    await userEvent.click(
      within(dialog).getByRole('button', { name: '変更する' }),
    )

    await waitFor(() =>
      expect(reviseDestination).toHaveBeenCalledWith('ds-1', {
        label: '書庫',
        outputRoot: 'encodes',
        defaultProfileId: 'pf-1',
      }),
    )
  },
}

export const 撤去して消える: Story = {
  play: async ({ canvasElement }) => {
    removeProfile.mockClear()

    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: '録画再生用 を撤去' }),
    )

    const dialog = await screen.findByRole('alertdialog', {
      name: 'このプロファイルを撤去します',
    })

    await expect(within(dialog).getByText('録画再生用')).toBeVisible()

    await userEvent.click(
      within(dialog).getByRole('button', { name: '撤去する' }),
    )

    await waitFor(() => expect(removeProfile).toHaveBeenCalledWith('pf-1'))
    await expect(
      await canvas.findByText('を削除しました。', { exact: false }),
    ).toBeVisible()
  },
}

export const 撤去して退役する: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onRemoveDestination: async () =>
        ({ state: 'ok', removal: 'retired' }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '棚 を撤去' }))

    const dialog = await screen.findByRole('alertdialog', {
      name: 'この保存先を撤去します',
    })

    await userEvent.click(
      within(dialog).getByRole('button', { name: '撤去する' }),
    )

    await expect(
      await canvas.findByText('を退役させました。', { exact: false }),
    ).toBeVisible()
  },
}

export const 退役した定義: Story = {
  args: { screen: RETIRED_DEFINITIONS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getAllByText('退役')).toHaveLength(2)
    await expect(
      canvas.getByRole('button', { name: '録画再生用 を変更' }),
    ).toBeVisible()
    await expect(
      canvas.queryByRole('button', { name: '保管用 を変更' }),
    ).toBeNull()
    await expect(
      canvas.queryByRole('button', { name: '保管用 を撤去' }),
    ).toBeNull()
    await expect(
      canvas.queryByRole('button', { name: '旧棚 を変更' }),
    ).toBeNull()
    await expect(
      canvas.queryByRole('button', { name: '旧棚 を撤去' }),
    ).toBeNull()
  },
}

export const 使用中のため変更を断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onReviseProfile: async () =>
        ({ state: 'rejected', message: HELD_BY_A_JOB }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '録画再生用 を変更' }),
    )

    const dialog = await screen.findByRole('dialog', {
      name: 'プロファイルを変更',
    })

    await userEvent.click(
      within(dialog).getByRole('button', { name: '変更する' }),
    )

    await expect(await within(dialog).findByText(HELD_BY_A_JOB)).toBeVisible()
  },
}

export const 退役済みのため変更を断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onReviseDestination: async () =>
        ({ state: 'rejected', message: ALREADY_RETIRED }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '棚 を変更' }),
    )

    const dialog = await screen.findByRole('dialog', { name: '保存先を変更' })

    await userEvent.click(
      within(dialog).getByRole('button', { name: '変更する' }),
    )

    await expect(await within(dialog).findByText(ALREADY_RETIRED)).toBeVisible()
  },
}

export const 既定に指名されているため撤去を断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onRemoveProfile: async () =>
        ({ state: 'rejected', message: STILL_THE_DEFAULT }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '録画再生用 を撤去' }),
    )

    const dialog = await screen.findByRole('alertdialog', {
      name: 'このプロファイルを撤去します',
    })

    await userEvent.click(
      within(dialog).getByRole('button', { name: '撤去する' }),
    )

    await expect(
      await within(dialog).findByText(STILL_THE_DEFAULT),
    ).toBeVisible()
  },
}

export const 最後の保存先のため撤去を断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onRemoveDestination: async () =>
        ({ state: 'rejected', message: THE_LAST_ONE }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '棚 を撤去' }),
    )

    const dialog = await screen.findByRole('alertdialog', {
      name: 'この保存先を撤去します',
    })

    await userEvent.click(
      within(dialog).getByRole('button', { name: '撤去する' }),
    )

    await expect(await within(dialog).findByText(THE_LAST_ONE)).toBeVisible()
  },
}

export const 所要の平均: Story = {
  play: async ({ canvasElement }) => {
    const spells = spellsLine(canvasElement)

    await expect(spells.getByText('直近の所要')).toBeVisible()
    await expect(spells.getByText('完了 5 本の平均')).toBeVisible()
    await expect(spells.getByText('25:23')).toBeVisible()
    await expect(spells.queryByText(/直近 20 本まで/)).toBeNull()
    await expect(
      spells.getByText('2026/08/07 23:13 〜 2026/08/10 22:49'),
    ).toBeVisible()
  },
}

export const 所要がまだ言えない: Story = {
  args: { screen: { ...ENCODE_SCREEN, spells: SPELLS_TOO_FEW } },
  play: async ({ canvasElement }) => {
    const spells = spellsLine(canvasElement)

    await expect(
      spells.getByText('完了 2 本。まだ 3 本に届いていません'),
    ).toBeVisible()
  },
}

export const 完了したジョブがない: Story = {
  args: { screen: { ...ENCODE_SCREEN, spells: SPELLS_NONE } },
  play: async ({ canvasElement }) => {
    const spells = spellsLine(canvasElement)

    await expect(
      spells.getByText('完了 0 本。まだ 3 本に届いていません'),
    ).toBeVisible()
    await expect(spells.queryByText(/〜/)).toBeNull()
  },
}

export const 自動実行は既定のまま: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('switch', { name: '自動実行' })).toBeChecked()
    await expect(canvas.getByText('既定のまま')).toBeVisible()

    const cores = canvas.getByRole('combobox', { name: '使用コア数の上限' })

    await expect(cores).toHaveTextContent('2')
    await expect(canvas.getByText('既定 2')).toBeVisible()

    await userEvent.click(cores)

    const listbox = await screen.findByRole('listbox')

    await expect(within(listbox).getAllByRole('option')).toHaveLength(
      AUTO_RUN_AS_DEPLOYED.coresThisMachineHas,
    )
    await expect(
      within(listbox).getByRole('option', { name: '6' }),
    ).toBeVisible()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
  },
}

export const 自動実行が設定済み: Story = {
  args: { screen: { ...ENCODE_SCREEN, autoRun: AUTO_RUN_SETTLED } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('switch', { name: '自動実行' }),
    ).not.toBeChecked()
    await expect(
      canvas.getByRole('combobox', { name: '使用コア数の上限' }),
    ).toHaveTextContent('4')
    await expect(canvas.getByText('2026/08/10 22:52 更新')).toBeVisible()
    await expect(canvas.queryByText('既定 4')).toBeNull()

    const panel = autoRunPanel(canvasElement)

    await expect(panel.getByText('対象')).toBeVisible()
    await expect(panel.getByText('完全・尻切れ')).toBeVisible()
  },
}

export const 使用コア数の上限を変える: Story = {
  play: async ({ canvasElement }) => {
    settleAutoRun.mockClear()

    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('combobox', { name: '使用コア数の上限' }),
    )

    const listbox = await screen.findByRole('listbox')

    await userEvent.click(within(listbox).getByRole('option', { name: '3' }))

    await waitFor(() => expect(settleAutoRun).toHaveBeenCalledWith(true, 3))
  },
}

export const 自動実行を切る: Story = {
  play: async ({ canvasElement }) => {
    settleAutoRun.mockClear()

    await userEvent.click(
      within(canvasElement).getByRole('switch', { name: '自動実行' }),
    )

    await waitFor(() => expect(settleAutoRun).toHaveBeenCalledWith(false, 2))
  },
}

export const 自動実行の保存を断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onSettleAutoRun: async () =>
        ({
          state: 'rejected',
          message:
            '使用コア数の上限がこの機械のコア数の範囲にないため、保存できませんでした。',
        }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('combobox', { name: '使用コア数の上限' }),
    )

    const listbox = await screen.findByRole('listbox')

    await userEvent.click(within(listbox).getByRole('option', { name: '5' }))

    await expect(
      await canvas.findByText(
        '使用コア数の上限がこの機械のコア数の範囲にないため、保存できませんでした。',
      ),
    ).toBeVisible()
    await expect(
      canvas.getByRole('combobox', { name: '使用コア数の上限' }),
    ).toHaveTextContent('2')
  },
}

export const 自動実行の保存でサインインが切れている: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onSettleAutoRun: async () => ({ state: 'unauthenticated' }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('switch', { name: '自動実行' }))

    await expect(
      await canvas.findByText(
        'サインインが切れているため、保存できませんでした。',
      ),
    ).toBeVisible()
    await expect(canvas.getByRole('switch', { name: '自動実行' })).toBeChecked()
  },
}

export const 自動実行の入切を断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onSettleAutoRun: async () =>
        ({
          state: 'rejected',
          message: '自動実行の指定が入っていないため、保存できませんでした。',
        }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('switch', { name: '自動実行' }))

    await expect(
      await canvas.findByText(
        '自動実行の指定が入っていないため、保存できませんでした。',
      ),
    ).toBeVisible()
    await expect(canvas.getByRole('switch', { name: '自動実行' })).toBeChecked()
  },
}

export const 対象にこの版が知らない値が来る: Story = {
  args: { screen: { ...ENCODE_SCREEN, autoRun: AUTO_RUN_ON_A_LATER_BUILD } },
  play: async ({ canvasElement }) => {
    const panel = autoRunPanel(canvasElement)

    await expect(panel.getByText('対象')).toBeVisible()
    await expect(panel.getByText('完全・この版がまだ知らない値')).toBeVisible()
  },
}

export const 対象に何も入っていない: Story = {
  args: { screen: { ...ENCODE_SCREEN, autoRun: AUTO_RUN_WITH_NOTHING_NAMED } },
  play: async ({ canvasElement }) => {
    const panel = autoRunPanel(canvasElement)

    await expect(panel.getByText('対象')).toBeVisible()
    await expect(panel.getByText('この版がまだ知らない値')).toBeVisible()
  },
}

export const 札の並び: Story = {
  play: async ({ canvasElement }) => {
    const rows = rowsOfTheTableHeaded(canvasElement, '番組')

    await expect(rows.length).toBeGreaterThan(3)
    await fillsTheColumn(rows, JOB_STATE_COLUMN)
  },
}

export const 行の操作の並び: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const changing = canvas.getAllByRole('button', { name: /を変更$/ })
    const removing = canvas.getAllByRole('button', { name: /を撤去$/ })

    await expect(changing.length).toBe(removing.length)
    await expect(changing.length).toBeGreaterThan(1)

    for (const [at, one] of changing.entries()) {
      await expect(widthOf(one)).toBe(widthOf(removing[at]))
      await expect(one.querySelector('svg')).not.toBeNull()
      await expect(removing[at].querySelector('svg')).not.toBeNull()
    }
  },
}
