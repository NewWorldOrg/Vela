import type { Meta, StoryObj } from '@storybook/nextjs'

import { PageHeading, SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { Button } from '@/components/ui/button'
import {
  MarkCup,
  MarkDoubleCircle,
  MarkSlashes,
  MarkStar,
  PlusIcon,
} from '@/components/vela/icons'

const meta = {
  title: 'Components/SectionHeading',
  component: SectionHeading,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SectionHeading>

export default meta
type Story = StoryObj<typeof meta>

export const Marks: Story = {
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={MarkStar}>配色</SectionHeading>
      <Surface className="mb-5">
        <p className="text-sub text-ink-2">
          セクション見出しの前に小さなマークを置き、後ろは破線の罫で埋める。
        </p>
      </Surface>
      <SectionHeading mark={MarkDoubleCircle}>触感</SectionHeading>
      <Surface className="mb-5">
        <p className="text-sub text-ink-2">
          同じ形を使い回さず、区画ごとに変える。
        </p>
      </Surface>
      <SectionHeading mark={MarkSlashes}>装飾</SectionHeading>
      <Surface className="mb-5">
        <p className="text-sub text-ink-2">装飾は情報を持つものだけ。</p>
      </Surface>
      <SectionHeading mark={MarkCup}>パステルの面</SectionHeading>
      <Surface>
        <p className="text-sub text-ink-2">区切りは実線一辺倒にしない。</p>
      </Surface>
    </div>
  ),
}

export const Page: Story = {
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <PageHeading
        description="接続されたチューナーデバイスの台帳と稼働状態"
        action={
          <Button size="sm">
            <PlusIcon />
            チューナーを追加
          </Button>
        }
      >
        チューナー
      </PageHeading>
    </div>
  ),
}
