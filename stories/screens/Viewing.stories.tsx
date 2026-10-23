import type { Meta, StoryObj } from '@storybook/nextjs'
import { useCallback, useState, type ComponentProps } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import { NO_RESIDENCE, type Residence } from '@/lib/bml/receiver-info'
import {
  NOT_REGISTERED,
  POSTAL_CODE_LABEL,
  POSTAL_CODE_PROBLEM,
  PREFECTURE_LABEL,
  RESIDENCE_HEADING,
} from '@/lib/residence'
import type { ResidenceWrite } from '@/repository/data-broadcast-settings'

import {
  AUTO_OPEN_LABEL,
  HYBRIDCAST_LABEL,
  LINE_LABEL,
  RECEIVER_ID_LABEL,
  SOUNDS_LABEL,
  viewingSettingsOf,
} from '@/lib/viewing'
import {
  DATA_BROADCAST_AUTO_OPEN,
  DATA_BROADCAST_HYBRIDCAST,
  DATA_BROADCAST_LINE,
  DATA_BROADCAST_RECEIVER_ID,
  DATA_BROADCAST_SOUNDS,
  cookieIn,
  forgettingCookie,
  storingCookie,
} from '@/lib/stored-flag'
import { ViewingView } from '@/components/viewing/viewing-page'
import { inTheSettings } from '@/stories/frames'
import { afterTheArrival } from '@/stories/after-the-arrival'

const meta = {
  title: 'Screens/設定・視聴',
  component: ViewingView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/settings/viewing' },
    },
    layout: 'fullscreen',
  },
  decorators: [inTheSettings],
  args: {
    residence: { state: 'ok', value: NO_RESIDENCE },
    onSettleResidence: fn(async (): Promise<ResidenceWrite> => ({
      state: 'ok',
    })),
  },
  beforeEach: () => {
    forgetTheSettings()

    return forgetTheSettings
  },
} satisfies Meta<typeof ViewingView>

export default meta
type Story = StoryObj<typeof meta>

const SETTINGS = [
  DATA_BROADCAST_AUTO_OPEN,
  DATA_BROADCAST_LINE,
  DATA_BROADCAST_RECEIVER_ID,
  DATA_BROADCAST_HYBRIDCAST,
  DATA_BROADCAST_SOUNDS,
]

function forgetTheSettings() {
  SETTINGS.forEach((key) => {
    document.cookie = forgettingCookie(key)
  })
}

function cookie(key = DATA_BROADCAST_AUTO_OPEN): string | undefined {
  return document.cookie
    .split('; ')
    .find((one) => one.startsWith(`${key}=`))
    ?.split('=')[1]
}

export const 通常: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const autoOpen = canvas.getByRole('switch', { name: AUTO_OPEN_LABEL })

    await expect(autoOpen).not.toBeChecked()

    await userEvent.click(autoOpen)

    await expect(autoOpen).toBeChecked()
    await expect(cookie()).toBe('opens')

    await userEvent.click(autoOpen)

    await expect(autoOpen).not.toBeChecked()
    await expect(cookie()).toBe('waits')
  },
}

export const 自動で開く: Story = {
  args: { autoOpensDataBroadcast: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('switch', { name: AUTO_OPEN_LABEL }),
    ).toBeChecked()
  },
}

export const 通信と識別子: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const line = canvas.getByRole('switch', { name: LINE_LABEL })
    const receiverId = canvas.getByRole('switch', { name: RECEIVER_ID_LABEL })

    await expect(line).not.toBeChecked()
    await expect(receiverId).not.toBeChecked()
    await expect(receiverId).toBeDisabled()

    await userEvent.click(line)

    await expect(line).toBeChecked()
    await expect(cookie(DATA_BROADCAST_LINE)).toBe('allows')
    await expect(receiverId).toBeEnabled()

    await userEvent.click(receiverId)

    await expect(receiverId).toBeChecked()
    await expect(cookie(DATA_BROADCAST_RECEIVER_ID)).toBe('hands')

    await userEvent.click(line)

    await expect(line).not.toBeChecked()
    await expect(cookie(DATA_BROADCAST_LINE)).toBe('refuses')
    await expect(receiverId).not.toBeChecked()
    await expect(receiverId).toBeDisabled()
    await expect(cookie(DATA_BROADCAST_RECEIVER_ID)).toBe('keeps')
  },
}

