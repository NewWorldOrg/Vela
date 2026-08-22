'use client'

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'

import {
  DataList,
  DataListExpansion,
  DataListHeader,
  DataListRow,
} from '@/components/vela/data-list'
import { EmptyState } from '@/components/vela/empty-state'
import { SectionHeading } from '@/components/vela/section-heading'
import { TintPanel } from '@/components/vela/surface'
import { ChipDot, StatusText } from '@/components/vela/status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ChevronRightIcon, MarkStar, ListIcon } from '@/components/vela/icons'

const meta = {
  title: 'Components/DataList',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const COLUMNS = '18px 88px 96px minmax(0,1fr) 64px 44px'

const CANDIDATES = [
  ['BS03/TS0', 'みなと BS1', '15.2 dB', true],
  ['BS13/TS0', '東都 BS1', '16.0 dB', true],
  ['BS15/TS0', '湾岸 BS1', '9.8 dB', false],
] as const

export const Rows: Story = {
  render: function Render() {
    const [open, setOpen] = useState(true)

    return (
      <div className="mx-auto max-w-[720px] p-6">
        <SectionHeading mark={ListIcon}>
          データ行・展開行(チューナー一覧)
        </SectionHeading>
        <DataList columns={COLUMNS} minWidth={520}>
          <DataListHeader>
            <span />
            <span>チューナー</span>
            <span>状態</span>
            <span>現在のサービス</span>
            <span className="text-right">CNR</span>
            <span className="text-right">有効</span>
          </DataListHeader>

          <DataListRow>
            <ChevronRightIcon className="size-3.5 text-ink-3" />
            <span className="font-code font-medium tabular-nums">
              PX-Q3U4 #1
            </span>
            <span>
              <Badge variant="recording">
                <ChipDot />
                録画中
              </Badge>
            </span>
            <span className="flex min-w-0 items-center gap-[7px]">
              <span className="truncate">
                <span className="font-code tabular-nums">011</span> みなと総合1
              </span>
              <Badge variant="kindData">地上</Badge>
            </span>
            <span className="text-right font-code tabular-nums text-mint">
              32.4 dB
            </span>
            <span className="justify-self-end">
              <Switch
                size="sm"
                defaultChecked
                aria-label="PX-Q3U4 #1 を有効化"
              />
            </span>
          </DataListRow>

          <DataListRow>
            <button
              type="button"
              aria-expanded={open}
              aria-controls="tuner-2-candidates"
              onClick={() => setOpen((prev) => !prev)}
              className="tap-target inline-flex size-[18px] items-center justify-center rounded-full text-ink-3 outline-none focus-visible:shadow-ring"
            >
              <ChevronRightIcon
                className={`size-3.5 transition-transform duration-150 ease-toy ${
                  open ? 'rotate-90' : ''
                }`}
              />
              <span className="sr-only">候補チャンネルを開閉</span>
            </button>
            <span className="font-code font-medium tabular-nums">
              PX-Q3U4 #2
            </span>
            <StatusText tone="warn">CNR 低下</StatusText>
            <span className="flex min-w-0 items-center gap-[7px]">
              <span className="truncate">
                <span className="font-code tabular-nums">BS01/TS0</span> 中央
                BS1
              </span>
              <Badge variant="kindData">BS</Badge>
            </span>
            <span className="text-right font-code tabular-nums text-lemon">
              16.8 dB
            </span>
            <span className="justify-self-end">
              <Switch
                size="sm"
                defaultChecked
                aria-label="PX-Q3U4 #2 を有効化"
              />
            </span>
          </DataListRow>

          {open && (
            <DataListExpansion id="tuner-2-candidates">
              <TintPanel tint="accent">
                <div className="mb-0.5 flex flex-wrap items-baseline gap-[11px]">
                  <b className="heading text-ui">候補チャンネル</b>
                  <span className="text-cap text-ink-2">
                    直近のスキャンで受信を確認したサービス
                  </span>
                  <a
                    href="#"
                    className="tap-target ml-auto text-sub font-bold whitespace-nowrap text-brand underline-offset-[3px] hover:underline"
                  >
                    再スキャン
                  </a>
                </div>
                {CANDIDATES.map(([ch, name, db, ok]) => (
                  <div
                    key={ch}
                    className="flex items-center gap-[11px] border-t border-dashed border-line-strong py-[7px] text-sub"
                  >
                    <span className="w-[78px] shrink-0 font-code text-ink-2">
                      {ch}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{name}</span>
                    <span className="w-[58px] text-right font-code tabular-nums text-ink-2">
                      {db}
                    </span>
                    <Badge variant={ok ? 'ok' : 'err'}>
                      {ok ? '受信可' : '受信不可'}
                    </Badge>
                  </div>
                ))}
              </TintPanel>
            </DataListExpansion>
          )}

          <DataListRow muted>
            <ChevronRightIcon className="size-3.5 text-ink-3" />
            <span className="font-code font-medium tabular-nums">
              PX-W3PE5 #1
            </span>
            <StatusText tone="off">無効</StatusText>
            <span className="truncate">—</span>
            <span className="text-right font-code tabular-nums">—</span>
            <span className="justify-self-end">
              <Switch size="sm" aria-label="PX-W3PE5 #1 を有効化" />
            </span>
          </DataListRow>
        </DataList>
        <p className="mt-[9px] text-note text-ink-3">
          外枠で囲わない。ヘッダ行は
          surface-2、行間は破線区切り、行のホバーは面の色 だけ。数値列は
          tabular-nums で右揃え。
        </p>
      </div>
    )
  },
}

export const Empty: Story = {
  render: () => (
    <div className="mx-auto max-w-[720px] p-6">
      <SectionHeading mark={MarkStar}>空状態</SectionHeading>
      <DataList columns={COLUMNS} minWidth={520}>
        <DataListHeader>
          <span />
          <span>チューナー</span>
          <span>状態</span>
          <span>現在のサービス</span>
          <span className="text-right">CNR</span>
          <span className="text-right">有効</span>
        </DataListHeader>
      </DataList>
      <EmptyState
        spot="tuner"
        className="mt-2.5"
        action={<Button>チューナーを追加</Button>}
      >
        チューナーがまだ登録されていません。デバイスを接続すると、自動検出された候補が
        ここに表示されます。
      </EmptyState>
    </div>
  ),
}
