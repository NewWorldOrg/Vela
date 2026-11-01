import type { Route } from 'next'
import { EMPTY_VALUE } from '@/lib/empty-value'
import Link from 'next/link'

import type {
  ProposalService,
  RotationDeparture,
  ScanProposal,
  ScanProposalScreenResult,
  WriteResult,
} from '@/repository/services'
import { cn } from '@/lib/utils'
import { shapeFor, wordFor } from '@/lib/not-yet-in-this-build'
import { Badge } from '@/components/ui/badge'
import { READABLE_LINE } from '@/components/ui/table-cards'
import { Button } from '@/components/ui/button'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { ServiceId } from '@/components/channels/service-id'
import { ChannelMark } from '@/components/vela/channel-mark'
import { EmptyState } from '@/components/vela/empty-state'
import { PageHeading } from '@/components/vela/section-heading'
import { ApplyScanAction } from '@/components/scan/apply-scan-button'
import { ScanAttemptsTable } from '@/components/scan/scan-run-panel'
import { FailureLegend } from '@/components/scan/failure-mark'

const CHANNEL_KIND_LABEL = {
  added: '追加',
  updated: '更新',
  missing: '消失',
} as const

const CHANNEL_KIND_VARIANT = {
  added: 'ok',
  updated: 'info',
  missing: 'err',
} as const

