import type { TunerResult, TunerRow } from '@/repository/tuners'
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
  ClockIcon,
  MarkAxis,
  SearchIcon,
  TunerSatelliteIcon,
  TunerTerrestrialIcon,
} from '@/components/vela/icons'
import { TunerStateChip } from '@/page-component/settings/tuner-state-chip'

const COLUMNS = [
  'デバイス',
  '種別',
  '有効',
  '現在のセッション',
  '状態',
  '最終サービス取得',
  'LNB 給電',
]

function DeviceIcon({ row }: { row: TunerRow }) {
  // A mismatched row wears the detected side's picture, not the configured one.
  const Icon =
    row.kind === '衛星' || row.kindUnsure
      ? TunerSatelliteIcon
      : TunerTerrestrialIcon

  return (
    <span className="flex size-[30px] shrink-0 items-center justify-center rounded-md border border-line bg-surface-2">
      <Icon className="size-4 text-ink-2" />
    </span>
  )
}

export function TunersView({ result }: { result: TunerResult }) {
  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>チューナー</CrumbCurrent>
      </Crumb>
      <PageHeading
        description={
          <>
            接続されたチューナーデバイスの一覧と稼働状態。driver 接続中(
            <span className="font-code">instance {result.instanceId}</span>)
          </>
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled
              title="スキャン履歴はこれから実装されます"
            >
              スキャン履歴
            </Button>
            <Button
              size="sm"
              disabled
              title="デバイス検出はこれから実装されます"
            >
              <SearchIcon />
              デバイスを検出
            </Button>
          </div>
        }
      >
        チューナー
      </PageHeading>

      <div className="mt-3.5 space-y-2">
        {result.notices.map((notice) => (
          <Banner key={notice.body} tone={notice.tone} actions={notice.actions}>
            {notice.body}
          </Banner>
        ))}
      </div>

      <p className="mx-0.5 mt-[22px] mb-2.5 flex flex-wrap items-center gap-[9px] text-ui text-ink-2">
        <ClockIcon className="size-[15px] text-brand" />
        健全性のしきい値: 種別単位でサービス取得が連続{' '}
        <b className="font-code font-medium text-ink">
          {result.thresholdHours} 時間
        </b>{' '}
        0 件になると警告
        <Button
          variant="ghost"
          size="xs"
          disabled
          title="しきい値の変更はこれから実装されます"
        >
          変更
        </Button>
      </p>

      <Table className="min-w-[1000px]" containerClassName="pb-1">
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((row) => (
            <TableRow key={row.id} id={row.id}>
              <TableCell>
                <span className="flex items-center gap-2.5">
                  <DeviceIcon row={row} />
                  <span>
                    <b className="block font-code text-[13px] leading-[1.4] font-medium">
                      {row.device}
                    </b>
                    <span className="text-note text-ink-3">{row.hardware}</span>
                  </span>
                </span>
              </TableCell>
              <TableCell>
                {row.kindUnsure ? (
                  <Badge variant="err">{row.kind} ?</Badge>
                ) : (
                  <Badge>{row.kind}</Badge>
                )}
              </TableCell>
              <TableCell>
                <Switch
                  size="sm"
                  checked={row.enabled && !row.draining}
                  aria-label={`${row.device} を有効にする`}
                  title="有効/無効の切り替えはこれから実装されます"
                />
                {row.draining && (
                  <span className="mt-1 block text-[11px] leading-[1.5] text-lemon">
                    無効化を受付済み
                    <br />
                    解放後に停止します
                  </span>
                )}
              </TableCell>
              <TableCell>
                {row.session ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        row.session.tone === 'recording' ? 'recording' : 'info'
                      }
                      className="font-bold"
                    >
                      {row.session.label}
                    </Badge>
                    <span className="text-ui">
                      {row.session.service}
                      {row.session.code && (
                        <span className="font-code">
                          {row.session.service ? ' ' : ''}
                          {row.session.code}
                        </span>
                      )}
                    </span>
                  </span>
                ) : (
                  <span className="text-ui text-ink-3">
                    {row.idleLabel ?? '—'}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <TunerStateChip row={row} />
                {row.stateSub && (
                  <span className="mt-[3px] block text-note leading-[1.5] text-ink-3">
                    {row.stateSub}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {row.lastService ? (
                  <span className="font-code text-[12px] whitespace-nowrap text-ink-2">
                    {row.lastService.at}
                    {row.lastService.ago && (
                      <span className="block text-[10.5px] text-ink-3">
                        {row.lastService.ago}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-ink-3">—</span>
                )}
              </TableCell>
              <TableCell className="font-code text-[12px] whitespace-nowrap text-ink-2">
                {row.lnb ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <section className="mt-9">
        <SectionHeading mark={MarkAxis}>
          デバイス検出 — 差分の確認
        </SectionHeading>
        <p className="-mt-1.5 mb-3.5 text-note text-ink-2">
          「デバイスを検出」実行後、保存前に必ず差分を確認する。空になる保存はできない。
        </p>
        <div className="grid items-start gap-[18px] min-[1020px]:grid-cols-[1.15fr_1fr]">
          <div className="overflow-hidden rounded-xl border border-line-strong bg-surface shadow-pop-xl">
            <div className="px-[19px] pt-[17px]">
              <h3 className="heading text-[14.5px]">検出結果の差分</h3>
              <p className="mt-px text-sub text-ink-2">
                保存すると一覧が更新されます
              </p>
            </div>
            <div className="px-[19px] py-[13px]">
              {result.detectionDiff.map((diff) => (
                <div
                  key={diff.device}
                  className="flex items-center gap-[11px] border-b border-dashed border-line py-2.5 last:border-b-0"
                >
                  <Badge
                    variant={diff.kind === 'add' ? 'ok' : 'err'}
                    className="font-bold"
                  >
                    {diff.tag}
                  </Badge>
                  <span className="font-code text-[12px]">{diff.device}</span>
                  <small className="ml-auto pl-2.5 text-note whitespace-nowrap text-ink-3">
                    {diff.note}
                  </small>
                </div>
              ))}
            </div>
            <p className="px-[19px] text-[11.5px] leading-[1.7] text-ink-3">
              反映には driver の再起動が必要です(保存後にバナーで通知)。
            </p>
            <div className="flex justify-end gap-[9px] px-[19px] pt-[15px] pb-[17px]">
              <Button
                variant="ghost"
                size="sm"
                disabled
                title="デバイス検出はこれから実装されます"
              >
                キャンセル
              </Button>
              <Button
                size="sm"
                disabled
                title="デバイス検出はこれから実装されます"
              >
                この内容で保存
              </Button>
            </div>
          </div>

          <EmptyState
            spot="tuner"
            title="チューナーが未設定です"
            className="border-none bg-tint-lavender"
            action={
              <Button disabled title="デバイス検出はこれから実装されます">
                <SearchIcon />
                デバイスを検出
              </Button>
            }
          >
            接続済みのデバイスを検出して一覧を作成します。設定ファイルを手で編集する必要はありません。
          </EmptyState>
        </div>
      </section>
    </>
  )
}
