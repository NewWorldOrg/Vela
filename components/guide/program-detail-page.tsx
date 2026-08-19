import Link from 'next/link'

import type {
  ProgramDetail,
  ProgramItem,
  RelatedProgram,
  RelationKind,
} from '@/repository/programs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronLeftIcon,
  InfoIcon,
  ListIcon,
  PersonIcon,
  RecordIcon,
  RelayIcon,
} from '@/components/vela/icons'

const RELATION_WORDING: Record<
  RelationKind,
  { lead: (channel?: string) => string; link: string }
> = {
  relayed: {
    lead: (channel) =>
      channel
        ? `放送は ${channel} で継続されます。`
        : '放送は別のチャンネルで継続されます。',
    link: '継続先を見る',
  },
  moved: {
    lead: (channel) =>
      channel
        ? `放送枠が ${channel} に移動しています。`
        : '放送枠が移動しています。',
    link: '移動先を見る',
  },
  shared: {
    lead: (channel) =>
      channel
        ? `${channel} でも同時に放送されます。`
        : '別のチャンネルでも同時に放送されます。',
    link: '同時放送を見る',
  },
}

export function ProgramDetailView({ detail }: { detail: ProgramDetail }) {
  const { program, channel, day, items, related, durationLabel } = detail

  return (
    <main className="min-h-0 flex-1 overflow-y-auto pb-16">
      <div className="mx-auto max-w-[780px] px-6 pt-[22px] max-[700px]:px-3.5">
        <Button variant="ghost" size="sm" className="mb-3.5" asChild>
          <Link href="/guide">
            <ChevronLeftIcon />
            番組表へ
          </Link>
        </Button>

        <section className="rounded-xl bg-surface px-[30px] pt-[26px] pb-[22px] max-[700px]:px-[18px] max-[700px]:pt-[22px]">
          <div className="mb-[9px] flex items-center gap-2.5">
            {channel?.no && (
              <span className="rounded-md border border-line bg-surface-2 px-2 py-px font-code text-[11px] font-medium text-ink-2">
                {channel.no}
              </span>
            )}
            {channel?.name && (
              <span className="text-ui text-ink-2">{channel.name}</span>
            )}
          </div>
          <h1 className="heading text-[23px] leading-normal">
            {program.title}
          </h1>
          <p className="mt-[9px] font-code text-[13.5px] tabular-nums">
            {program.dateLabel ?? day.label} {program.startLabel} –{' '}
            {program.endUndecided ? '終了未定' : program.endLabel}
            {durationLabel && (
              <span className="ml-[9px] text-sub text-ink-3">
                {durationLabel}
              </span>
            )}
          </p>
          <div className="mt-[13px] flex flex-wrap gap-[7px]">
            <Badge variant="info" className="font-bold">
              {program.genreLabel}
            </Badge>
            {program.subtitled && (
              <Badge variant="ok" className="font-bold">
                字幕あり
              </Badge>
            )}
          </div>

          <div className="mt-5 border-t border-dashed border-line pt-5">
            {program.description && (
              <p className="mb-5 text-[13.5px] leading-[1.95] whitespace-pre-wrap">
                {program.description}
              </p>
            )}
            {related.map((item) => (
              <RelatedNotice key={`${item.kind}-${item.key}`} related={item} />
            ))}
            {items.map((item, index) => (
              <ExtendedSection key={index} item={item} />
            ))}
            <dl className="grid grid-cols-3 gap-5 border-t border-dashed border-line pt-4 max-[700px]:grid-cols-2 max-[480px]:grid-cols-1">
              <div>
                <dt className="text-cap font-bold tracking-[.04em] text-ink-3">
                  字幕
                </dt>
                <dd className="mt-0.5 text-[13.5px] font-medium">
                  {program.subtitled ? 'あり' : 'なし'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-[22px] flex items-center gap-3 border-t border-dashed border-line pt-[17px] max-[700px]:flex-wrap max-[700px]:gap-y-2.5">
            <div className="flex flex-wrap gap-[9px]">
              <Button disabled title="録画予約はこれから実装されます">
                <RecordIcon />
                録画予約
              </Button>
              <Button
                variant="ghost"
                disabled
                title="シリーズ予約はこれから実装されます"
              >
                <ListIcon />
                シリーズで予約
              </Button>
            </div>
            <Button variant="link" size="sm" className="ml-auto" asChild>
              <Link href={`/search?q=${encodeURIComponent(program.title)}`}>
                この番組名で検索
              </Link>
            </Button>
          </div>
          <div className="flex items-start gap-[9px] px-[30px] pt-[11px] text-note leading-[1.75] text-ink-3 max-[700px]:px-0">
            <InfoIcon className="mt-[3px] size-[15px]" />
            <span>
              予約した時点でチューナーを確保します。
              {program.endUndecided &&
                'この番組は終了時刻が延びる可能性があるため、延長に追従して録画します。'}
            </span>
          </div>
        </section>

        <p className="mt-3.5 px-1.5 text-note leading-[1.8] text-ink-3">
          この画面は固有 URL{' '}
          <span className="font-code">/guide/programs/{program.id}</span>{' '}
          で単体で開けます。番組の識別子は(ネットワーク・サービス・イベント)の組で、開始時刻を併記して同一性を判定します。
        </p>
      </div>
    </main>
  )
}

function RelatedNotice({ related }: { related: RelatedProgram }) {
  const wording = RELATION_WORDING[related.kind]

  return (
    <div className="mb-[22px] flex items-start gap-[11px] rounded-lg bg-sky-soft px-4 py-[13px] text-ui leading-[1.75] text-sky max-[700px]:flex-wrap">
      <RelayIcon className="mt-[3px] size-[17px]" />
      <p className="min-w-0 flex-1 font-bold">
        {wording.lead(related.channelLabel)}
      </p>
      <Link
        href={`/guide/programs/${related.key}`}
        className="ml-auto pl-[13px] font-bold whitespace-nowrap underline-offset-[3px] hover:underline max-[700px]:ml-0 max-[700px]:pl-0"
      >
        {wording.link}
      </Link>
    </div>
  )
}

function ExtendedSection({ item }: { item: ProgramItem }) {
  const HeadingIcon = /出演|司会|ゲスト|キャスト/.test(item.heading)
    ? PersonIcon
    : ListIcon

  return (
    <section className="mb-5">
      {item.heading && (
        <h2 className="heading mb-[7px] flex items-center gap-[7px] text-[13px]">
          <HeadingIcon className="size-[15px] text-brand" />
          {item.heading}
          <span className="h-px flex-1 border-t border-dashed border-line" />
        </h2>
      )}
      <p className="text-[13px] leading-[1.95] whitespace-pre-wrap text-ink-2">
        {item.text}
      </p>
    </section>
  )
}