export const 通信を許可している: Story = {
  args: {
    allowsTheLine: true,
    handsTheReceiverId: true,
    allowsHybridcast: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('switch', { name: LINE_LABEL })).toBeChecked()
    await expect(
      canvas.getByRole('switch', { name: RECEIVER_ID_LABEL }),
    ).toBeChecked()
    await expect(
      canvas.getByRole('switch', { name: HYBRIDCAST_LABEL }),
    ).toBeChecked()
  },
}

export const Hybridcast: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const line = canvas.getByRole('switch', { name: LINE_LABEL })
    const hybridcast = canvas.getByRole('switch', { name: HYBRIDCAST_LABEL })

    await expect(hybridcast).not.toBeChecked()
    await expect(hybridcast).toBeDisabled()

    await userEvent.click(line)

    await expect(hybridcast).toBeEnabled()

    await userEvent.click(hybridcast)

    await expect(hybridcast).toBeChecked()
    await expect(cookie(DATA_BROADCAST_HYBRIDCAST)).toBe('allows')

    await userEvent.click(line)

    await expect(hybridcast).not.toBeChecked()
    await expect(hybridcast).toBeDisabled()
    await expect(cookie(DATA_BROADCAST_HYBRIDCAST)).toBe('refuses')

    await userEvent.click(line)

    await expect(hybridcast).not.toBeChecked()
  },
}

export const 効果音: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const sounds = canvas.getByRole('switch', { name: SOUNDS_LABEL })

    await expect(sounds).toBeChecked()
    await expect(sounds).toBeEnabled()
    await expect(cookie(DATA_BROADCAST_SOUNDS)).toBeUndefined()

    await userEvent.click(sounds)

    await expect(sounds).not.toBeChecked()
    await expect(cookie(DATA_BROADCAST_SOUNDS)).toBe('silent')

    await userEvent.click(canvas.getByRole('switch', { name: LINE_LABEL }))
    await userEvent.click(canvas.getByRole('switch', { name: LINE_LABEL }))

    await expect(sounds).not.toBeChecked()
    await expect(sounds).toBeEnabled()

    await userEvent.click(sounds)

    await expect(sounds).toBeChecked()
    await expect(cookie(DATA_BROADCAST_SOUNDS)).toBe('plays')
  },
}

export const 効果音が切: Story = {
  args: { playsSounds: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('switch', { name: SOUNDS_LABEL }),
    ).not.toBeChecked()
  },
}

/** What hydrating the page's server HTML said was wrong with it, for the play to read. */
const heardWhileHydrating: string[] = []

/** The page as the server draws it from the cookies, then hydrated in the browser that holds the same cookies. */
function FromTheServer() {
  const hydrated = useCallback((node: HTMLDivElement | null) => {
    if (node === null) {
      return
    }

    const settings = viewingSettingsOf((key) => cookieIn(document.cookie, key))
    const page = (
      <ViewingView
        {...settings}
        residence={{ state: 'ok', value: NO_RESIDENCE }}
        onSettleResidence={async () => ({ state: 'ok' })}
      />
    )

    node.innerHTML = renderToString(page)
    const root = hydrateRoot(node, page, {
      onRecoverableError: (error) => {
        heardWhileHydrating.push(String(error))
      },
    })

    return () => {
      setTimeout(() => root.unmount(), 0)
    }
  }, [])

  return <div ref={hydrated} />
}

function storedBeforeTheServerDraws(said: Record<string, string>) {
  return () => {
    forgetTheSettings()
    heardWhileHydrating.length = 0
    Object.entries(said).forEach(([key, value]) => {
      document.cookie = storingCookie(key, value)
    })

    return forgetTheSettings
  }
}

