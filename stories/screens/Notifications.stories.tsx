import { useState, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'

import type { NotificationWrite, TestSending } from '@/lib/notifications'
import {
  NO_PUBLIC_ORIGIN,
  NotificationsView,
  type NotificationActions,
} from '@/components/notifications/notifications-page'
import {
  DENIED_HERE,
  type BrowserChoice,
} from '@/components/notifications/add-destination-dialog'
import { REFUSED_ADDRESS } from '@/components/notifications/webhook-field'
import { inTheSettings } from '@/stories/frames'
import { PHONE } from '@/stories/rows-as-cards'
import {
  DESTINATIONS,
  DISCORD_ROOM,
  EMPTY_NOTIFICATIONS_SCREEN,
  HOME_SLACK,
  NOTIFICATIONS_NOW,
  NOTIFICATIONS_SCREEN,
  TWENTY_RULE_SETS,
} from '@/stories/fixtures/notifications'

const OK: NotificationWrite = { state: 'ok' }

const SLACK_ADDRESS = 'https://hooks.slack.com/services/T0AB12CD/B0EF34GH/a1b2'

const DISCORD_ADDRESS = 'https://discord.com/api/webhooks/1234567890/9f3e'

const REFUSED = 'https://hook.example.jp/carina'

const addWebhook = fn<NotificationActions['onAddWebhook']>(async () => OK)

const addBrowser = fn<BrowserChoice['onAdd']>(async () => OK)

const BROWSER: BrowserChoice = {
  here: 'Windows の Chrome',
  permission: 'default',
  onAdd: addBrowser,
}

const ON_A_PHONE: BrowserChoice = { ...BROWSER, here: 'iPhone の Safari' }

const toggleDestination = fn<NotificationActions['onToggleDestination']>(
  async () => OK,
)

const testDestination = fn<NotificationActions['onTestDestination']>(
  async (id): Promise<TestSending> =>
    id === DISCORD_ROOM.id
      ? { state: 'ok', delivered: false, failure: 'timedOut' }
      : { state: 'ok', delivered: true },
)

const reviseDestination = fn<NotificationActions['onReviseDestination']>(
  async () => OK,
)

const removeDestination = fn<NotificationActions['onRemoveDestination']>(
  async () => OK,
)

const addRuleSet = fn<NotificationActions['onAddRuleSet']>(async () => OK)

const reviseRuleSet = fn<NotificationActions['onReviseRuleSet']>(async () => OK)

const toggleRuleSet = fn<NotificationActions['onToggleRuleSet']>(async () => OK)

const removeRuleSet = fn<NotificationActions['onRemoveRuleSet']>(async () => OK)

const settleLead = fn<NotificationActions['onSettleLead']>(async () => OK)

const ACTIONS: NotificationActions = {
  onAddWebhook: addWebhook,
  onToggleDestination: toggleDestination,
  onTestDestination: testDestination,
  onReviseDestination: reviseDestination,
  onRemoveDestination: removeDestination,
  onAddRuleSet: addRuleSet,
  onReviseRuleSet: reviseRuleSet,
  onToggleRuleSet: toggleRuleSet,
  onRemoveRuleSet: removeRuleSet,
  onSettleLead: settleLead,
}

const meta = {
  title: 'Screens/設定/管理/通知',
  component: NotificationsView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/settings/notifications' },
    },
    layout: 'fullscreen',
  },
  args: {
    screen: NOTIFICATIONS_SCREEN,
    actions: ACTIONS,
    browser: BROWSER,
    now: NOTIFICATIONS_NOW,
  },
  decorators: [inTheSettings],
} satisfies Meta<typeof NotificationsView>

export default meta

type Story = StoryObj<typeof meta>

/** Opens a row's `…` and picks one of its items. */
async function fromTheMenu(
  canvasElement: HTMLElement,
  name: string,
  item: string,
) {
  await userEvent.click(
    within(canvasElement).getByRole('button', { name: `${name} の操作` }),
  )
  await userEvent.click(await screen.findByRole('menuitem', { name: item }))
}

async function openTheAdding(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  const destinations = canvas.getByRole('heading', { name: '送り先' })
    .parentElement as HTMLElement

  await userEvent.click(
    within(destinations).getByRole('button', { name: '追加' }),
  )

  return screen.findByRole('dialog', { name: '送り先を追加' })
}

async function openTheWebhookForm(canvasElement: HTMLElement) {
  const dialog = await openTheAdding(canvasElement)

  await userEvent.click(
    within(dialog).getByRole('button', { name: /Slack・Discord/ }),
  )

  return dialog
}

async function openTheBrowserForm(canvasElement: HTMLElement) {
  const dialog = await openTheAdding(canvasElement)

  await userEvent.click(
    within(dialog).getByRole('button', { name: /このブラウザ/ }),
  )

  return dialog
}

