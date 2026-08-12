import type { TunerResult, TunerRow } from '@/repository/tuners'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Banner } from '@/components/vela/banner'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { PageHeading } from '@/components/vela/section-heading'
import { ChipDot } from '@/components/vela/status'
import { SearchIcon, TunerIcon } from '@/components/vela/icons'

export function TunersView({ result }: { result: TunerResult }) {
  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>チューナー</CrumbCurrent>
      </Crumb>
      <PageHeading
        description={`接続されたチューナーデバイスの一覧と稼働状態。driver 接続中(instance ${result.instanceId})`}
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
        {result.notices.map((n) => (
          <Banner key={n.body} tone={n.tone}>
            {n.body}
            <span className="ml-auto pl-3.5 font-bold whitespace-nowrap opacity-70">
              {n.action}
            </span>
          </Banner>
        ))}
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-2.5 rounded-md bg-surface-2 px-3.5 py-2.5 text-ui text-ink-2">
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

      <div className="mt-3.5 -mx-1 overflow-x-auto px-1 pb-1">
        <table className="w-full min-w-[860px] border-separate border-spacing-0">
          <thead>
            <tr>
              {[
                'デバイス',
                '種別',
                '有効',
                '現在のセッション',
                '状態',
                '最終サービス取得',
                'LNB 給電',
              ].map((h) => (
                <th
                  key={h}
                  className="bg-surface-2 px-3.5 py-[9px] text-left text-[10.5px] font-bold tracking-[0.05em] whitespace-nowrap text-ink-3 first:rounded-l-md last:rounded-r-md"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r) => (
              <tr key={r.id}>
                <Td>
                  <span className="flex items-center gap-2.5">
                    <TunerIcon className="size-4 text-ink-3" />
                    <span>
                      <b className="block text-[13px] font-bold">{r.device}</b>
                      <span className="text-note text-ink-3">{r.hardware}</span>
                    </span>
                  </span>
                </Td>
                <Td>
                  <Badge>{r.kind}</Badge>
                </Td>
                <Td className="text-ui text-ink-2">
                  {r.enabled ? '有効' : '無効'}
                </Td>
                <Td>
                  {r.session ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge variant="recording">{r.session.label}</Badge>
                      <span className="text-note text-ink-2">
                        {r.session.service}
                      </span>
                    </span>
                  ) : (
                    <span className="text-ui text-ink-3">—</span>
                  )}
                </Td>
                <Td>
                  <StateChip row={r} />
                </Td>
                <Td className="font-code text-ui whitespace-nowrap text-ink-2">
                  {r.lastService}
                </Td>
                <Td className="text-ui text-ink-2">
                  {r.lnb === undefined ? '—' : r.lnb ? 'ON' : 'OFF'}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function StateChip({ row }: { row: TunerRow }) {
  if (row.state === 'faulted')
    return (
      <Badge variant="err" className="font-bold">
        <ChipDot />
        {row.stateLabel}
      </Badge>
    )
  if (row.state === 'ok')
    return (
      <Badge variant="ok" className="font-bold">
        <ChipDot />
        {row.stateLabel}
      </Badge>
    )
  return <Badge variant="mute">{row.stateLabel}</Badge>
}

function Td({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      className={`border-b border-dashed border-line px-3.5 py-3 align-middle text-[13px] ${className ?? ''}`}
      {...props}
    />
  )
}
