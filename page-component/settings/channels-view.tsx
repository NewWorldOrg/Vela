import type { ChannelsResult } from '@/repository/tuners'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Banner } from '@/components/vela/banner'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { EmptyState } from '@/components/vela/empty-state'
import { PageHeading } from '@/components/vela/section-heading'

const SCAN_RANGES = ['すべて', '地上波', 'BS', 'CS110', 'ch 指定']

export function ChannelsView({ result }: { result: ChannelsResult }) {
  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>チャンネル</CrumbCurrent>
      </Crumb>
      <PageHeading
        description="受信できるサービスと候補チャンネル。スキャンの結果は確認してから適用します"
        action={
          <Button
            variant="ghost"
            size="sm"
            disabled
            title="スキャン履歴はこれから実装されます"
          >
            スキャン履歴
          </Button>
        }
      >
        チャンネル
      </PageHeading>

      {result.warning && (
        <Banner tone="danger" className="mt-3.5">
          {result.warning.body}
          <span className="ml-auto pl-3.5 font-bold whitespace-nowrap opacity-70">
            {result.warning.action}
          </span>
        </Banner>
      )}

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5 rounded-lg bg-surface px-4 py-3">
        <span className="text-cap font-bold tracking-[0.04em] text-ink-3">
          スキャン範囲
        </span>
        <div className="inline-flex gap-0.5 rounded-full bg-surface-2 p-[3px]">
          {SCAN_RANGES.map((r, i) => (
            <span
              key={r}
              className={
                i === 1
                  ? 'rounded-full bg-brand-soft px-3 py-1 text-sub font-bold text-brand'
                  : 'rounded-full px-3 py-1 text-sub font-medium text-ink-2'
              }
            >
              {r}
            </span>
          ))}
        </div>
        <span className="text-note text-ink-3">{result.lastScan}</span>
        <Button
          size="sm"
          className="ml-auto"
          disabled
          title="スキャンはこれから実装されます"
        >
          スキャン開始
        </Button>
      </div>

      {result.groups.map((g) => (
        <section key={g.kind} className="mt-4">
          <div className="mb-2 flex flex-wrap items-baseline gap-2.5">
            <h2 className="heading text-[15px]">{g.kind}</h2>
            <span className="text-sub text-ink-2">{g.stat}</span>
          </div>
          {g.services.length === 0 ? (
            <EmptyState spot="antenna" className="mx-auto max-w-[520px]">
              受信できるサービスが確認できていません。スキャンの結果と信号の状態を確かめてください。
            </EmptyState>
          ) : (
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <table className="w-full min-w-[820px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    {[
                      'サービス',
                      '区分',
                      '現在の物理ch',
                      '候補',
                      '有効',
                      '最終確認',
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
                  {g.services.map((s) => (
                    <tr key={s.id}>
                      <Td>
                        <b className="block text-[13px] font-bold">{s.name}</b>
                        <span className="font-code text-note text-ink-3">
                          {s.sid}
                        </span>
                      </Td>
                      <Td>
                        <Badge
                          variant={s.kind === 'TV' ? 'kindTv' : 'kindData'}
                        >
                          {s.kind}
                        </Badge>
                      </Td>
                      <Td className="font-code text-ui whitespace-nowrap">
                        {s.currentCh}
                      </Td>
                      <Td className="text-ui whitespace-nowrap">
                        <span className="font-code">{s.candidates}</span>
                        {s.needsCheck > 0 && (
                          <span className="ml-1.5 text-note text-lemon">
                            (確認が要るもの {s.needsCheck})
                          </span>
                        )}
                      </Td>
                      <Td className="text-ui text-ink-2">
                        {s.enabled ? '有効' : '無効'}
                      </Td>
                      <Td className="font-code text-ui whitespace-nowrap text-ink-2">
                        {s.lastSeen}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </>
  )
}

function Td({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      className={`border-b border-dashed border-line px-3.5 py-3 align-middle text-[13px] ${className ?? ''}`}
      {...props}
    />
  )
}