export const 通常: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const destinations = within(canvas.getByRole('list', { name: '送り先' }))

    await expect(canvas.getByText(NO_PUBLIC_ORIGIN)).toBeVisible()
    await expect(destinations.getAllByRole('listitem')).toHaveLength(3)
    await expect(
      destinations.getByText('届いていない · 時間切れ'),
    ).toBeVisible()
    await expect(
      destinations.getByRole('button', { name: '家の Slack の操作' }),
    ).toBeVisible()
    await expect(
      destinations.queryByRole('button', { name: /テスト送信|変更|削除/ }),
    ).toBeNull()
    await expect(
      destinations
        .getAllByText(/^(Slack|Discord|Web Push)$/)
        .map((chip) => chip.dataset.kind),
    ).toEqual(['slack', 'discord', 'webPush'])
    await expect(
      canvas.getByText(
        '録画の欠け・失敗 · エンコードの失敗 · 競合・取り逃し · 異常の発生 · 切断',
      ),
    ).toBeVisible()
    await expect(
      within(canvas.getByRole('group', { name: '単発の通知の既定' })).getByRole(
        'button',
        { name: '3 分前' },
      ),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      within(canvas.getByRole('list', { name: '直近の配送' })).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(8)
  },
}

export const 公開のアドレスがある: Story = {
  args: {
    screen: {
      ...NOTIFICATIONS_SCREEN,
      settings: { notifyLeadMinutes: 3, publicOriginKnown: true },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText(NO_PUBLIC_ORIGIN)).toBeNull()
  },
}

export const 何もない: Story = {
  args: { screen: EMPTY_NOTIFICATIONS_SCREEN },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('送り先がありません')).toBeVisible()
    await expect(canvas.getByText('ルールセットがありません')).toBeVisible()
    await expect(canvas.getByText('配送の記録はありません')).toBeVisible()

    const ruleSets = canvas.getByRole('heading', { name: 'ルールセット' })
      .parentElement as HTMLElement

    await expect(
      within(ruleSets).getByRole('button', { name: '追加' }),
    ).toBeDisabled()
  },
}

export const 送り先が多い: Story = {
  args: {
    screen: {
      ...NOTIFICATIONS_SCREEN,
      destinations: [
        ...DESTINATIONS,
        {
          ...HOME_SLACK,
          id: 'dest-slack-2',
          name: '実家のリビングの Slack のお知らせ用チャンネル',
          tail: 'c3d4',
          enabled: false,
          lastResultAt: '2026-11-08T12:03:00Z',
          lastFailure: 'rejected',
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('switch', {
        name: '実家のリビングの Slack のお知らせ用チャンネル を有効にする',
      }),
    ).not.toBeChecked()
    await expect(canvas.getByText('届かなかった · 断られた')).toBeVisible()
  },
}

export const 開けない送り先: Story = {
  args: {
    screen: {
      ...NOTIFICATIONS_SCREEN,
      destinations: [{ ...HOME_SLACK, readable: false }, DISCORD_ROOM],
    },
  },
  play: async ({ canvasElement }) => {
    const slack = within(
      within(canvasElement)
        .getByRole('list', { name: '送り先' })
        .querySelector(`[data-destination="${HOME_SLACK.id}"]`) as HTMLElement,
    )

    await expect(slack.getByText('開けない')).toBeVisible()
  },
}

export const ルールセットが上限: Story = {
  args: {
    screen: { ...NOTIFICATIONS_SCREEN, ruleSets: TWENTY_RULE_SETS },
  },
  play: async ({ canvasElement }) => {
    const ruleSets = within(canvasElement).getByRole('heading', {
      name: 'ルールセット',
    }).parentElement as HTMLElement

    await expect(
      within(ruleSets).getByRole('button', { name: '追加' }),
    ).toBeDisabled()
  },
}

export const テスト送信: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    testDestination.mockClear()

    await fromTheMenu(canvasElement, '家の Slack', 'テスト送信')
    await fromTheMenu(canvasElement, 'Discord の通知部屋', 'テスト送信')

    const destinations = within(canvas.getByRole('list', { name: '送り先' }))

    await waitFor(() => expect(testDestination).toHaveBeenCalledTimes(2))
    await expect(
      await destinations.findByText('テスト送信 · 届いた'),
    ).toBeVisible()
    await expect(
      await destinations.findByText('テスト送信 · 届かなかった · 時間切れ'),
    ).toBeVisible()
    await expect(destinations.queryByText('届いていない · 時間切れ')).toBeNull()
  },
}

export const 操作のメニュー: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '家の Slack の操作' }),
    )

    const menu = within(await screen.findByRole('menu'))

    await expect(
      menu.getAllByRole('menuitem').map((item) => item.textContent),
    ).toEqual(['テスト送信', '変更', '削除'])
  },
}

export const 操作のメニュー_このブラウザ: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', {
        name: 'iPad の Safari の操作',
      }),
    )

    const menu = within(await screen.findByRole('menu'))

    await expect(
      menu.getAllByRole('menuitem').map((item) => item.textContent),
    ).toEqual(['テスト送信', '削除'])
  },
}

