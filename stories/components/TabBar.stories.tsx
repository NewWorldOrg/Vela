import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'

import { AppTabBar } from '@/app/(app)/_shell/tab-bar'
import { AppTopBar } from '@/app/(app)/_shell/top-bar'
import { AppFrame, ScreenMain, TabBadge } from '@/components/vela/app-shell'
import { PageHeading } from '@/components/vela/section-heading'
import { TintPanel } from '@/components/vela/surface'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const PHONE = { width: 390, height: 844 }
const HOME_BAR = 34

const meta = {
  title: 'Components/TabBar',
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/recordings/1266' },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function Shell({
  homeBar = 0,
  conflicts,
}: {
  homeBar?: number
  conflicts?: number
}) {
  return (
    <div style={{ '--safe-bottom': `${homeBar}px` } as React.CSSProperties}>
      <AppFrame>
        <AppTopBar />
        <ScreenMain className="px-[calc(18rem/16)] pt-4">
          <PageHeading>ライブラリ</PageHeading>
          <TintPanel
            tint="lavender"
            className="mt-3.5 flex h-[1400px] items-end justify-center pb-4 text-body text-ink-2"
          >
            <span data-testid="the-last-line">いちばん下の行</span>
          </TintPanel>
        </ScreenMain>
        <AppTabBar
          conflicts={
            conflicts ? (
              <TabBadge count={conflicts} saying={`競合 ${conflicts} 件`} />
            ) : undefined
          }
        />
      </AppFrame>
    </div>
  )
}

function tabBarOf(canvasElement: HTMLElement): HTMLElement {
  const found = canvasElement.querySelector('[data-slot="tab-bar"]')

  if (!(found instanceof HTMLElement)) {
    throw new Error('the tab bar is not on the page')
  }

  return found
}

async function showsTheTabs(canvasElement: HTMLElement): Promise<void> {
  const bar = tabBarOf(canvasElement)

  await expect(bar).toBeVisible()
  await expect(
    within(canvasElement).queryByRole('link', { name: 'ライブ' }),
  ).not.toBeNull()

  const inTheTopBar = canvasElement.querySelector('[data-slot="global-nav"]')
  await expect(inTheTopBar).not.toBeVisible()
}

async function showsTheTopBar(canvasElement: HTMLElement): Promise<void> {
  await expect(tabBarOf(canvasElement)).not.toBeVisible()
  await expect(
    canvasElement.querySelector('[data-slot="global-nav"]'),
  ).toBeVisible()
  await expect(
    canvasElement.querySelector('[data-slot="settings-link"]'),
  ).toBeVisible()
}

export const OnAPhone: Story = {
  render: () => <Shell />,
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => {
    await showsTheTabs(canvasElement)

    const bar = tabBarOf(canvasElement)
    const links = within(bar).getAllByRole('link')

    await expect(links.map((link) => link.textContent)).toEqual([
      '番組表',
      'ライブ',
      'ライブラリ',
      '予約',
      '設定',
    ])
    await expect(
      within(bar).getByRole('link', { current: 'page' }),
    ).toHaveTextContent('ライブラリ')

    for (const link of links) {
      const box = link.getBoundingClientRect()
      await expect(box.width).toBeGreaterThanOrEqual(44)
      await expect(box.height).toBeGreaterThanOrEqual(44)
    }

    await expect(bar.getBoundingClientRect().bottom).toBe(window.innerHeight)
  },
}

export const OnAPhoneWithAHomeBar: Story = {
  render: () => <Shell homeBar={HOME_BAR} />,
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => {
    const bar = tabBarOf(canvasElement)

    for (const link of within(bar).getAllByRole('link')) {
      await expect(link.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        window.innerHeight - HOME_BAR,
      )
    }

    const frame = canvasElement.querySelector('[data-slot="app-frame"]')
    await expect(parseFloat(getComputedStyle(frame!).paddingBottom)).toBe(
      bar.getBoundingClientRect().height,
    )

    window.scrollTo(0, document.documentElement.scrollHeight)

    const last = within(canvasElement).getByTestId('the-last-line')
    await expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      bar.getBoundingClientRect().top,
    )
    window.scrollTo(0, 0)
  },
}

