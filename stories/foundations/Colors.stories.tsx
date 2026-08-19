import type { Meta, StoryObj } from '@storybook/nextjs'

import { SectionHeading } from '@/components/vela/section-heading'
import { TintPanel, TintMetric, type TintName } from '@/components/vela/surface'
import { StatusText } from '@/components/vela/status'
import { Badge } from '@/components/ui/badge'
import {
  MarkCup,
  MarkDoubleCircle,
  MarkStar,
  MarkType,
} from '@/components/vela/icons'

const meta = {
  title: 'Foundations/Colors',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function Swatch({
  swatch,
  name,
  light,
  dark,
}: {
  swatch: string
  name: string
  light: string
  dark: string
}) {
  return (
    <div className="text-center">
      <div
        className={`h-[38px] rounded-md border border-line ${swatch}`}
        aria-hidden="true"
      />
      <b className="mt-1 block text-micro font-medium">{name}</b>
      <span className="block font-code text-[9px] text-ink-3">{light}</span>
      <span className="block font-code text-[9px] text-ink-3">{dark}</span>
    </div>
  )
}

function SwatchRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(88px,1fr))] gap-[7px]">
      {children}
    </div>
  )
}

const TINTS: { tint: TintName; label: string; value: string; unit: string }[] =
  [
    { tint: 'lavender', label: 'チューナー', value: '3 / 4', unit: '稼働中' },
    { tint: 'salmon', label: '今日の予約', value: '6', unit: '件' },
    { tint: 'butter', label: '録画', value: '248', unit: '本' },
    { tint: 'sage', label: 'ドロップ率', value: '0.004', unit: '%' },
    { tint: 'sky', label: 'EPG 鮮度', value: '7.5', unit: '日先まで' },
    { tint: 'blush', label: '保存領域', value: '6.4', unit: 'TB 使用' },
  ]

export const Palette: Story = {
  render: () => (
    <div className="mx-auto max-w-[880px] p-6">
      <section className="mb-7">
        <SectionHeading mark={MarkStar}>サーフェス</SectionHeading>
        <SwatchRow>
          <Swatch swatch="bg-bg" name="地" light="F7F4ED" dark="141317" />
          <Swatch swatch="bg-surface" name="面" light="FFFDF8" dark="1C1B1F" />
          <Swatch
            swatch="bg-surface-2"
            name="面2"
            light="F1ECE2"
            dark="252428"
          />
          <Swatch
            swatch="bg-surface-3"
            name="面3"
            light="E7E0D3"
            dark="302E34"
          />
          <Swatch swatch="bg-line" name="線" light="E7E0D4" dark="39383C" />
          <Swatch
            swatch="bg-line-strong"
            name="線強"
            light="CEC4B3"
            dark="57565B"
          />
          <Swatch
            swatch="bg-edge"
            name="輪郭(押)"
            light="6E6780"
            dark="908C99"
          />
        </SwatchRow>
        <p className="mt-[9px] text-note text-ink-3">
          温かみのある生成り色を地に、純白・無彩色のグレーには逃げない。ダークは黒では
          なく炭で、影は背景より暗い単色を落として光らせない。
        </p>
      </section>

      <section className="mb-7">
        <SectionHeading mark={MarkType}>墨と主役</SectionHeading>
        <SwatchRow>
          <Swatch swatch="bg-ink" name="墨" light="2E2A38" dark="ECEAF0" />
          <Swatch swatch="bg-ink-2" name="墨2" light="514B60" dark="A8A4B0" />
          <Swatch swatch="bg-ink-3" name="墨3" light="6E6780" dark="908C99" />
          <Swatch swatch="bg-brand" name="主役" light="3F6461" dark="96BBB4" />
          <Swatch
            swatch="bg-brand-soft"
            name="淡"
            light="E4EEEB"
            dark="23312E"
          />
          <Swatch
            swatch="bg-btn-fill"
            name="塗り"
            light="3F6461"
            dark="96BBB4"
          />
        </SwatchRow>
        <p className="mt-[9px] text-note text-ink-3">
          濃い色は文字・点・押せるものだけに使う。塗りボタンは `--accent`
          ではなく `--btn-fill` / `--on-btn`
          を使い、ライトは濃い青緑の塗り、ダークは淡い青緑の
          塗り+濃い文字に切り替える。
        </p>
      </section>

      <section className="mb-7">
        <SectionHeading mark={MarkDoubleCircle}>セマンティクス</SectionHeading>
        <SwatchRow>
          <Swatch swatch="bg-mint" name="正常" light="24795A" dark="86D2AC" />
          <Swatch swatch="bg-lemon" name="注意" light="906517" dark="E5BA6C" />
          <Swatch swatch="bg-coral" name="異常" light="AB4E47" dark="EC9A93" />
          <Swatch swatch="bg-sky" name="情報" light="356FA5" dark="8FC0EA" />
        </SwatchRow>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusText tone="ok">正常</StatusText>
          <StatusText tone="warn">要確認</StatusText>
          <StatusText tone="err">受信不可</StatusText>
          <StatusText tone="off">停止</StatusText>
          <Badge variant="ok">受信可</Badge>
          <Badge variant="warn">drain 中</Badge>
          <Badge variant="err">受信不可</Badge>
          <Badge variant="info">予約済み</Badge>
        </div>
      </section>

      <section>
        <SectionHeading mark={MarkCup}>パステルの面(tint)</SectionHeading>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[9px]">
          {TINTS.map((item) => (
            <TintPanel key={item.tint} tint={item.tint}>
              <TintMetric
                label={item.label}
                value={item.value}
                unit={item.unit}
              />
            </TintPanel>
          ))}
        </div>
        <p className="mt-[9px] text-note text-ink-3">
          区画は線ではなく淡い色面で分ける。彩度は上げず、文字は墨のまま。押せない面に
          は影も線も付けない。同じ画面で使う tint は3〜4色まで。
        </p>
      </section>
    </div>
  ),
}