export const 有効を切り替える: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const slack = canvas.getByRole('switch', {
      name: '家の Slack を有効にする',
    })

    toggleDestination.mockClear()

    await userEvent.click(slack)

    await waitFor(() =>
      expect(toggleDestination).toHaveBeenCalledWith(HOME_SLACK.id, false),
    )
    await expect(slack).not.toBeChecked()
  },
}

export const 切り替えを断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onToggleRuleSet: async () => ({
        state: 'rejected',
        message: 'このルールセットは残っていないため、変更できませんでした。',
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const away = canvas.getByRole('switch', { name: '留守の週 を有効にする' })

    await userEvent.click(away)

    await expect(
      await screen.findByText(
        'このルールセットは残っていないため、変更できませんでした。',
      ),
    ).toBeVisible()
    await waitFor(() => expect(away).not.toBeChecked())
  },
}

const NOT_REACHED_REVISING =
  '送り先を変更できませんでした。時間をおいてからもう一度お試しください。'

const NOT_REACHED_REMOVING =
  '送り先を削除できませんでした。時間をおいてからもう一度お試しください。'

const LEAD_NOT_SETTLED =
  '単発の通知の既定を変更できませんでした。時間をおいてからもう一度お試しください。'

const TESTED_TOO_SOON =
  '続けてテスト送信はできません。1 分ほどおいてからお試しください。'

const RULE_SETS_FULL = 'ルールセットは 20 本までのため、追加できませんでした。'

const CHOSEN_DESTINATION_GONE =
  '選んだ送り先が残っていないため、変更できませんでした。'

const RULE_SET_NOT_REMOVED =
  'ルールセットを削除できませんでした。時間をおいてからもう一度お試しください。'

/** An action that turns away whatever it is asked, in these words. */
function turnedAway(message: string) {
  return async (): Promise<NotificationWrite> => ({
    state: 'rejected',
    message,
  })
}

async function aToastSays(words: string) {
  const said = await screen.findByText(words)

  await expect(said.closest('[data-slot="toast"]')).toBeVisible()
}

export const 送り先の切り替えを断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onToggleDestination: turnedAway(NOT_REACHED_REVISING),
    },
  },
  play: async ({ canvasElement }) => {
    const slack = within(canvasElement).getByRole('switch', {
      name: '家の Slack を有効にする',
    })

    await expect(slack).toBeChecked()

    await userEvent.click(slack)

    await aToastSays(NOT_REACHED_REVISING)
    await waitFor(() => expect(slack).toBeChecked())
  },
}

