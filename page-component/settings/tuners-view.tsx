import type { TunerResult } from '@/repository/tuners'
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
import { PageHeading } from '@/components/vela/section-heading'
import { SearchIcon, TunerIcon } from '@/components/vela/icons'
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
        {result.notices.map((notice) => (
          <Banner key={notice.body} tone={notice.tone} actions={notice.actions}>
            {notice.body}
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

      <Table className="min-w-[860px]" containerClassName="mt-3.5 pb-1">
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
                  <TunerIcon className="size-4 text-ink-3" />
                  <span>
                    <b className="block text-[13px] font-bold">{row.device}</b>
                    <span className="text-note text-ink-3">{row.hardware}</span>
                  </span>
                </span>
              </TableCell>
              <TableCell>
                <Badge>{row.kind}</Badge>
              </TableCell>
              <TableCell className="text-ink-2">
                {row.enabled ? '有効' : '無効'}
              </TableCell>
              <TableCell>
                {row.session ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant="recording">{row.session.label}</Badge>
                    <span className="text-note text-ink-2">
                      {row.session.service}
                    </span>
                  </span>
                ) : (
                  <span className="text-ink-3">—</span>
                )}
              </TableCell>
              <TableCell>
                <TunerStateChip row={row} />
              </TableCell>
              <TableCell className="font-code text-ink-2">
                {row.lastService}
              </TableCell>
              <TableCell className="text-ink-2">
                {row.lnb === undefined ? '—' : row.lnb ? 'ON' : 'OFF'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
