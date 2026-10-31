import type { Meta, StoryObj } from '@storybook/nextjs'

import { Badge } from '@/components/ui/badge'

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
    <div>
      <div
        className={`h-12 rounded-md shadow-[inset_0_0_0_1px_var(--hair)] ${swatch}`}
        aria-hidden="true"
      />
      <b className="mt-1.5 block text-note font-semibold">{name}</b>
      <span className="block font-code text-micro text-ink-2">
        {light} / {dark}
      </span>
    </div>
  )
}

function Row({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-8">
      <h2 className="heading mb-3 text-heading">{title}</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(104px,1fr))] gap-3">
        {children}
      </div>
    </section>
  )
}

const GENRES = [
  ['news', 'ニュース'],
  ['info', '情報'],
  ['doc', 'ドキュメンタリー'],
  ['sports', 'スポーツ'],
  ['variety', 'バラエティ'],
  ['movie', '映画'],
  ['drama', 'ドラマ'],
  ['anime', 'アニメ'],
  ['music', '音楽'],
] as const

const GENRE_CLASS: Record<string, [string, string, string]> = {
  news: ['bg-g-news-light', 'bg-g-news-deep', 'bg-g-news-dot'],
  info: ['bg-g-info-light', 'bg-g-info-deep', 'bg-g-info-dot'],
  doc: ['bg-g-doc-light', 'bg-g-doc-deep', 'bg-g-doc-dot'],
  sports: ['bg-g-sports-light', 'bg-g-sports-deep', 'bg-g-sports-dot'],
  variety: ['bg-g-variety-light', 'bg-g-variety-deep', 'bg-g-variety-dot'],
  movie: ['bg-g-movie-light', 'bg-g-movie-deep', 'bg-g-movie-dot'],
  drama: ['bg-g-drama-light', 'bg-g-drama-deep', 'bg-g-drama-dot'],
  anime: ['bg-g-anime-light', 'bg-g-anime-deep', 'bg-g-anime-dot'],
  music: ['bg-g-music-light', 'bg-g-music-deep', 'bg-g-music-dot'],
}

export const Palette: Story = {
  render: () => (
    <div className="mx-auto max-w-[920px] px-10 py-8">
      <Row title="地と面">
        <Swatch swatch="bg-bg" name="地" light="FFFFFF" dark="0E0E10" />
        <Swatch swatch="bg-surface" name="面" light="F4F4F5" dark="1A1A1E" />
        <Swatch
          swatch="bg-surface-2"
          name="面 2"
          light="EAEAEC"
          dark="25252A"
        />
        <Swatch swatch="bg-raised" name="浮き" light="FFFFFF" dark="2A2A30" />
      </Row>
      <Row title="墨">
        <Swatch swatch="bg-ink" name="墨" light="17171A" dark="F4F4F6" />
        <Swatch swatch="bg-ink-2" name="墨 2" light="5E5E66" dark="A9A9B2" />
        <Swatch swatch="bg-ink-3" name="墨 3" light="8E8E97" dark="76767F" />
        <Swatch
          swatch="bg-btn"
          name="主のボタン"
          light="17171A"
          dark="F4F4F6"
        />
      </Row>
      <Row title="差し色">
        <Swatch swatch="bg-accent" name="朱" light="F2483A" dark="FF6153" />
        <Swatch
          swatch="bg-accent-soft"
          name="朱の淡"
          light="F2483A 12%"
          dark="FF6153 16%"
        />
        <Swatch
          swatch="bg-acc-text"
          name="朱の字"
          light="B8291F"
          dark="FF7468"
        />
      </Row>
      <section className="mb-8">
        <h2 className="heading mb-3 text-heading">ジャンル</h2>
        <div className="grid grid-cols-[8rem_repeat(3,1fr)] items-center gap-x-3 gap-y-2 text-note">
          <span />
          <span className="font-semibold text-ink-2">放送済み</span>
          <span className="font-semibold text-ink-2">これから</span>
          <span className="font-semibold text-ink-2">点</span>
          {GENRES.map(([key, label]) => {
            const [light, deep, dot] = GENRE_CLASS[key]

            return [
              <span key={`${key}-n`} className="font-semibold">
                {label}
              </span>,
              <span key={`${key}-l`} className={`h-9 rounded-sm ${light}`} />,
              <span key={`${key}-d`} className={`h-9 rounded-sm ${deep}`} />,
              <span
                key={`${key}-o`}
                className={`size-[7px] rounded-full ${dot}`}
              />,
            ]
          })}
        </div>
      </section>
      <section>
        <h2 className="heading mb-3 text-heading">札</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="recording">録画中</Badge>
          <Badge variant="warn">頭 30 分が欠ける</Badge>
          <Badge variant="mute">エンコード中</Badge>
          <Badge variant="ok">字幕あり</Badge>
          <Badge variant="selected">アニメ</Badge>
        </div>
      </section>
    </div>
  ),
}