export const 単発の通知の既定を断られる: Story = {
  args: {
    actions: { ...ACTIONS, onSettleLead: turnedAway(LEAD_NOT_SETTLED) },
  },
  play: async ({ canvasElement }) => {
    const lead = within(
      within(canvasElement).getByRole('group', { name: '単発の通知の既定' }),
    )

    await userEvent.click(lead.getByRole('button', { name: '5 分前' }))

    await aToastSays(LEAD_NOT_SETTLED)
    await waitFor(() =>
      expect(lead.getByRole('button', { name: '3 分前' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    await expect(lead.getByRole('button', { name: '5 分前' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  },
}

export const テスト送信を断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onTestDestination: async () => ({
        state: 'rejected',
        message: TESTED_TOO_SOON,
      }),
    },
  },
  play: async ({ canvasElement }) => {
    await fromTheMenu(canvasElement, '家の Slack', 'テスト送信')

    await aToastSays(TESTED_TOO_SOON)
    await expect(
      within(
        within(canvasElement).getByRole('list', { name: '送り先' }),
      ).queryByText(/^テスト送信 · /),
    ).toBeNull()
  },
}

export const 単発の通知の既定を変える: Story = {
  play: async ({ canvasElement }) => {
    const lead = within(
      within(canvasElement).getByRole('group', { name: '単発の通知の既定' }),
    )

    settleLead.mockClear()

    await userEvent.click(lead.getByRole('button', { name: '5 分前' }))

    await waitFor(() => expect(settleLead).toHaveBeenCalledWith(5))
    await expect(lead.getByRole('button', { name: '5 分前' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  },
}

export const 配送を送り先で絞る: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('combobox', { name: '送り先' }))
    await userEvent.click(
      await screen.findByRole('option', { name: 'Discord の通知部屋' }),
    )

    await waitFor(() =>
      expect(
        within(canvas.getByRole('list', { name: '直近の配送' })).getAllByRole(
          'listitem',
        ),
      ).toHaveLength(3),
    )
    await expect(
      canvas.getByRole('combobox', { name: '送り先' }),
    ).toHaveTextContent('Discord の通知部屋')
  },
}

export const 送り先を追加_種類を選ぶ: Story = {
  play: async ({ canvasElement }) => {
    const dialog = within(await openTheAdding(canvasElement))

    await expect(
      dialog.getByRole('button', { name: /Slack・Discord の URL に送ります/ }),
    ).toBeVisible()
    await expect(
      dialog.getByText('Windows の Chrome に通知を出します'),
    ).toBeVisible()
  },
}

export const 送り先を追加_Webhookだけ: Story = {
  args: { browser: undefined },
  play: async ({ canvasElement }) => {
    const dialog = within(await openTheAdding(canvasElement))

    await expect(dialog.getByLabelText('Webhook の URL')).toBeVisible()
    await expect(dialog.queryByRole('button', { name: '戻る' })).toBeNull()
    await expect(
      dialog.queryByRole('button', { name: /Slack・Discord/ }),
    ).toBeNull()
  },
}

export const 送り先を追加_Slack: Story = {
  play: async ({ canvasElement }) => {
    const dialog = within(await openTheWebhookForm(canvasElement))
    const add = dialog.getByRole('button', { name: '追加' })

    await expect(add).toBeDisabled()

    await userEvent.type(dialog.getByLabelText('名前'), '家の Slack')
    await userEvent.type(dialog.getByLabelText('Webhook の URL'), SLACK_ADDRESS)

    await expect(dialog.getByText('Slack として登録します')).toBeVisible()
    await expect(
      dialog.getByText('保存したあとは末尾だけが見えます'),
    ).toBeVisible()
    await expect(add).toBeEnabled()
  },
}

export const 送り先を追加_Discord: Story = {
  play: async ({ canvasElement }) => {
    const dialog = within(await openTheWebhookForm(canvasElement))

    await userEvent.type(dialog.getByLabelText('名前'), 'Discord の通知部屋')
    await userEvent.type(
      dialog.getByLabelText('Webhook の URL'),
      DISCORD_ADDRESS,
    )

    await expect(dialog.getByText('Discord として登録します')).toBeVisible()
    await expect(dialog.getByRole('button', { name: '追加' })).toBeEnabled()
  },
}

export const 送り先を追加_受け付けないURL: Story = {
  play: async ({ canvasElement }) => {
    const dialog = within(await openTheWebhookForm(canvasElement))
    const address = dialog.getByLabelText('Webhook の URL')

    await userEvent.type(dialog.getByLabelText('名前'), '自作の受け口')
    await userEvent.type(address, REFUSED)

    await expect(dialog.queryByText(REFUSED_ADDRESS)).toBeNull()

    await userEvent.tab()

    await expect(dialog.getByText(REFUSED_ADDRESS)).toBeVisible()
    await expect(address).toHaveAttribute('aria-invalid', 'true')
    await expect(dialog.getByRole('button', { name: '追加' })).toBeDisabled()
  },
}

export const 送り先を追加_戻る: Story = {
  play: async ({ canvasElement }) => {
    const dialog = within(await openTheWebhookForm(canvasElement))

    await userEvent.click(dialog.getByRole('button', { name: '戻る' }))

    await expect(
      dialog.getByRole('button', { name: /Slack・Discord/ }),
    ).toBeVisible()
    await expect(dialog.queryByRole('button', { name: '戻る' })).toBeNull()
  },
}

export const 送り先を追加_このブラウザ: Story = {
  play: async ({ canvasElement }) => {
    const dialog = within(await openTheBrowserForm(canvasElement))

    addBrowser.mockClear()

    await expect(dialog.getByLabelText('名前')).toHaveValue('Windows の Chrome')

    await userEvent.click(dialog.getByRole('button', { name: '許可して追加' }))

    await waitFor(() =>
      expect(addBrowser).toHaveBeenCalledWith({ name: 'Windows の Chrome' }),
    )
  },
}

export const 送り先を追加_通知を拒否している: Story = {
  args: { browser: { ...BROWSER, permission: 'denied' } },
  play: async ({ canvasElement }) => {
    const dialog = within(await openTheBrowserForm(canvasElement))

    await expect(dialog.getByText(DENIED_HERE)).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: '許可して追加' }),
    ).toBeDisabled()
  },
}

export const 送り先を追加する: Story = {
  play: async ({ canvasElement }) => {
    const dialog = within(await openTheWebhookForm(canvasElement))

    addWebhook.mockClear()

    await userEvent.type(dialog.getByLabelText('名前'), '家の Slack')
    await userEvent.type(dialog.getByLabelText('Webhook の URL'), SLACK_ADDRESS)
    await userEvent.click(dialog.getByRole('button', { name: '追加' }))

    await waitFor(() =>
      expect(addWebhook).toHaveBeenCalledWith({
        name: '家の Slack',
        url: SLACK_ADDRESS,
      }),
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '送り先を追加' })).toBeNull(),
    )
  },
}

