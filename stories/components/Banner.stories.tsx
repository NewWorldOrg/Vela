import type { Meta, StoryObj } from '@storybook/nextjs'

import { Banner, InlineAlert } from '@/components/vela/banner'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { MarkPanel, MarkSlashes } from '@/components/vela/icons'

const meta = {
  title: 'Components/Banner',
  component: Banner,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    tone: { control: 'inline-radio', options: ['info', 'warn', 'danger'] },
  },
} satisfies Meta<typeof Banner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    tone: 'info',
    children: 'チャンネルスキャンを実行中です',
  },
  render: (args) => (
    <div className="mx-auto max-w-[620px] p-6">
      <Banner {...args} />
    </div>
  ),
}

export const Tones: Story = {
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={MarkPanel}>ページ上部バナー</SectionHeading>
      <div className="flex flex-col gap-[9px]">
        <Banner tone="info" progress={68}>
          チャンネルスキャンを実行中です
          <span className="font-code tabular-nums">(34 / 50ch)</span>
        </Banner>
        <Banner
          tone="warn"
          action={
            <a href="#" className="underline-offset-[3px] hover:underline">
              変更内容を確認
            </a>
          }
        >
          保存済み・未反映の変更があります。反映には driver の再起動が必要です。
        </Banner>
        <Banner
          tone="danger"
          action={
            <a href="#" className="underline-offset-[3px] hover:underline">
              切り分けを見る
            </a>
          }
        >
          BS のサービスが 0 件です
          <span className="font-code tabular-nums">(連続 26 時間)</span>。
        </Banner>
      </div>
      <p className="mt-[9px] text-note text-ink-3">
        ページ先頭のバナーは1枚まで。重要でも点滅・グローは使わず、色+アイコンで静的に
        示す。進行中の表示も点滅させず、割合の数値と静的なバーで伝える。
      </p>
    </div>
  ),
}

export const Inline: Story = {
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={MarkSlashes}>インライン小型アラート</SectionHeading>
      <div className="flex flex-col gap-2">
        <InlineAlert tone="warn">
          エンコードプリセットの変更は、次回の録画から適用されます。
        </InlineAlert>
        <InlineAlert tone="danger">
          CNR が計測できません。ケーブルの接続と分配器を確認してください。
        </InlineAlert>
      </div>

      <SectionHeading mark={MarkPanel} className="mt-7">
        適用例
      </SectionHeading>
      <Surface>
        <h3 className="heading mb-0.5 text-ui">適用例</h3>
        <p className="mb-[11px] text-sub text-ink-2">
          インライン型は対象フィールドの直下に置き、ページ全体のバナーとは併用しない。
        </p>
        <div className="flex items-center justify-between gap-3 pt-0.5 pb-3">
          <div>
            <Label htmlFor="lnb" className="text-ui font-medium">
              LNB 給電
            </Label>
            <div className="text-note text-ink-3">アンテナへ電源を供給する</div>
          </div>
          <Switch id="lnb" defaultChecked />
        </div>
        <InlineAlert tone="warn">
          給電を停止すると BS/CS 全チューナーの受信が止まります。
        </InlineAlert>
      </Surface>
      <p className="mt-[9px] text-note text-ink-3">
        複数の事象が同時に起きた場合は、重大度が最も高い1件へ集約し、残りは件数で示す。
      </p>
    </div>
  ),
}
