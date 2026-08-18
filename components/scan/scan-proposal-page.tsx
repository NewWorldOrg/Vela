import type { Route } from 'next'
import Link from 'next/link'

import type {
  ProposalService,
  RotationDeparture,
  ScanProposal,
  ScanProposalScreenResult,
  WriteResult,
} from '@/repository/services'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { EmptyState } from '@/components/vela/empty-state'
import { PageHeading } from '@/components/vela/section-heading'
import { InfoIcon, SearchIcon } from '@/components/vela/icons'
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

function ProposalRows({
  services,
  description,
}: {
  services: ProposalService[]
  description: string
}) {
  return (
    <>
      <p className="mb-[11px] px-0.5 text-note leading-[1.7] text-ink-2">
        {description}
      </p>
      <div className="rounded-xl bg-surface px-[17px]">
        {services.map((service) => (
          <div
            key={service.key}
            className="flex flex-wrap items-start gap-3 border-b border-dashed border-line py-3 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[13px] leading-[1.6] font-bold">
                {service.name}
                <span className="ml-2 font-code text-cap font-normal text-ink-3">
                  {service.sid}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {service.channels.map((channel) => (
                  <span
                    key={`${channel.kind}-${channel.channel}`}
                    className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-[11px] py-[3px] text-note"
                  >
                    <Badge variant={CHANNEL_KIND_VARIANT[channel.kind]}>
                      {CHANNEL_KIND_LABEL[channel.kind]}
                    </Badge>
                    <span className="font-code tabular-nums">
                      {channel.channel}
                    </span>
                    {channel.measurement && (
                      <span className="font-code tabular-nums text-ink-3">
                        {channel.measurement.value}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
            <Badge variant="kindData">{service.category}</Badge>
          </div>
        ))}
      </div>
    </>
  )
}

function DepartureRows({ departures }: { departures: RotationDeparture[] }) {
  return (
    <>
      <p className="mb-[11px] px-0.5 text-note leading-[1.7] text-ink-2">
        続けて失敗したため巡回から外れた候補チャンネルです。定義は残ります —
        黙って消えることはありません。
      </p>
      <div className="rounded-xl bg-surface px-[17px]">
        {departures.map((departure) => (
          <div
            key={`${departure.key}-${departure.channel}`}
            className="flex flex-wrap items-center gap-3 border-b border-dashed border-line py-3 last:border-b-0"
          >
            <span className="font-code text-[13.5px] font-medium tabular-nums">
              {departure.channel}
            </span>
            <Badge variant="warn" className="font-bold">
              要確認 · 連続失敗 {departure.consecutiveFailures} 回
            </Badge>
            <span className="font-code text-cap tabular-nums text-ink-3">
              {departure.since} から
            </span>
            <span className="ml-auto font-code text-cap text-ink-3">
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
      note: '一覧に追加します',
      tint: 'bg-tint-sage',
    },
    {
      label: '更新',
      value: proposal.updated.length,
      unit: 'サービス',
      note: '候補ch・区分が変わりました',
      tint: 'bg-tint-sky',
    },
    {
      label: '消失',
      value: proposal.missing.length,
      unit: 'サービス',
      note: '今回の走査で見つかりませんでした',
      tint: 'bg-tint-salmon',
    },
    {
      label: '失敗',
      value: proposal.failures.length,
      unit: '物理ch',
      note: '4 分類の理由つきで記録しました',
      tint: 'bg-tint-butter',
    },
  ]

  return (
    <div className="mb-3 grid gap-[11px] sm:grid-cols-2 min-[1020px]:grid-cols-4">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className={`rounded-xl px-4 py-[13px] ${cell.tint}`}
        >
          <div className="text-note font-medium text-ink-2">{cell.label}</div>
          <div className="font-code text-[22px] leading-[1.4] font-medium tabular-nums">
            {cell.value}
            <small className="ml-[3px] text-cap font-normal text-ink-3">
              {cell.unit}
            </small>
          </div>
          <p className="text-cap leading-[1.6] text-ink-2">{cell.note}</p>
        </div>
      ))}
    </div>
  )
}

function GroupHeading({ title, stat }: { title: string; stat: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline gap-2.5 px-0.5">
      <h2 className="heading text-[15px]">{title}</h2>
      <span className="text-note tabular-nums text-ink-3">{stat}</span>
    </div>
  )
}

/**
 * A finished run stated as a proposal. Nothing on this page has happened yet;
 * applying is a single explicit act and there is no way to apply half of it,
 * so the page reads as one decision rather than a list of edits.
 */
export function ScanProposalView({
  result,
  onApply,
}: {
  /** A run the API has never heard of is a 404, handled by the route. */
  result: Exclude<ScanProposalScreenResult, { state: 'missing' }>
  onApply: (scanId: string) => Promise<WriteResult>
}) {
  const crumb = (
    <Crumb>
      設定 / <Link href={'/settings/channels' as Route}>チャンネル</Link> /{' '}
      <CrumbCurrent>スキャン結果</CrumbCurrent>
    </Crumb>
  )

  if (result.state !== 'ok') {
    return (
      <>
        {crumb}
        <PageHeading description="この内容で保存するまで、既存の定義は一切変わりません">
          スキャン結果の確認
        </PageHeading>
        <EmptyState
          spot="antenna"
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
            <Button asChild>
              <Link href={'/settings/channels' as Route}>チャンネルへ戻る</Link>
            </Button>
          }
        >
          {result.state === 'unauthenticated'
            ? 'スキャンの結果はサインインしたユーザーだけに見せています。サインインはこれから実装されます。'
            : result.state === 'unavailable'
              ? `API はこのスキャンの結果を答えられませんでした。${result.message}`
              : '走査が終わっていないか、結果がすでに適用されています。'}
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
      <PageHeading description="この内容で保存するまで、既存の定義は一切変わりません">
        スキャン結果の確認
      </PageHeading>

      <div className="mt-4 flex flex-wrap items-start gap-3 rounded-xl bg-surface px-[18px] py-4">
        <SearchIcon className="mt-1 size-[17px] shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <h2 className="heading text-ui leading-[1.5]">
            走査が{proposal.run.stateLabel}しました
          </h2>
          <p className="text-ui text-ink-2">
            {proposal.run.finishedAt ?? proposal.run.startedAt} · 所要{' '}
            <b className="font-code font-medium tabular-nums text-ink">
              {proposal.run.took ?? '—'}
            </b>{' '}
            · サービスを取得できた物理ch{' '}
            <b className="font-code font-medium tabular-nums text-ink">
              {proposal.succeeded}
            </b>
          </p>
        </div>
        {applyAction}
      </div>

      <p className="my-3 flex items-start gap-2 px-0.5 text-note leading-[1.7] text-ink-2">
        <InfoIcon className="mt-1 size-[15px] shrink-0 text-ink-3" />
        この差分は提案です。「この内容で保存」を押すまで、サービスの定義も候補チャンネルも一切書き換わりません。保存は一度きりで、一部だけを選んで保存することはできません。
      </p>

      <Summary proposal={proposal} />

      {proposal.empty ? (
        <EmptyState spot="antenna" className="mx-auto max-w-[520px]">
          今回の走査で変わるものはありませんでした。保存しても定義は変わりません。
        </EmptyState>
      ) : (
        <>
          {proposal.added.length > 0 && (
            <section className="mt-7">
              <GroupHeading
                title="新規"
                stat={`${proposal.added.length} サービス`}
              />
              <ProposalRows
                services={proposal.added}
                description="今回の走査で初めて見つかったサービスです。保存すると一覧に追加します。"
              />
            </section>
          )}

          {proposal.updated.length > 0 && (
            <section className="mt-7">
              <GroupHeading
                title="更新"
                stat={`${proposal.updated.length} サービス`}
              />
              <ProposalRows
                services={proposal.updated}
                description="既存サービスの変わった項目だけを書き換えます。nid+sid は変わらないため、予約と EPG は影響を受けません。"
              />
            </section>
          )}

          {proposal.missing.length > 0 && (
            <section className="mt-7">
              <GroupHeading
                title="消失"
                stat={`${proposal.missing.length} サービス`}
              />
              <ProposalRows
                services={proposal.missing}
                description="今回の走査で見つからなかったサービスです。一時的な受信不良・中継局の停波・アンテナ工事でも消失として出ます。"
              />
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
          <p className="mb-[11px] px-0.5 text-note leading-[1.7] text-ink-2">
            走査できなかった物理chです。成功した分はそのまま保存できます。どの段階で止まったかを
            4 分類で記録しています。
          </p>
          <FailureLegend />
          <ScanAttemptsTable attempts={proposal.failures} />
        </section>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-3 rounded-xl bg-surface px-[18px] py-4">
        <p className="min-w-0 flex-1 text-sub leading-[1.7] text-ink-2">
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
          。破棄を選ぶと既存の定義は一切変わりません。
        </p>
        {applyAction}
      </div>
    </>
  )
}