export const JustBelowSixHundred: Story = {
  render: () => <Shell />,
  parameters: { screen: { width: 599, height: 900 } },
  play: async ({ canvasElement }) => {
    await showsTheTabs(canvasElement)
  },
}

export const AtSixHundred: Story = {
  render: () => <Shell />,
  parameters: { screen: { width: 600, height: 900 } },
  play: async ({ canvasElement }) => {
    await showsTheTopBar(canvasElement)
  },
}

export const OnAWideWindow: Story = {
  render: () => <Shell />,
  parameters: { screen: { width: 1280, height: 800 } },
  play: async ({ canvasElement }) => {
    await showsTheTopBar(canvasElement)
    await expect(
      within(canvasElement).getByRole('link', { current: 'page' }),
    ).toHaveTextContent('ライブラリ')
  },
}

export const InTheSettingsOnAPhone: Story = {
  render: () => <Shell />,
  parameters: {
    screen: PHONE,
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/settings/tuners' },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(tabBarOf(canvasElement)).getByRole('link', { current: 'page' }),
    ).toHaveTextContent('設定')
    await expect(
      canvasElement.querySelector('[data-slot="phone-bar-title"]'),
    ).toHaveTextContent('チューナー')
    await expect(
      within(canvasElement).getByRole('link', { name: '設定へ' }),
    ).toHaveAttribute('href', '/settings')
  },
}

