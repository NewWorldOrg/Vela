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

export const AsChildNav: Story = {
  render: () => (
    <div className="p-6">
      <AppShell>
        <TopBar>
          <Brand />
          <GlobalNav>
            <GlobalNavItem asChild active>
              <a href="#">番組表</a>
            </GlobalNavItem>
            <GlobalNavItem asChild>
              <a href="#">ライブ</a>
            </GlobalNavItem>
          </GlobalNav>
          <div className="flex items-center gap-[7px]">
            <SettingsLink asChild>
              <a href="#">設定</a>
            </SettingsLink>
          </div>
        </TopBar>
        <AdminBody>
          <AdminSideNav caption="管理">
            <AdminSideNavItem
              asChild
              label="チューナー"
              icon={<TunerIcon />}
              active
            >
              <a href="#" />
            </AdminSideNavItem>
            <AdminSideNavItem asChild label="チャンネル" icon={<ChannelIcon />}>
              <a href="#" />
            </AdminSideNavItem>
          </AdminSideNav>
          <AdminMain>
            <Crumb>
              設定 / <CrumbCurrent>チューナー</CrumbCurrent>
            </Crumb>
          </AdminMain>
        </AdminBody>
      </AppShell>
      <p className="mt-[9px] text-note text-ink-3">
        アプリ本体はこの形でルーティングのリンクを差し込む。
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
            <AdminSideNavItem href="#" icon={<SystemIcon />} label="システム" />
            <AdminSideNavItem
              href="#"
              icon={<TunerIcon />}
              label="チューナー"
              active
            />
            <AdminSideNavItem
              href="#"
              icon={<ChannelIcon />}
              label="チャンネル"
            />
            <AdminSideNavItem
              href="#"
              icon={<EncodeIcon />}
              label="エンコード"
            />
            <AdminSideNavItem href="#" icon={<QualityIcon />} label="品質" />
          </AdminSideNav>
          <AdminMain>
            <Crumb>
              設定 / <CrumbCurrent>チューナー</CrumbCurrent>
            </Crumb>
            <PageHeading
              description="接続されたチューナーデバイスの一覧と稼働状態"
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

function AdminFrame() {
  return (
    <div className="dot-grid flex h-dvh flex-col overflow-hidden bg-bg">
      <ServiceTopBar settingsActive />
      <AdminBody className="min-h-0 flex-1">
        <AdminSideNav caption="管理" aria-label="管理メニュー">
          <AdminSideNavItem href="#" icon={<SystemIcon />} label="システム" />
          <AdminSideNavItem
            href="#"
            icon={<TunerIcon />}
            label="チューナー"
            active
          />
          <AdminSideNavItem
            href="#"
            icon={<ChannelIcon />}
            label="チャンネル"
          />
          <AdminSideNavItem href="#" icon={<EncodeIcon />} label="エンコード" />
          <AdminSideNavItem href="#" icon={<QualityIcon />} label="品質" />
        </AdminSideNav>
        <AdminMain>
          <Crumb>
            設定 / <CrumbCurrent>チューナー</CrumbCurrent>
          </Crumb>
          <PageHeading description="トップバーとサイドナビは画面に残り、スクロールするのはこの面だけ">
            チューナー
          </PageHeading>
          <TintPanel
            tint="lavender"
            className="mt-3.5 flex h-[1600px] items-start justify-center pt-7 text-sub text-ink-2"
          >
            背の高いコンテンツ
          </TintPanel>
        </AdminMain>
      </AdminBody>
    </div>
  )
}

export const Frame: Story = {
  render: () => <AdminFrame />,
}

/**
 * The same frame at the width an iPad is held at, where the side nav drops its
 * labels. A row is 7px shorter without them, so the gap that keeps one row's
 * 44px area out of the next one's is a different number, and only a story at
 * this width ever meets that shape.
 */
export const IconOnlyFrame: Story = {
  render: () => <AdminFrame />,
  parameters: { screen: { width: 768, height: 1024 } },
}
