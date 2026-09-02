import type { Route } from 'next'
import Link from 'next/link'

import type {
  ChannelsScreenResult,
  ScanRun,
  ServiceGroup,
  StartScanResult,
  WriteResult,
} from '@/repository/services'
import type { ScanSystem } from '@/repository/scan-systems'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Banner } from '@/components/vela/banner'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { EmptyState } from '@/components/vela/empty-state'
import { PageHeading, SectionHeading } from '@/components/vela/section-heading'
import { MarkDots } from '@/components/vela/icons'
import type { CandidateActions } from '@/components/channels/service-table'
import {
  ServiceTable,
  UnfoldingServices,
} from '@/components/channels/service-table'
import { ScanBar } from '@/components/channels/scan-bar'
import { ScanRunPanel } from '@/components/scan/scan-run-panel'
import { ZeroDiagnosisPanel } from '@/components/channels/zero-diagnosis'

function GroupHeading({ title, stat }: { title: string; stat: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline gap-2.5 px-0.5">
      <h2 className="heading text-[15px]">{title}</h2>
      <span className="text-note tabular-nums text-ink-3">{stat}</span>
    </div>
  )
}

function ServiceGroupSection({
  group,
  actions,
}: {
  group: ServiceGroup
  actions: CandidateActions
}) {
  return (
    <section id={`system-${group.system}`} className="mt-9">
      <GroupHeading
        title={group.label}
        stat={group.walk === 'never' ? '未スキャン' : group.stat}
      />

      {group.services.length === 0 ? (
        group.diagnosis ? (
          <ZeroDiagnosisPanel label={group.label} diagnosis={group.diagnosis} />
        ) : (
          <EmptyState spot="antenna" className="mx-auto max-w-[520px]">
            {group.walk === 'never'
              ? `${group.label}はまだスキャンされていません。`
              : group.walk === 'unknown'
                ? `${group.label}のサービスは 0 件です。直近のスキャンを読み取れなかったため、走査済みかどうかは分かりません。`
                : `${group.label}のサービスは 0 件です。直近のスキャンでは受信できたサービスがありませんでした。`}
          </EmptyState>
        )
      ) : (
        <ServiceTable services={group.services} actions={actions} />
      )}
    </section>
  )
}

function ScanHistory({ history }: { history: ScanRun[] }) {
  return (
    <section id="scan-history" className="mt-10">
      <SectionHeading mark={MarkDots}>スキャン履歴</SectionHeading>
      {history.length === 0 ? (
        <p className="text-ui text-ink-2">
          スキャンはまだ一度も実行されていません。
        </p>
      ) : (
        <Table className="min-w-[560px]" containerClassName="pb-1">
          <TableHeader>
            <TableRow>
              {['開始', '状態', '所要', '終了'].map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((run) => (
              <TableRow key={run.id}>
                <TableCell className="font-code text-sub tabular-nums whitespace-nowrap text-ink-2">
                  {run.startedAt}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      run.state === 'completed'
                        ? 'ok'
                        : run.state === 'running'
                          ? 'info'
                          : run.state === 'failed'
                            ? 'err'
                            : 'mute'
                    }
                  >
                    {run.stateLabel}
                  </Badge>
                </TableCell>
                <TableCell className="font-code text-sub tabular-nums whitespace-nowrap text-ink-2">
                  {run.took ?? '—'}
                </TableCell>
                <TableCell className="font-code text-sub tabular-nums whitespace-nowrap text-ink-2">
                  {run.finishedAt ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

export function ChannelsView({
  result,
  onStart,
  onCancel,
  onSelect,
  onAdd,
  onDelete,
}: {
  result: ChannelsScreenResult
  onStart: (systems: ScanSystem[]) => Promise<StartScanResult>
  onCancel: (scanId: string) => Promise<WriteResult>
} & CandidateActions) {
  const actions = { onSelect, onAdd, onDelete }

  const heading = (
    <>
      <Crumb>
        設定 / <CrumbCurrent>チャンネル</CrumbCurrent>
      </Crumb>
      <PageHeading
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href={'/settings/channels#scan-history' as Route}>
              スキャン履歴
            </Link>
          </Button>
        }
      >
        チャンネル
      </PageHeading>
    </>
  )

  if (result.state !== 'ok') {
    return (
      <>
        {heading}
        {result.state === 'unauthenticated' ? (
          <EmptyState
            spot="antenna"
            titleLevel={2}
            title="サインインしないと見られません"
            className="mt-4"
          />
        ) : (
          <EmptyState
            spot="antenna"
            titleLevel={2}
            title="一覧を取得できませんでした"
            className="mt-4"
          />
        )}
      </>
    )
  }

  const { result: channels } = result
  const zero = channels.groups.find(
    (group) => group.diagnosis !== undefined && group.services.length === 0,
  )
  const lastFinished = channels.history.find((run) => run.state !== 'running')
  // Nothing has ever been walked: one way in, not three empty groups.
  const neverScanned =
    channels.history.length === 0 &&
    channels.unattributed.length === 0 &&
    channels.groups.every((group) => group.services.length === 0)

  return (
    <>
      {heading}

      {zero && (
        <Banner
          tone="danger"
          className="mt-4"
          actions={[
            {
              label: '切り分けを見る',
              href: `/settings/channels#system-${zero.system}` as Route,
            },
          ]}
        >
          <b className="block font-bold">
            {zero.label} のサービスが 0 件です。
          </b>
        </Banner>
      )}

      {channels.proposal && !channels.proposal.empty && (
        <Banner
          tone="info"
          className="mt-2"
          actions={[
            {
              label: '結果を確認',
              href: `/settings/channels/scan/${channels.proposal.run.id}` as Route,
            },
          ]}
        >
          直近のスキャンの結果がまだ適用されていません。
        </Banner>
      )}

      {channels.running ? (
        <ScanRunPanel running={channels.running} onCancel={onCancel} />
      ) : (
        <ScanBar
          lastScan={
            lastFinished
              ? `前回: ${lastFinished.startedAt} · ${lastFinished.took ?? '—'} · ${lastFinished.stateLabel}`
              : '前回: なし'
          }
          onStart={onStart}
        />
      )}

      <UnfoldingServices>
        {neverScanned ? (
          <EmptyState
            spot="antenna"
            titleLevel={2}
            title="まだスキャンしていません"
            className="mt-9"
          />
        ) : (
          channels.groups.map((group) => (
            <ServiceGroupSection
              key={group.system}
              group={group}
              actions={actions}
            />
          ))
        )}

        {channels.unattributed.length > 0 && (
          <section className="mt-9">
            <GroupHeading
              title="種別を特定できないサービス"
              stat={`${channels.unattributed.length} サービス`}
            />
            <ServiceTable services={channels.unattributed} actions={actions} />
          </section>
        )}
      </UnfoldingServices>

      <ScanHistory history={channels.history} />
    </>
  )
}
