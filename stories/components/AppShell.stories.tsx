import type { Meta, StoryObj } from '@storybook/nextjs'

import {
  AdminBody,
  AdminMain,
  AdminSideNav,
  AdminSideNavItem,
  AppShell,
  Brand,
  Crumb,
  CrumbCurrent,
  GlobalNav,
  GlobalNavItem,
  SettingsLink,
  TopBar,
} from '@/components/vela/app-shell'
import { PageHeading } from '@/components/vela/section-heading'
import { IconButton } from '@/components/vela/icon-button'
import { TintPanel } from '@/components/vela/surface'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import {
  ChannelIcon,
  EncodeIcon,
  QualityIcon,
  SearchIcon,
  SystemIcon,
  TunerIcon,
} from '@/components/vela/icons'

const meta = {
  title: 'Components/AppShell',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const SERVICE_NAV = ['番組表', 'ライブ', 'ライブラリ', '予約']

function ServiceTopBar({ settingsActive }: { settingsActive?: boolean }) {
  return (
    <TopBar>
      <Brand />
      <GlobalNav>
        {SERVICE_NAV.map((label, index) => (
          <GlobalNavItem
            key={label}
            href="#"
            active={!settingsActive && index === 0}
          >
            {label}
          </GlobalNavItem>
        ))}
      </GlobalNav>
      <div className="flex items-center gap-[7px]">
        <IconButton aria-label="検索" variant="quiet" size="sm">
          <SearchIcon />
        </IconButton>
        <ThemeToggle />
        <SettingsLink href="#" active={settingsActive} />
      </div>
    </TopBar>
  )
}

export const Service: Story = {
  render: () => (
    <div className="p-6">
      <AppShell>
        <ServiceTopBar />
        <p className="px-[18px] py-[26px] text-center text-sub text-ink-3">
          コンテンツ最大化(番組表グリッド等)。ページ見出しは持たない
        </p>
      </AppShell>
      <p className="mt-[9px] text-note text-ink-3">
        毎日使うサービス系(番組表・ライブ・ライブラリ・予約)はトップナビ。
      </p>
    </div>
  ),
}

export const Admin: Story = {
  render: () => (
    <div className="p-6">
      <AppShell>
        <ServiceTopBar settingsActive />
        <AdminBody>
          <AdminSideNav caption="管理" aria-label="管理メニュー">
            <AdminSideNavItem href="#" icon={<SystemIcon />}>
              システム
            </AdminSideNavItem>
            <AdminSideNavItem href="#" icon={<TunerIcon />} active>
              チューナー
            </AdminSideNavItem>
            <AdminSideNavItem href="#" icon={<ChannelIcon />}>
              チャンネル
            </AdminSideNavItem>
            <AdminSideNavItem href="#" icon={<EncodeIcon />}>
              エンコード
            </AdminSideNavItem>
            <AdminSideNavItem href="#" icon={<QualityIcon />}>
              品質
            </AdminSideNavItem>
          </AdminSideNav>
          <AdminMain>
            <Crumb>
              設定 / <CrumbCurrent>チューナー</CrumbCurrent>
            </Crumb>
            <PageHeading
              description="接続されたチューナーデバイスの台帳と稼働状態"
              action={
                <Button size="sm">
                  <SearchIcon />
                  デバイスを検出
                </Button>
              }
            >
              チューナー
            </PageHeading>
            <TintPanel
              tint="lavender"
              className="mt-3.5 flex h-[76px] items-center justify-center text-sub text-ink-2"
            >
              一覧・バナー等のコンテンツ
            </TintPanel>
          </AdminMain>
        </AdminBody>
      </AppShell>
      <p className="mt-[9px] text-note text-ink-3">
        たまに触る管理系は「設定」から入る別エリアで、左サイドナビ+ページ見出しと説明文
        を持つ落ち着いた構成。サービス系との行き来はトップバーで常に可能。
      </p>
    </div>
  ),
}