export const 送り先の追加を断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onAddWebhook: async () => ({
        state: 'rejected',
        message: 'この URL は受け付けられません。',
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const dialog = within(await openTheWebhookForm(canvasElement))

    await userEvent.type(dialog.getByLabelText('名前'), '家の Slack')
    await userEvent.type(dialog.getByLabelText('Webhook の URL'), SLACK_ADDRESS)
    await userEvent.click(dialog.getByRole('button', { name: '追加' }))

    await expect(
      await dialog.findByText('この URL は受け付けられません。'),
    ).toBeVisible()
    await expect(dialog.getByLabelText('名前')).toHaveValue('家の Slack')
    await expect(dialog.getByLabelText('Webhook の URL')).toHaveValue(
      SLACK_ADDRESS,
    )
    await expect(dialog.getByRole('button', { name: '追加' })).toBeEnabled()
  },
}

export const 送り先を変更: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await fromTheMenu(canvasElement, '家の Slack', '変更')

    const dialog = within(
      await screen.findByRole('dialog', { name: '送り先を変更' }),
    )
    const address = dialog.getByLabelText('Webhook の URL')

    await expect(dialog.getByLabelText('名前')).toHaveValue('家の Slack')
    await expect(address).toHaveValue('')
    await expect(address).toHaveAttribute(
      'placeholder',
      '変えないときは空のまま',
    )
    await expect(dialog.getByText('Slack · 末尾 …a1b2')).toBeVisible()
    await expect(dialog.getByRole('switch', { name: '有効' })).toBeChecked()
  },
}

export const 送り先の変更を保存する: Story = {
  play: async ({ canvasElement }) => {
    reviseDestination.mockClear()

    await fromTheMenu(canvasElement, '家の Slack', '変更')

    const dialog = within(
      await screen.findByRole('dialog', { name: '送り先を変更' }),
    )

    await userEvent.click(dialog.getByRole('button', { name: '保存' }))

    await waitFor(() =>
      expect(reviseDestination).toHaveBeenCalledWith(HOME_SLACK.id, {
        name: '家の Slack',
        enabled: true,
      }),
    )
  },
}

export const 送り先の変更を断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onReviseDestination: turnedAway('この URL は受け付けられません。'),
    },
  },
  play: async ({ canvasElement }) => {
    await fromTheMenu(canvasElement, '家の Slack', '変更')

    const dialog = within(
      await screen.findByRole('dialog', { name: '送り先を変更' }),
    )

    await userEvent.type(dialog.getByLabelText('名前'), '(居間)')
    await userEvent.type(
      dialog.getByLabelText('Webhook の URL'),
      DISCORD_ADDRESS,
    )
    await userEvent.click(dialog.getByRole('switch', { name: '有効' }))
    await userEvent.click(dialog.getByRole('button', { name: '保存' }))

    await expect(
      await dialog.findByText('この URL は受け付けられません。'),
    ).toBeVisible()
    await expect(dialog.getByLabelText('名前')).toHaveValue('家の Slack(居間)')
    await expect(dialog.getByLabelText('Webhook の URL')).toHaveValue(
      DISCORD_ADDRESS,
    )
    await expect(dialog.getByRole('switch', { name: '有効' })).not.toBeChecked()
    await expect(dialog.getByRole('button', { name: '保存' })).toBeEnabled()
  },
}

export const 送り先の削除を断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onRemoveDestination: turnedAway(NOT_REACHED_REMOVING),
    },
  },
  play: async ({ canvasElement }) => {
    await fromTheMenu(canvasElement, 'Discord の通知部屋', '削除')

    const asked = within(await screen.findByRole('alertdialog'))

    await userEvent.click(asked.getByRole('button', { name: '削除する' }))

    await expect(await asked.findByText(NOT_REACHED_REMOVING)).toBeVisible()
    await expect(asked.getByRole('button', { name: '削除する' })).toBeEnabled()

    await userEvent.click(asked.getByRole('button', { name: 'キャンセル' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    await expect(
      within(canvasElement).getByRole('button', {
        name: 'Discord の通知部屋 の操作',
      }),
    ).toBeVisible()
  },
}

export const 送り先を削除: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    removeDestination.mockClear()

    await fromTheMenu(canvasElement, 'Discord の通知部屋', '削除')

    const asked = within(await screen.findByRole('alertdialog'))

    await expect(asked.getByText('この送り先を削除します')).toBeVisible()
    await expect(asked.getByText('Discord の通知部屋')).toBeVisible()
    await expect(
      asked.getByText('ルールセット「録画の記録」も削除します。'),
    ).toBeVisible()

    await userEvent.click(asked.getByRole('button', { name: '削除する' }))

    await waitFor(() =>
      expect(removeDestination).toHaveBeenCalledWith(DISCORD_ROOM.id),
    )
  },
}

const DESTINATION_GONE = 'この送り先は残っていないため、変更できませんでした。'

const DESTINATION_GONE_REMOVING =
  'この送り先は残っていないため、削除できませんでした。'

const RULE_SET_GONE =
  'このルールセットは残っていないため、変更できませんでした。'

