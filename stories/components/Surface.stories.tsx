import type { Meta, StoryObj } from '@storybook/nextjs'

import {
  Surface,
  Tile,
  TileMeta,
  TileTitle,
  TintMetric,
  TintPanel,
} from '@/components/vela/surface'
import { SectionHeading } from '@/components/vela/section-heading'
import { EmptyState } from '@/components/vela/empty-state'
import { Button } from '@/components/ui/button'
import { MarkCup, MarkPanel, MarkStar } from '@/components/vela/icons'

const meta = {
  title: 'Components/Surface',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Surfaces: Story = {
  render: () => (
    <div className="mx-auto max-w-[720px] p-6">
      <SectionHeading mark={MarkPanel}>Surface(枠なしの面)</SectionHeading>
      <Surface>
        <h3 className="heading mb-0.5 text-ui">枠で囲わない情報のまとまり</h3>
        <p className="text-sub text-ink-2">
          ただの情報は面を敷くだけ。線も影も与えない。
        </p>
      </Surface>

      <SectionHeading mark={MarkStar} className="mt-7">
        Tile(押せるタイル)
      </SectionHeading>
      <div className="flex flex-wrap gap-2.5">
        <Tile>
          <TileTitle>チューナー</TileTitle>
          <TileMeta>4 台 / 3 台 稼働</TileMeta>
        </Tile>
        <Tile>
          <TileTitle>今日の予約</TileTitle>
          <TileMeta>6 件</TileMeta>
        </Tile>
        <Tile disabled>
          <TileTitle>エンコード待ち</TileTitle>
          <TileMeta>取得できません</TileMeta>
        </Tile>
      </div>
      <p className="mt-[9px] text-note text-ink-3">
        線と影を持つのは押せるものだけ。ポインタを載せると 1px
        持ち上がり、押すと沈む。
      </p>

      <SectionHeading mark={MarkCup} className="mt-7">
        TintPanel(パステルの面)
      </SectionHeading>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[9px]">
        <TintPanel tint="lavender">
          <TintMetric label="チューナー" value="3 / 4" unit="稼働中" />
        </TintPanel>
        <TintPanel tint="salmon">
          <TintMetric label="今日の予約" value="6" unit="件" />
        </TintPanel>
        <TintPanel tint="butter">
          <TintMetric label="録画" value="248" unit="本" />
        </TintPanel>
      </div>
    </div>
  ),
}

export const EmptyStates: Story = {
  render: () => (
    <div className="mx-auto grid max-w-[720px] gap-3 p-6 sm:grid-cols-2">
      <EmptyState spot="antenna" action={<Button>スキャンを実行</Button>}>
        データがありません
      </EmptyState>
      <EmptyState spot="tuner" action={<Button>チューナーを追加</Button>}>
        チューナーがまだ登録されていません。デバイスを接続すると、自動検出された候補が
        ここに表示されます。
      </EmptyState>
      <EmptyState spot="tape">条件に一致する録画はありません。</EmptyState>
      <EmptyState spot="star">予約はまだありません。</EmptyState>
    </div>
  ),
}
