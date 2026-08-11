'use client'

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { DatePager } from '@/components/vela/date-pager'
import { IconButton } from '@/components/vela/icon-button'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import {
  CloseIcon,
  MarkPill,
  MarkSplit,
  PlusIcon,
  SearchIcon,
  MarkPanel,
} from '@/components/vela/icons'

const meta = {
  title: 'Components/Navigation',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const UnderlineTabs: Story = {
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={MarkSplit}>下線タブ(種別切替)</SectionHeading>
      <Surface>
        <Tabs defaultValue="gr">
          <TabsList>
            <TabsTrigger value="gr">地上</TabsTrigger>
            <TabsTrigger value="bs">BS</TabsTrigger>
            <TabsTrigger value="cs">CS110</TabsTrigger>
            <TabsTrigger value="none" disabled>
              未取得
            </TabsTrigger>
          </TabsList>
          <TabsContent value="gr" className="pt-[11px] text-sub text-ink-3">
            地上デジタル 9 チャンネルの番組表を表示中
          </TabsContent>
          <TabsContent value="bs" className="pt-[11px] text-sub text-ink-3">
            BS 22 チャンネルの番組表を表示中
          </TabsContent>
          <TabsContent value="cs" className="pt-[11px] text-sub text-ink-3">
            CS110 の番組表を表示中
          </TabsContent>
          <TabsContent value="none" />
        </Tabs>
      </Surface>
      <p className="mt-[9px] text-note text-ink-3">
        アクティブタブは主役色の下線 2px + 淡い面。非アクティブは ink-2。
      </p>
    </div>
  ),
}

export const Segmented: Story = {
  render: function Render() {
    const [value, setValue] = useState('all')
    return (
      <div className="mx-auto max-w-[620px] p-6">
        <SectionHeading mark={MarkPill}>
          セグメント切替(絞り込み)
        </SectionHeading>
        <Surface>
          <SegmentedControl
            aria-label="チューナー種別で絞り込み"
            value={value}
            onValueChange={setValue}
            options={[
              { value: 'all', label: 'すべて' },
              { value: 'gr', label: 'GR' },
              { value: 'bs', label: 'BS' },
              { value: 'cs', label: 'CS110' },
              { value: 'phys', label: '物理ch指定' },
            ]}
          />
        </Surface>
      </div>
    )
  },
}

export const DatePagerStory: StoryObj<typeof meta> = {
  name: 'Date pager',
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={MarkPanel}>日付ページャ</SectionHeading>
      <Surface>
        <DatePager label="8/7(木)" />
      </Surface>
      <p className="mt-[9px] text-note text-ink-3">
        日付・ch 番号は tabular-nums で桁を揃える。
      </p>
    </div>
  ),
}

export const IconButtons: Story = {
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={MarkPill}>アイコンボタン</SectionHeading>
      <Surface>
        <div className="flex flex-wrap items-center gap-3">
          <IconButton aria-label="検索">
            <SearchIcon />
          </IconButton>
          <IconButton aria-label="予約を追加" size="sm">
            <PlusIcon />
          </IconButton>
          <IconButton aria-label="閉じる" variant="quiet">
            <CloseIcon />
          </IconButton>
          <IconButton aria-label="閉じる" variant="quiet" size="sm">
            <CloseIcon />
          </IconButton>
          <IconButton aria-label="検索" disabled>
            <SearchIcon />
          </IconButton>
        </div>
        <p className="mt-[11px] text-cap text-ink-3">
          pop は押せるものとして浮かせ、quiet
          はバーやパネルの中で触れると少し傾く。
        </p>
      </Surface>
    </div>
  ),
}