async function hydratedWith(
  canvasElement: HTMLElement,
  line: boolean,
  receiverId: boolean,
  hybridcast: boolean,
  sounds: boolean,
) {
  const canvas = within(canvasElement)
  const lineSwitch = await canvas.findByRole('switch', { name: LINE_LABEL })
  const receiverIdSwitch = canvas.getByRole('switch', {
    name: RECEIVER_ID_LABEL,
  })
  const hybridcastSwitch = canvas.getByRole('switch', {
    name: HYBRIDCAST_LABEL,
  })
  const soundsSwitch = canvas.getByRole('switch', { name: SOUNDS_LABEL })

  await waitFor(() =>
    expect(
      Object.keys(lineSwitch).some((key) => key.startsWith('__reactFiber')),
    ).toBe(true),
  )
  await expect(heardWhileHydrating).toEqual([])
  await expect(lineSwitch).toHaveAttribute('aria-checked', String(line))
  await expect(receiverIdSwitch).toHaveAttribute(
    'aria-checked',
    String(receiverId),
  )
  await expect(hybridcastSwitch).toHaveAttribute(
    'aria-checked',
    String(hybridcast),
  )
  await expect(soundsSwitch).toHaveAttribute('aria-checked', String(sounds))

  return { lineSwitch, receiverIdSwitch, hybridcastSwitch }
}

export const サーバの絵から組み上がる: Story = {
  args: {},
  render: () => <FromTheServer />,
  beforeEach: storedBeforeTheServerDraws({
    [DATA_BROADCAST_LINE]: 'allows',
    [DATA_BROADCAST_RECEIVER_ID]: 'hands',
    [DATA_BROADCAST_HYBRIDCAST]: 'allows',
  }),
  play: async ({ canvasElement }) => {
    const { receiverIdSwitch, hybridcastSwitch } = await hydratedWith(
      canvasElement,
      true,
      true,
      true,
      true,
    )

    await expect(receiverIdSwitch).toBeEnabled()
    await expect(hybridcastSwitch).toBeEnabled()
  },
}

export const サーバの絵から組み上がる_通信が切: Story = {
  args: {},
  render: () => <FromTheServer />,
  beforeEach: storedBeforeTheServerDraws({
    [DATA_BROADCAST_LINE]: 'refuses',
    [DATA_BROADCAST_RECEIVER_ID]: 'hands',
    [DATA_BROADCAST_HYBRIDCAST]: 'allows',
    [DATA_BROADCAST_SOUNDS]: 'silent',
  }),
  play: async ({ canvasElement }) => {
    const { receiverIdSwitch, hybridcastSwitch } = await hydratedWith(
      canvasElement,
      false,
      false,
      false,
      false,
    )

    await expect(receiverIdSwitch).toBeDisabled()
    await expect(hybridcastSwitch).toBeDisabled()
  },
}

const REGISTERED: Residence = { postalCode: '0000000', prefecture: 13 }

function residenceRows(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  const panel = canvasElement.querySelector<HTMLElement>(
    '[data-slot="residence"]',
  )

  if (!panel) {
    throw new Error('the residence is not on the page')
  }

  return { canvas, panel: within(panel) }
}

export const 設置場所_未登録: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const { canvas, panel } = residenceRows(canvasElement)

    await expect(
      canvas.getByRole('heading', { name: RESIDENCE_HEADING }),
    ).toBeVisible()
    await expect(panel.getByText(POSTAL_CODE_LABEL)).toBeVisible()
    await expect(panel.getByText(PREFECTURE_LABEL)).toBeVisible()
    await expect(panel.getAllByText(NOT_REGISTERED)).toHaveLength(2)
    await expect(panel.getByRole('button', { name: '変更' })).toBeVisible()
  },
}

export const 設置場所_登録済み: Story = {
  args: { residence: { state: 'ok', value: REGISTERED } },
  play: async ({ canvasElement }) => {
    const { panel } = residenceRows(canvasElement)

    await expect(panel.getByText('000-0000')).toBeVisible()
    await expect(panel.getByText('東京都(島部を除く)')).toBeVisible()
  },
}

/** The page as the app holds it: what was saved is what the page draws next, as the page is drawn again from Carina after a save. */
function Saving(props: ComponentProps<typeof ViewingView>) {
  const [residence, setResidence] = useState(props.residence)

  return (
    <ViewingView
      {...props}
      residence={residence}
      onSettleResidence={async (next) => {
        const result = await props.onSettleResidence(next)

        if (result.state === 'ok') {
          setResidence({ state: 'ok', value: next })
        }

        return result
      }}
    />
  )
}