const RULE_SET_GONE_REMOVING =
  'このルールセットは残っていないため、削除できませんでした。'

/** The page as it is when what is changed or removed was removed on another screen: the write is refused and the row leaves the page. */
function RemovedElsewhere(props: ComponentProps<typeof NotificationsView>) {
  const [held, setHeld] = useState(props.screen)

  const refusedAs =
    (message: string) =>
    async (id: string): Promise<NotificationWrite> => {
      setHeld((was) => ({
        ...was,
        destinations: was.destinations.filter((one) => one.id !== id),
        ruleSets: was.ruleSets.filter((one) => one.id !== id),
      }))

      return { state: 'rejected', message, gone: true }
    }

  return (
    <NotificationsView
      {...props}
      screen={held}
      actions={{
        ...props.actions,
        onReviseDestination: refusedAs(DESTINATION_GONE),
        onRemoveDestination: refusedAs(DESTINATION_GONE_REMOVING),
        onReviseRuleSet: refusedAs(RULE_SET_GONE),
        onRemoveRuleSet: refusedAs(RULE_SET_GONE_REMOVING),
      }}
    />
  )
}

/** The refusal stands whole in the toast, the dialog that asked having left. */
async function theToastSays(words: string) {
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())

  const said = await screen.findByText(words)

  await expect(said.closest('[data-slot="toast"]')).toBeVisible()
  await expect(said.scrollWidth).toBeLessThanOrEqual(said.clientWidth)
}

export const よそで消された送り先を保存する: Story = {
  render: (args) => <RemovedElsewhere {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await fromTheMenu(canvasElement, '家の Slack', '変更')

    const dialog = within(
      await screen.findByRole('dialog', { name: '送り先を変更' }),
    )

    await userEvent.type(dialog.getByLabelText('名前'), '(居間)')
    await userEvent.click(dialog.getByRole('button', { name: '保存' }))

    await theToastSays(DESTINATION_GONE)
    await expect(
      within(canvas.getByRole('list', { name: '送り先' })).getAllByRole(
        'listitem',
      ),
    ).toHaveLength(2)
  },
}

export const よそで消された送り先を削除する: Story = {
  render: (args) => <RemovedElsewhere {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await fromTheMenu(canvasElement, 'Discord の通知部屋', '削除')
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: '削除する',
      }),
    )

    await theToastSays(DESTINATION_GONE_REMOVING)
    await expect(
      canvas.queryByRole('button', { name: 'Discord の通知部屋 の操作' }),
    ).toBeNull()
  },
}

export const よそで消されたルールセットを保存する: Story = {
  render: (args) => <RemovedElsewhere {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await fromTheMenu(canvasElement, '困ったときだけ', '変更')

    const dialog = within(
      await screen.findByRole('dialog', { name: 'ルールセットを変更' }),
    )

    await userEvent.click(
      within(dialog.getByRole('group', { name: '録画' })).getByRole('button', {
        name: '開始',
      }),
    )
    await userEvent.click(dialog.getByRole('button', { name: '保存' }))

    await theToastSays(RULE_SET_GONE)
    await expect(
      canvas.queryByRole('button', { name: '困ったときだけ の操作' }),
    ).toBeNull()
  },
}

export const よそで消されたルールセットを削除する: Story = {
  render: (args) => <RemovedElsewhere {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await fromTheMenu(canvasElement, '困ったときだけ', '変更')

    const dialog = within(
      await screen.findByRole('dialog', { name: 'ルールセットを変更' }),
    )

    await userEvent.click(
      dialog.getByRole('button', { name: '困ったときだけ を削除' }),
    )
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: '削除する',
      }),
    )

    await theToastSays(RULE_SET_GONE_REMOVING)
    await expect(
      canvas.queryByRole('button', { name: '困ったときだけ の操作' }),
    ).toBeNull()
  },
}

export const 送り先を削除_ほかにも送るルールセット: Story = {
  play: async ({ canvasElement }) => {
    await fromTheMenu(canvasElement, '家の Slack', '削除')

    const asked = within(await screen.findByRole('alertdialog'))

    await expect(asked.getByText('家の Slack')).toBeVisible()
    await expect(asked.queryByText(/も削除します/)).toBeNull()
  },
}

export const ルールセットを変更: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await fromTheMenu(canvasElement, '困ったときだけ', '変更')

    const dialog = within(
      await screen.findByRole('dialog', { name: 'ルールセットを変更' }),
    )
    const recording = within(dialog.getByRole('group', { name: '録画' }))
    const to = within(dialog.getByRole('group', { name: '送り先' }))

    await expect(dialog.getByLabelText('名前')).toHaveValue('困ったときだけ')
    await expect(
      recording.getByRole('button', { name: '開始' }),
    ).toHaveAttribute('aria-pressed', 'false')
    await expect(
      recording.getByRole('button', { name: '欠け' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      to.getByRole('button', { name: 'Discord の通知部屋' }),
    ).toHaveAttribute('aria-pressed', 'false')
    await expect(
      dialog.getByRole('button', { name: '困ったときだけ を削除' }),
    ).toBeVisible()
  },
}

