import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, within } from 'storybook/test'

import {
  SYSTEM_CENSUS,
  SYSTEM_STATUS,
  VELA_VERSION,
} from '@/repository/system.fixtures'
import { SystemView } from '@/components/system/system-page'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { inTheSettings } from '@/stories/frames'
import { groundOf } from '@/stories/ground-of'

const meta = {
  title: 'Screens/設定・システム',
  component: SystemView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/settings/system' },
    },
    layout: 'fullscreen',
  },
  args: { velaVersion: VELA_VERSION },
  decorators: [inTheSettings],
} satisfies Meta<typeof SystemView>

export default meta
type Story = StoryObj<typeof meta>

type Tone = 'ok' | 'warn' | 'err' | 'off'

const GROUND: Record<Tone, string> = {
  ok: 'bg-surface',
  warn: 'bg-lemon-soft',
  err: 'bg-coral-soft',
  off: 'bg-surface-2',
}

const PARTS = ['API', 'driver', 'チューナー', '保存先', '番組表', 'ライブ']

function tileNamed(canvasElement: HTMLElement, name: string): HTMLElement {
  const tile = [
    ...canvasElement.querySelectorAll<HTMLElement>('[data-slot="state-tile"]'),
  ].find((one) => one.firstElementChild?.textContent?.trim() === name)

  if (!tile) {
    throw new Error(`no state tile is named ${name}`)
  }

  return tile
}

async function tonesAre(
  canvasElement: HTMLElement,
  heads: Record<string, [Tone, string]>,
): Promise<void> {
  await afterTheArrival(canvasElement)

  const grounds = Object.values(GROUND).map((one) =>
    groundOf(canvasElement, one),
  )

  await expect(new Set(grounds).size).toBe(grounds.length)

  for (const name of PARTS) {
    const [tone, head] = heads[name] ?? ['ok', '']
    const tile = tileNamed(canvasElement, name)

    await expect(getComputedStyle(tile).backgroundColor).toBe(
      groundOf(canvasElement, GROUND[tone]),
    )

    if (head !== '') {
      await expect(tile.children[1]?.textContent).toContain(head)
    }
  }
}

export const 通常: Story = {
  args: { status: SYSTEM_STATUS },
  play: async ({ canvasElement }) => {
    await tonesAre(canvasElement, {
      API: ['ok', '応答あり'],
      driver: ['ok', '接続中'],
    })
  },
}

export const サインインが必要: Story = {
  args: {
    status: {
      ...SYSTEM_CENSUS,
      api: { state: 'ok', status: 'ok', degraded: [] },
      driver: { state: 'unauthenticated' },
    },
  },
  play: async ({ canvasElement }) => {
    await tonesAre(canvasElement, { driver: ['off', '未サインイン'] })
  },
}

export const 機能が足りない: Story = {
  args: {
    status: {
      ...SYSTEM_CENSUS,
      api: { state: 'ok', status: 'ok', degraded: [] },
      driver: {
        state: 'ok',
        status: {
          connection: 'connected',
          hello: {
            protocolVersion: '1',
            instanceId: '4f1c8a926d0b4e779a351cb2e0f74d58',
            draining: false,
          },
          appProtocolVersion: '2',
          missingCapabilities: ['descrambling', 'storage'],
          driverUpdateRequired: true,
          observedAt: '2026-08-14T00:31:12.4821930+09:00',
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    await tonesAre(canvasElement, { driver: ['warn', '接続中'] })

    const driver = tileNamed(canvasElement, 'driver')

    await expect(
      within(driver).getByText('driver の更新が必要です。'),
    ).toBeVisible()
    await expect(driver.querySelectorAll('[data-slot="badge"]')).toHaveLength(2)
  },
}

export const プロバイダに届かない: Story = {
  args: {
    status: {
      ...SYSTEM_CENSUS,
      api: { state: 'ok', status: 'ok', degraded: ['oidc'] },
      driver: SYSTEM_STATUS.driver,
    },
  },
  play: async ({ canvasElement }) => {
    await tonesAre(canvasElement, { API: ['warn', '応答あり'] })
    await expect(
      within(tileNamed(canvasElement, 'API')).getByText('ID プロバイダ'),
    ).toBeVisible()
  },
}

export const 停止準備中: Story = {
  args: {
    status: {
      ...SYSTEM_CENSUS,
      api: { state: 'ok', status: 'ok', degraded: [] },
      driver: {
        state: 'ok',
        status: {
          connection: 'draining',
          hello: {
            protocolVersion: '1',
            instanceId: '4f1c8a926d0b4e779a351cb2e0f74d58',
            draining: true,
          },
          appProtocolVersion: '1',
          missingCapabilities: [],
          driverUpdateRequired: false,
          observedAt: '2026-08-14T00:31:12.4821930+09:00',
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    await tonesAre(canvasElement, { driver: ['warn', '停止準備中'] })
  },
}

export const driver未接続: Story = {
  args: {
    status: {
      ...SYSTEM_CENSUS,
      api: { state: 'ok', status: 'ok', degraded: [] },
      driver: {
        state: 'ok',
        status: {
          connection: 'notConnected',
          hello: null,
          appProtocolVersion: '1',
          missingCapabilities: ['live'],
          driverUpdateRequired: true,
          observedAt: '2026-08-14T00:31:12.4821930+09:00',
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    await tonesAre(canvasElement, { driver: ['err', '未接続'] })
  },
}

export const 保存先が書けない: Story = {
  args: {
    status: {
      ...SYSTEM_STATUS,
      tuners: {
        state: 'ok',
        value: { total: 4, busy: 2, disabled: 1, faulted: 1, drifted: false },
      },
      storage: {
        state: 'ok',
        value: {
          roots: 2,
          freeBytes: 21_000_000_000,
          totalBytes: 3_840_000_000_000,
          unwritable: 1,
          inFlight: 2,
          short: true,
        },
      },
      collection: { state: 'ok', value: { streams: 34, troubled: 3 } },
      live: { state: 'ok', value: { sessions: 2, viewers: 3 } },
    },
  },
  play: async ({ canvasElement }) => {
    await tonesAre(canvasElement, {
      チューナー: ['err', '2 / 4'],
      保存先: ['err', ''],
      番組表: ['warn', '31 / 34'],
    })
  },
}

export const API接続なし: Story = {
  args: {
    status: {
      api: { state: 'unreachable' },
      driver: { state: 'unreachable' },
      carinaVersion: null,
      tuners: { state: 'unavailable' },
      storage: { state: 'unavailable' },
      collection: { state: 'unavailable' },
      live: { state: 'unavailable' },
    },
  },
  play: async ({ canvasElement }) => {
    await tonesAre(canvasElement, {
      API: ['err', '応答なし'],
      driver: ['off', '状態不明'],
      チューナー: ['off', '状態不明'],
      保存先: ['off', '状態不明'],
      番組表: ['off', '状態不明'],
      ライブ: ['off', '状態不明'],
    })
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent(
      'API に接続できません',
    )
  },
}