export const 設置場所を登録する: Story = {
  args: {},
  render: (args) => <Saving {...args} />,
  play: async ({ args, canvasElement }) => {
    const { panel } = residenceRows(canvasElement)

    await userEvent.click(panel.getByRole('button', { name: '変更' }))

    const postalCode = panel.getByRole('textbox', { name: POSTAL_CODE_LABEL })

    await expect(postalCode).toHaveFocus()
    await expect(postalCode).toHaveValue('')
    await userEvent.type(postalCode, '０００－００００')
    await userEvent.click(
      panel.getByRole('combobox', { name: PREFECTURE_LABEL }),
    )
    await userEvent.click(
      await within(document.body).findByRole('option', {
        name: '東京都島部(伊豆・小笠原諸島)',
      }),
    )
    await afterTheArrival(document.body)
    await userEvent.click(panel.getByRole('button', { name: '保存する' }))

    await expect(args.onSettleResidence).toHaveBeenCalledWith({
      postalCode: '0000000',
      prefecture: 48,
    })
    await waitFor(() => expect(panel.getByText('000-0000')).toBeVisible())
    await expect(panel.getByText('東京都島部(伊豆・小笠原諸島)')).toBeVisible()
    await expect(panel.getByRole('button', { name: '変更' })).toHaveFocus()
  },
}

export const 設置場所の登録を消す: Story = {
  args: { residence: { state: 'ok', value: REGISTERED } },
  render: (args) => <Saving {...args} />,
  play: async ({ args, canvasElement }) => {
    const { panel } = residenceRows(canvasElement)

    await userEvent.click(panel.getByRole('button', { name: '変更' }))

    const postalCode = panel.getByRole('textbox', { name: POSTAL_CODE_LABEL })

    await expect(postalCode).toHaveValue('000-0000')
    await userEvent.clear(postalCode)
    await userEvent.click(
      panel.getByRole('combobox', { name: PREFECTURE_LABEL }),
    )
    await userEvent.click(
      await within(document.body).findByRole('option', {
        name: NOT_REGISTERED,
      }),
    )
    await afterTheArrival(document.body)
    await userEvent.click(panel.getByRole('button', { name: '保存する' }))

    await expect(args.onSettleResidence).toHaveBeenCalledWith(NO_RESIDENCE)
    await waitFor(() =>
      expect(panel.getAllByText(NOT_REGISTERED)).toHaveLength(2),
    )
  },
}

export const 設置場所_郵便番号の誤り: Story = {
  args: {},
  play: async ({ args, canvasElement }) => {
    const { panel } = residenceRows(canvasElement)

    await userEvent.click(panel.getByRole('button', { name: '変更' }))

    const postalCode = panel.getByRole('textbox', { name: POSTAL_CODE_LABEL })

    await userEvent.type(postalCode, '000-000')
    await userEvent.click(panel.getByRole('button', { name: '保存する' }))

    await expect(panel.getByText(POSTAL_CODE_PROBLEM)).toBeVisible()
    await expect(postalCode).toHaveAttribute('aria-invalid', 'true')
    await expect(args.onSettleResidence).not.toHaveBeenCalled()

    await userEvent.click(panel.getByRole('button', { name: 'キャンセル' }))

    await expect(panel.getAllByText(NOT_REGISTERED)).toHaveLength(2)
  },
}

export const 設置場所_保存できない: Story = {
  args: {
    onSettleResidence: fn(async (): Promise<ResidenceWrite> => ({
      state: 'notSaved',
    })),
  },
  play: async ({ canvasElement }) => {
    const { panel } = residenceRows(canvasElement)

    await userEvent.click(panel.getByRole('button', { name: '変更' }))
    await userEvent.type(
      panel.getByRole('textbox', { name: POSTAL_CODE_LABEL }),
      '0000000',
    )
    await userEvent.click(panel.getByRole('button', { name: '保存する' }))

    await expect(
      await panel.findByText(
        '保存できませんでした。時間をおいてからもう一度お試しください。',
      ),
    ).toBeVisible()
    await expect(
      panel.getByRole('textbox', { name: POSTAL_CODE_LABEL }),
    ).toHaveValue('0000000')
  },
}

export const 設置場所_読めない: Story = {
  args: { residence: { state: 'unavailable' } },
  play: async ({ canvasElement }) => {
    const { canvas, panel } = residenceRows(canvasElement)

    await expect(
      canvas.getByRole('heading', { name: RESIDENCE_HEADING }),
    ).toBeVisible()
    await expect(panel.getByText('状態不明')).toBeVisible()
    await expect(panel.queryByRole('button', { name: '変更' })).toBeNull()
  },
}