export const ルールセットを保存する: Story = {
  play: async ({ canvasElement }) => {
    reviseRuleSet.mockClear()

    await fromTheMenu(canvasElement, '困ったときだけ', '変更')

    const dialog = within(
      await screen.findByRole('dialog', { name: 'ルールセットを変更' }),
    )
    const recording = within(dialog.getByRole('group', { name: '録画' }))

    await userEvent.click(recording.getByRole('button', { name: '開始' }))
    await userEvent.click(dialog.getByRole('button', { name: '保存' }))

    await waitFor(() =>
      expect(reviseRuleSet).toHaveBeenCalledWith(
        'rule-trouble',
        expect.objectContaining({
          events: expect.arrayContaining(['recordingStarted']),
        }),
      ),
    )
  },
}

export const ルールセットの保存を断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onReviseRuleSet: turnedAway(CHOSEN_DESTINATION_GONE),
    },
  },
  play: async ({ canvasElement }) => {
    await fromTheMenu(canvasElement, '困ったときだけ', '変更')

    const dialog = within(
      await screen.findByRole('dialog', { name: 'ルールセットを変更' }),
    )
    const recording = within(dialog.getByRole('group', { name: '録画' }))
    const to = within(dialog.getByRole('group', { name: '送り先' }))

    await userEvent.type(dialog.getByLabelText('名前'), '(夜)')
    await userEvent.click(recording.getByRole('button', { name: '開始' }))
    await userEvent.click(
      to.getByRole('button', { name: 'Discord の通知部屋' }),
    )
    await userEvent.click(dialog.getByRole('button', { name: '保存' }))

    await expect(await dialog.findByText(CHOSEN_DESTINATION_GONE)).toBeVisible()
    await expect(dialog.getByLabelText('名前')).toHaveValue(
      '困ったときだけ(夜)',
    )
    await expect(
      recording.getByRole('button', { name: '開始' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      to.getByRole('button', { name: 'Discord の通知部屋' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(dialog.getByRole('button', { name: '保存' })).toBeEnabled()
  },
}

export const ルールセットの削除を断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onRemoveRuleSet: turnedAway(RULE_SET_NOT_REMOVED),
    },
  },
  play: async ({ canvasElement }) => {
    await fromTheMenu(canvasElement, '困ったときだけ', '変更')

    const dialog = within(
      await screen.findByRole('dialog', { name: 'ルールセットを変更' }),
    )

    await userEvent.click(
      dialog.getByRole('button', { name: '困ったときだけ を削除' }),
    )

    const asked = within(await screen.findByRole('alertdialog'))

    await userEvent.click(asked.getByRole('button', { name: '削除する' }))

    await expect(await asked.findByText(RULE_SET_NOT_REMOVED)).toBeVisible()

    await userEvent.click(asked.getByRole('button', { name: 'キャンセル' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    await expect(
      within(
        await screen.findByRole('dialog', { name: 'ルールセットを変更' }),
      ).getByLabelText('名前'),
    ).toHaveValue('困ったときだけ')
  },
}

export const ルールセットの追加を断られる: Story = {
  args: {
    actions: { ...ACTIONS, onAddRuleSet: turnedAway(RULE_SETS_FULL) },
  },
  play: async ({ canvasElement }) => {
    const ruleSets = within(canvasElement).getByRole('heading', {
      name: 'ルールセット',
    }).parentElement as HTMLElement

    await userEvent.click(
      within(ruleSets).getByRole('button', { name: '追加' }),
    )

    const dialog = within(
      await screen.findByRole('dialog', { name: 'ルールセットを追加' }),
    )
    const recording = within(dialog.getByRole('group', { name: '録画' }))
    const to = within(dialog.getByRole('group', { name: '送り先' }))

    await userEvent.type(dialog.getByLabelText('名前'), '夜中の失敗')
    await userEvent.click(recording.getByRole('button', { name: '失敗' }))
    await userEvent.click(to.getByRole('button', { name: '家の Slack' }))
    await userEvent.click(dialog.getByRole('button', { name: '保存' }))

    await expect(await dialog.findByText(RULE_SETS_FULL)).toBeVisible()
    await expect(dialog.getByLabelText('名前')).toHaveValue('夜中の失敗')
    await expect(
      recording.getByRole('button', { name: '失敗' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      to.getByRole('button', { name: '家の Slack' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const ルールセットを追加: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const ruleSets = canvas.getByRole('heading', { name: 'ルールセット' })
      .parentElement as HTMLElement

    addRuleSet.mockClear()

    await userEvent.click(
      within(ruleSets).getByRole('button', { name: '追加' }),
    )

    const dialog = within(
      await screen.findByRole('dialog', { name: 'ルールセットを追加' }),
    )
    const save = dialog.getByRole('button', { name: '保存' })

    await expect(save).toBeDisabled()
    await expect(dialog.queryByRole('button', { name: /を削除/ })).toBeNull()

    await userEvent.type(dialog.getByLabelText('名前'), '夜中の失敗')
    await userEvent.click(
      within(dialog.getByRole('group', { name: '録画' })).getByRole('button', {
        name: '失敗',
      }),
    )

    await expect(save).toBeDisabled()

    await userEvent.click(
      within(dialog.getByRole('group', { name: '送り先' })).getByRole(
        'button',
        { name: '家の Slack' },
      ),
    )
    await userEvent.click(save)

    await waitFor(() =>
      expect(addRuleSet).toHaveBeenCalledWith({
        name: '夜中の失敗',
        enabled: true,
        events: ['recordingFailed'],
        destinations: [HOME_SLACK.id],
      }),
    )
  },
}

export const 電話: Story = {
  parameters: { screen: PHONE, coarse: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const slack = within(
      canvas
        .getByRole('list', { name: '送り先' })
        .querySelector(`[data-destination="${HOME_SLACK.id}"]`) as HTMLElement,
    )

    await expect(slack.getByText('· …a1b2')).toBeVisible()
    await expect(
      canvas.getByRole('button', { name: '困ったときだけ の操作' }),
    ).toBeVisible()
  },
}

export const 電話_送り先を追加: Story = {
  parameters: { screen: PHONE, coarse: true },
  args: { browser: ON_A_PHONE },
  play: async ({ canvasElement }) => {
    const dialog = await openTheAdding(canvasElement)
    const sheet = dialog.getBoundingClientRect()

    await expect(
      within(dialog).getByText('iPhone の Safari に通知を出します'),
    ).toBeVisible()
    await waitFor(() =>
      expect(Math.round(dialog.getBoundingClientRect().bottom)).toBe(
        window.innerHeight,
      ),
    )
    await expect(Math.round(sheet.width)).toBe(window.innerWidth)
  },
}

export const 電話_このブラウザ: Story = {
  parameters: { screen: PHONE, coarse: true },
  args: { browser: ON_A_PHONE },
  play: async ({ canvasElement }) => {
    const dialog = within(await openTheBrowserForm(canvasElement))

    await expect(dialog.getByLabelText('名前')).toHaveValue('iPhone の Safari')
  },
}

export const 電話_ルールセットを変更: Story = {
  parameters: { screen: PHONE, coarse: true },
  play: async ({ canvasElement }) => {
    await fromTheMenu(canvasElement, '録画の記録', '変更')

    const dialog = await screen.findByRole('dialog', {
      name: 'ルールセットを変更',
    })

    await expect(within(dialog).getByLabelText('名前')).toHaveValue(
      '録画の記録',
    )
    await waitFor(() =>
      expect(Math.round(dialog.getBoundingClientRect().bottom)).toBe(
        window.innerHeight,
      ),
    )
  },
}

const NEVER_SENT = {
  ...HOME_SLACK,
  id: 'dest-slack-new',
  name: '新しい Slack',
  tail: 'e5f6',
  lastResultAt: undefined,
  lastFailure: undefined,
}

function neverSentRow(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement)
    .getByRole('list', { name: '送り先' })
    .querySelector(`[data-destination="${NEVER_SENT.id}"]`) as HTMLElement
}

export const まだ送っていない送り先は名前が行の中央に立つ: Story = {
  args: {
    screen: {
      ...NOTIFICATIONS_SCREEN,
      destinations: [...DESTINATIONS, NEVER_SENT],
    },
  },
  play: async ({ canvasElement }) => {
    const row = neverSentRow(canvasElement)
    const room = row.getBoundingClientRect()
    const name = within(row).getByText(NEVER_SENT.name).getBoundingClientRect()
    const flip = within(row).getByRole('switch').getBoundingClientRect()

    await expect(
      Math.abs(name.top + name.height / 2 - (room.top + room.height / 2)),
    ).toBeLessThanOrEqual(1)
    await expect(
      Math.abs(flip.top + flip.height / 2 - (room.top + room.height / 2)),
    ).toBeLessThanOrEqual(1)
    await expect(within(row).getAllByText('…e5f6')[0]).toBeVisible()
    await expect(row.querySelector('[aria-live]')).not.toBeVisible()
  },
}

export const 電話_まだ送っていない送り先: Story = {
  args: {
    screen: {
      ...NOTIFICATIONS_SCREEN,
      destinations: [...DESTINATIONS, NEVER_SENT],
    },
  },
  parameters: { screen: PHONE, coarse: true },
  play: async ({ canvasElement }) => {
    const row = neverSentRow(canvasElement)
    const under = row.querySelector<HTMLElement>('[aria-live]')!

    await expect(under).toBeVisible()
    await expect(under).toHaveTextContent('…e5f6')
    await expect(under.querySelector('[data-slot="status-dot"]')).toBeNull()
  },
}
