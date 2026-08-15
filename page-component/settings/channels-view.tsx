import type { Route } from 'next'
import Link from 'next/link'

import type {
  ChannelsScreenResult,
  ScanRun,
  ScanSystem,
  ServiceGroup,
  ServiceRow,
  StartScanResult,
} from '@/repository/services'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
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
import {
  ChevronDownIcon,
  ChevronRightIcon,
  MarkDots,
} from '@/components/vela/icons'
import { CandidateList } from '@/page-component/settings/candidate-list'
import { ScanBar } from '@/page-component/settings/scan-bar'
import { ScanRunPanel } from '@/page-component/settings/scan-run-panel'
import { ZeroDiagnosisPanel } from '@/page-component/settings/zero-diagnosis'

/**
 * The first and last headings carry no visible text in the design — the caret
 * and the attention chip speak for themselves — so they are named for screen
 * readers only.
 */
const SERVICE_COLUMNS: { label: string; hidden?: boolean }[] = [
  { label: '候補チャンネルの開閉', hidden: true },
  { label: 'サービス' },
  { label: '区分' },
  { label: '現在の物理ch' },
  { label: '候補' },
  { label: '有効' },
  { label: '最終確認' },
  { label: '状態', hidden: true },
]

function CategoryBadge({ service }: { service: ServiceRow }) {
  return (
    <Badge variant={service.minorCategory ? 'kindData' : 'kindTv'}>
      {service.category}
    </Badge>
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

function ServiceTable({
  services,
  open,
  onSelect,
}: {
  services: ServiceRow[]
  open?: string
  onSelect: (serviceKey: string, candidateChannelId: string) => Promise<void>
}) {
  return (
    <Table className="min-w-[860px]" containerClassName="pb-1">
      <TableHeader>
        <TableRow>
          {SERVICE_COLUMNS.map((column) => (
            <TableHead key={column.label}>
              {column.hidden ? (
                <span className="sr-only">{column.label}</span>
              ) : (
                column.label
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((service) => {
          const expanded = open === service.key

          return [
            <TableRow
              key={service.key}
              className="has-aria-expanded:bg-transparent"
            >
              <TableCell className="w-6">
                <Link
                  href={
                    (expanded
                      ? '/settings/channels'
                      : `/settings/channels?open=${service.key}`) as Route
                  }
                  scroll={false}
                  aria-label={`${service.name} の候補チャンネル`}
                  aria-expanded={expanded}
                  className="inline-flex text-ink-3 hover:text-ink"
                >
                  {expanded ? (
                    <ChevronDownIcon className="size-3.5" />
                  ) : (
                    <ChevronRightIcon className="size-3.5" />
                  )}
                </Link>
              </TableCell>
              <TableCell>
                <b className="text-[13px] font-bold">{service.name}</b>
                <span className="ml-2 font-code text-cap text-ink-3">
                  {service.sid}
                </span>
              </TableCell>
              <TableCell>
                <CategoryBadge service={service} />
              </TableCell>
              <TableCell>
                {service.currentChannel === undefined ? (
                  <span className="text-ui font-bold text-lemon">
                    選局先なし
                  </span>
                ) : (
                  <span className="font-code font-medium tabular-nums">
                    {service.currentChannel}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <span className="font-code tabular-nums text-ink-2">
                  {service.candidateCount}
                </span>
                {service.needsAttentionCount > 0 && (
                  <span className="ml-1.5 text-sub text-lemon">
                    (要確認 {service.needsAttentionCount})
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Switch
                  size="sm"
                  checked={service.enabled}
                  disabled
                  aria-label={`${service.name} を有効にする`}
                  title="有効の切替はこれから実装されます"
                />
              </TableCell>
              <TableCell className="font-code text-sub whitespace-nowrap text-ink-2">
                {service.lastSeen}
              </TableCell>
              <TableCell>
                {service.currentChannel === undefined && (
                  <Badge variant="warn" className="font-bold">
                    要対応
                  </Badge>
                )}
              </TableCell>
            </TableRow>,
            expanded && (
              <TableRow key={`${service.key}-candidates`}>
                <TableCell
                  colSpan={SERVICE_COLUMNS.length}
                  className="bg-surface-2 py-3.5 pr-[18px] pl-10"
                >
                  <CandidateList
                    serviceKey={service.key}
                    candidates={service.candidates}
                    onSelect={onSelect}
                  />
                </TableCell>
              </TableRow>
            ),
          ]
        })}
      </TableBody>
    </Table>
  )
}

function ServiceGroupSection({
  group,
  open,
  onSelect,
}: {
  group: ServiceGroup
  open?: string
  onSelect: (serviceKey: string, candidateChannelId: string) => Promise<void>
}) {
  return (
    <section id={`system-${group.system}`} className="mt-9">
      <GroupHeading
        title={group.label}
        stat={group.neverScanned ? '未スキャン' : group.stat}
      />

      {group.services.length === 0 ? (
        group.diagnosis ? (
          <ZeroDiagnosisPanel label={group.label} diagnosis={group.diagnosis} />
        ) : (
          <EmptyState spot="antenna" className="mx-auto max-w-[520px]">
            {group.label}
            はまだスキャンされていません。総当たりで選局し、受信できたサービスを一覧にします。
          </EmptyState>
        )
      ) : (
        <ServiceTable
          services={group.services}
          open={open}
          onSelect={onSelect}
        />
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
  open,
  onStart,
  onCancel,
  onSelect,
}: {
  result: ChannelsScreenResult
  /** The service whose candidates are unfolded, from the URL. */
  open?: string
  onStart: (systems: ScanSystem[]) => Promise<StartScanResult>
  onCancel: (scanId: string) => Promise<void>
  onSelect: (serviceKey: string, candidateChannelId: string) => Promise<void>
}) {
  const heading = (
    <>
      <Crumb>
        設定 / <CrumbCurrent>チャンネル</CrumbCurrent>
      </Crumb>
      <PageHeading
        description="受信できるサービスと候補チャンネル。スキャンの結果は確認してから適用します"
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
          >
            チャンネルの定義はサインインしたユーザーだけに見せています。サインインはこれから実装されます。
          </EmptyState>
        ) : (
          <EmptyState
            spot="antenna"
            titleLevel={2}
            title="一覧を取得できませんでした"
            className="mt-4"
          >
            API はサービスの一覧を答えられませんでした。{result.message}
          </EmptyState>
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
          <b className="font-bold">{zero.label} のサービスが 0 件です。</b>
          有効な候補チャンネルを持つサービスがひとつも確認できていません。
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
          直近のスキャンの結果がまだ適用されていません。適用するまで既存の定義は変わりません。
        </Banner>
      )}

      {channels.running ? (
        <ScanRunPanel progress={channels.running} onCancel={onCancel} />
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

      {neverScanned ? (
        <EmptyState
          spot="antenna"
          titleLevel={2}
          title="まだスキャンしていません"
          className="mt-9"
        >
          チューナーの種別ごとに総当たりで選局し、受信できたサービスを一覧にします。結果は差分として提示され、確認してから適用します。
        </EmptyState>
      ) : (
        channels.groups.map((group) => (
          <ServiceGroupSection
            key={group.system}
            group={group}
            open={open}
            onSelect={onSelect}
          />
        ))
      )}

      {channels.unattributed.length > 0 && (
        <section className="mt-9">
          <GroupHeading
            title="種別を特定できないサービス"
            stat={`${channels.unattributed.length} サービス`}
          />
          <p className="mb-2 px-0.5 text-note leading-[1.7] text-ink-2">
            候補チャンネルが 1
            件も残っていないため、どの種別で受信していたのかが分かりません。定義は残っています。
          </p>
          <ServiceTable
            services={channels.unattributed}
            open={open}
            onSelect={onSelect}
          />
        </section>
      )}

      <ScanHistory history={channels.history} />
    </>
  )
}