export const TheBarSaysTheScreenOnAPhone: Story = {
  render: () => <Shell />,
  parameters: {
    screen: PHONE,
    nextjs: { appDirectory: true, navigation: { pathname: '/library' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const title = canvasElement.querySelector('[data-slot="phone-bar-title"]')

    await expect(title).toHaveTextContent('ライブラリ')
    await expect(parseFloat(getComputedStyle(title!).fontSize)).toBe(22)
    await expect(
      canvasElement.querySelector('[data-slot="brand"]'),
    ).not.toBeVisible()
    await expect(
      canvasElement.querySelector('[data-slot="phone-bar-back"]'),
    ).toBeNull()

    const theme = canvas.getByRole('button', { name: 'テーマ' })
    const box = theme.getBoundingClientRect()

    await expect(box.width).toBeGreaterThanOrEqual(40)
    await expect(box.right).toBeLessThanOrEqual(window.innerWidth - 12)
  },
}

export const TheOpenTabPressedAgainGoesToTheTop: Story = {
  render: () => <Shell />,
  parameters: {
    screen: PHONE,
    nextjs: { appDirectory: true, navigation: { pathname: '/library' } },
  },
  play: async ({ canvasElement }) => {
    window.scrollTo(0, 600)
    await expect(window.scrollY).toBeGreaterThan(0)

    await userEvent.click(
      within(tabBarOf(canvasElement)).getByRole('link', { name: 'ライブラリ' }),
    )

    await expect(window.scrollY).toBe(0)
  },
}

export const TheReservationsTabCountsTheConflicts: Story = {
  render: () => <Shell conflicts={2} />,
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => {
    const bar = within(tabBarOf(canvasElement))
    const reservations = bar.getByRole('link', { name: /予約/ })
    const badge = reservations.querySelector('[data-slot="tab-badge"]')

    await expect(reservations).toHaveAccessibleName('予約 競合 2 件')
    await expect(badge).toBeVisible()

    const icon = reservations.querySelector('svg')!.getBoundingClientRect()
    const mark = badge!.getBoundingClientRect()

    await expect(mark.left).toBeGreaterThan(icon.left)
    await expect(mark.bottom).toBeLessThanOrEqual(
      reservations.getBoundingClientRect().top + icon.height + 10,
    )
  },
}

export const GoneWhileThePlayerFillsTheWindow: Story = {
  render: () => (
    <>
      <Shell />
      <div
        data-fill="true"
        className="fixed inset-0 z-[60] bg-[#0f0e12]"
        aria-hidden="true"
      />
    </>
  ),
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => {
    await expect(getComputedStyle(tabBarOf(canvasElement)).display).toBe('none')
  },
}

function Fields() {
  return (
    <div className="grid gap-3 p-4">
      <Input aria-label="番組名" defaultValue="忍たま乱太郎" />
      <Textarea aria-label="メモ" defaultValue="毎日 18:50" />
      <label className="text-sub">
        並び
        <select className="ml-2 h-11 text-sub" defaultValue="new">
          <option value="new">新しい順</option>
          <option value="old">古い順</option>
        </select>
      </label>
    </div>
  )
}

async function fieldSizes(canvasElement: HTMLElement): Promise<number[]> {
  return [...canvasElement.querySelectorAll('input, textarea, select')].map(
    (field) => parseFloat(getComputedStyle(field).fontSize),
  )
}

export const FieldsOnAPhone: Story = {
  render: () => <Fields />,
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => {
    for (const size of await fieldSizes(canvasElement)) {
      await expect(size).toBeGreaterThanOrEqual(16)
    }
  },
}

export const FieldsOnAPhoneHeldSideways: Story = {
  render: () => <Fields />,
  parameters: { screen: { width: 844, height: 390 }, coarse: true },
  play: async ({ canvasElement }) => {
    for (const size of await fieldSizes(canvasElement)) {
      await expect(size).toBeGreaterThanOrEqual(16)
    }
  },
}

export const FieldsOnAWideWindow: Story = {
  render: () => <Fields />,
  parameters: { screen: { width: 1280, height: 800 } },
  play: async ({ canvasElement }) => {
    for (const size of await fieldSizes(canvasElement)) {
      await expect(size).toBeLessThan(16)
    }
  },
}

function Steps() {
  return (
    <div className="grid gap-1 p-4 text-ink">
      <p data-step="body" className="text-body">
        本文
      </p>
      <p data-step="micro" className="text-micro">
        札
      </p>
    </div>
  )
}

function stepSize(canvasElement: HTMLElement, step: string): number {
  const found = canvasElement.querySelector(`[data-step="${step}"]`)

  if (!(found instanceof HTMLElement)) {
    throw new Error(`${step} is not drawn`)
  }

  return parseFloat(getComputedStyle(found).fontSize)
}

export const TextOnAPhone: Story = {
  render: () => <Steps />,
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => {
    await expect(stepSize(canvasElement, 'body')).toBe(14)
    await expect(stepSize(canvasElement, 'micro')).toBe(11)
  },
}

export const TextOnAWideWindow: Story = {
  render: () => <Steps />,
  parameters: { screen: { width: 1280, height: 800 } },
  play: async ({ canvasElement }) => {
    await expect(stepSize(canvasElement, 'body')).toBe(13.5)
    await expect(stepSize(canvasElement, 'micro')).toBe(10.5)
  },
}

const SIDEWAYS = { width: 844, height: 390 }

export const OnAPhoneHeldSideways: Story = {
  render: () => <Shell />,
  parameters: {
    screen: SIDEWAYS,
    coarse: true,
    nextjs: { appDirectory: true, navigation: { pathname: '/library' } },
  },
  play: async ({ canvasElement }) => {
    const rail = tabBarOf(canvasElement)
    const box = rail.getBoundingClientRect()

    await expect(rail).toBeVisible()
    await expect(box.left).toBe(0)
    await expect(box.top).toBe(0)
    await expect(box.height).toBe(window.innerHeight)
    await expect(box.width).toBeLessThan(100)

    const links = within(rail).getAllByRole('link')

    await expect(links.map((link) => link.textContent)).toEqual([
      '番組表',
      'ライブ',
      'ライブラリ',
      '予約',
      '設定',
    ])

    for (const link of links) {
      await expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(
        44,
      )
    }

    await expect(
      canvasElement.querySelector('[data-slot="global-nav"]'),
    ).not.toBeVisible()
    await expect(
      canvasElement.querySelector('[data-slot="phone-bar-title"]'),
    ).toHaveTextContent('ライブラリ')

    const bar = canvasElement
      .querySelector('[data-slot="top-bar"]')!
      .getBoundingClientRect()

    await expect(bar.left).toBeGreaterThanOrEqual(box.right - 1)
  },
}