function ProposalRows({ services }: { services: ProposalService[] }) {
  return (
    <>
      <div className="rounded-lg bg-surface px-4">
        {services.map((service) => (
          <div
            key={service.key}
            className="flex flex-wrap items-start gap-3 border-b border-hair py-3 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  READABLE_LINE,
                  'flex items-center gap-2 text-[calc(14.5rem/16)] leading-[1.6] font-semibold',
                )}
              >
                <ChannelMark logo={service.logo} no={service.no} keepsTheSlot />
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <span className="min-w-0">{service.name}</span>
                  <ServiceId sid={service.sid} />
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {service.channels.map((channel) => (
                  <span
                    key={`${channel.kind}-${channel.channel}`}
                    className="inline-flex items-center gap-2 pr-2 text-note"
                  >
                    <Badge
                      variant={shapeFor(
                        CHANNEL_KIND_VARIANT,
                        channel.kind,
                        'mute',
                      )}
                    >
                      {wordFor(CHANNEL_KIND_LABEL, channel.kind)}
                    </Badge>
                    <span className="font-code tabular-nums">
                      {channel.channel}
                    </span>
                    {channel.measurement && (
                      <span className="font-code tabular-nums text-ink-2">
                        {channel.measurement.value}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
            <span className="text-ui text-ink-2">{service.category}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function DepartureRows({ departures }: { departures: RotationDeparture[] }) {
  return (
    <>
      <div className="rounded-lg bg-surface px-4">
        {departures.map((departure) => (
          <div
            key={`${departure.key}-${departure.channel}`}
            className="flex flex-wrap items-center gap-3 border-b border-hair py-3 last:border-b-0"
          >
            <span className="font-code text-body font-medium tabular-nums">
              {departure.channel}
            </span>
            <Badge variant="warn" className="font-bold">
              要確認
            </Badge>
            <span className="font-code text-cap tabular-nums text-ink-2">
              連続失敗 {departure.consecutiveFailures} 回 · {departure.since}{' '}
              から
            </span>
            <span className="ml-auto font-code text-cap text-ink-2">
              {departure.key}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

function Summary({ proposal }: { proposal: ScanProposal }) {
  const cells = [
    {
      label: '新規',
      value: proposal.added.length,
      unit: 'サービス',
    },
    {
      label: '更新',
      value: proposal.updated.length,
      unit: 'サービス',
    },
    {
      label: '消失',
      value: proposal.missing.length,
      unit: 'サービス',
    },
    {
      label: '失敗',
      value: proposal.failures.length,
      unit: '物理ch',
      failed: proposal.failures.length > 0,
    },
  ]

  return (
    <div
      data-slot="scan-summary"
      className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-hair min-[1020px]:grid-cols-4"
    >
      {cells.map((cell) => (
        <div key={cell.label} className="bg-surface px-4 py-3">
          <div className="text-note font-medium text-ink-2">{cell.label}</div>
          <div
            className={cn(
              'mt-0.5 text-section font-bold tabular-nums',
              'failed' in cell && cell.failed && 'text-rec-text',
            )}
          >
            {cell.value}
            <small className="ml-1 text-note font-normal text-ink-2">
              {cell.unit}
            </small>
          </div>
        </div>
      ))}
    </div>
  )
}

function GroupHeading({ title, stat }: { title: string; stat: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline gap-2.5 px-0.5">
      <h2 className="heading text-heading">{title}</h2>
      <span className="text-note tabular-nums text-ink-2">{stat}</span>
    </div>
  )
}

export function ScanProposalView({
  result,
  onApply,
}: {
  result: Exclude<ScanProposalScreenResult, { state: 'missing' }>
  onApply: (scanId: string) => Promise<WriteResult>
}) {
  const crumb = (
    <Crumb>
      設定 /{' '}
      <Link className="tap-target" href={'/settings/channels' as Route}>
        チャンネル
      </Link>{' '}
      / <CrumbCurrent>スキャン結果</CrumbCurrent>
    </Crumb>
  )

  if (result.state !== 'ok') {
    return (
      <>
        {crumb}
        <PageHeading>スキャン結果</PageHeading>
        <EmptyState
          titleLevel={2}
          title={
            result.state === 'unauthenticated'
              ? 'サインインしないと見られません'
              : result.state === 'unavailable'
                ? 'スキャンの結果を取得できませんでした'
                : 'このスキャンの結果はもう残っていません'
          }
          className="mt-4"
          action={
            <Button variant="tone" asChild>
              <Link href={'/settings/channels' as Route}>チャンネルへ</Link>
            </Button>
          }
        >
          {result.state === 'unavailable' && result.message}
        </EmptyState>
      </>
    )
  }

  const { proposal } = result

  const applyAction = (
    <ApplyScanAction scanId={proposal.run.id} onApply={onApply} />
  )

  return (
    <>
      {crumb}
      <PageHeading>スキャン結果</PageHeading>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-surface px-4 py-3.5">
        <div className="min-w-[min(100%,calc(260rem/16))] flex-1">
          <h2 className="heading text-heading">
            スキャン{proposal.run.stateLabel}
          </h2>
          <p className="mt-0.5 text-ui text-ink-2">
            {proposal.run.finishedAt ?? proposal.run.startedAt} · 所要{' '}
            <b className="font-code font-medium tabular-nums text-ink">
              {proposal.run.took ?? EMPTY_VALUE}
            </b>{' '}
            · サービスを取得できた物理ch{' '}
            <b className="font-code font-medium tabular-nums text-ink">
              {proposal.succeeded}
            </b>
          </p>
        </div>
        {applyAction}
      </div>

      <Summary proposal={proposal} />

      {proposal.empty ? (
        <EmptyState className="max-w-[calc(520rem/16)]">
          今回のスキャンで変わるものはありませんでした。
        </EmptyState>
      ) : (
        <>
          {proposal.added.length > 0 && (
            <section className="mt-7">
              <GroupHeading
                title="新規"
                stat={`${proposal.added.length} サービス`}
              />
              <ProposalRows services={proposal.added} />
            </section>
          )}

          {proposal.updated.length > 0 && (
            <section className="mt-7">
              <GroupHeading
                title="更新"
                stat={`${proposal.updated.length} サービス`}
              />
              <ProposalRows services={proposal.updated} />
            </section>
          )}

          {proposal.missing.length > 0 && (
            <section className="mt-7">
              <GroupHeading
                title="消失"
                stat={`${proposal.missing.length} サービス`}
              />
              <ProposalRows services={proposal.missing} />
            </section>
          )}

          {proposal.leftRotation.length > 0 && (
            <section className="mt-7">
              <GroupHeading
                title="巡回から外れた候補"
                stat={`${proposal.leftRotation.length} 件`}
              />
              <DepartureRows departures={proposal.leftRotation} />
            </section>
          )}
        </>
      )}

      {proposal.failures.length > 0 && (
        <section className="mt-7">
          <GroupHeading
            title="失敗"
            stat={`${proposal.failures.length} 物理ch / 保存対象にはなりません`}
          />
          <FailureLegend />
          <ScanAttemptsTable attempts={proposal.failures} />
        </section>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-3 rounded-lg bg-surface px-4 py-3.5">
        <p className="min-w-[min(100%,calc(260rem/16))] flex-1 text-sub leading-[1.7] text-ink-2">
          保存対象: 新規{' '}
          <b className="font-code font-medium tabular-nums text-ink">
            {proposal.added.length}
          </b>{' '}
          / 更新{' '}
          <b className="font-code font-medium tabular-nums text-ink">
            {proposal.updated.length}
          </b>{' '}
          / 消失{' '}
          <b className="font-code font-medium tabular-nums text-ink">
            {proposal.missing.length}
          </b>
        </p>
        {applyAction}
      </div>
    </>
  )
}
