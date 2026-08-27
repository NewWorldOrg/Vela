import { isPlayableSource } from '@/lib/recordings'
import type { RecordingDetail } from '@/repository/recordings'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/vela/progress'
import { DetailKeyRow } from '@/components/recordings/detail-key-row'

export function EncodePanelBody({ detail: d }: { detail: RecordingDetail }) {
  if (!d.encode) {
    return null
  }

  const p = d.encodePanel

  switch (d.encode.status) {
    case 'done':
      return (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[120px] flex-1 rounded-lg bg-surface-2 px-3.5 py-[11px]">
              <span className="mb-0.5 block text-[11px] text-ink-3">元 TS</span>
              <span className="font-code text-[16px] font-medium tabular-nums">
                {p?.sourceSize}
              </span>
            </div>
            <span className="shrink-0 text-[14px] text-ink-3">→</span>
            <div className="min-w-[120px] flex-1 rounded-lg bg-surface-2 px-3.5 py-[11px]">
              <span className="mb-0.5 block text-[11px] text-ink-3">H.264</span>
              <span className="font-code text-[16px] font-medium tabular-nums">
                {p?.outSize}
              </span>
              <small className="ml-[7px] font-code text-[11px] font-medium text-mint">
                {p?.savings}
              </small>
            </div>
          </div>
          <p className="mt-3 font-code text-[11.5px] leading-relaxed text-ink-3">
            {p?.doneSub}
          </p>
        </>
      )
    case 'running':
      return (
        <>
          {p?.profile && (
            <DetailKeyRow label="プロファイル" main={p.profile} plain />
          )}
          <ProgressBar
            value={p?.progressPct ?? 0}
            aria-label="エンコードの進捗"
            className="mt-3 h-[9px]"
          />
          <p className="mt-3 font-code text-[11.5px] leading-relaxed text-ink-3">
            {p?.progressSub}
          </p>
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              disabled
              title="エンコード操作はこれから実装されます"
            >
              キャンセル
            </Button>
          </div>
        </>
      )
    case 'waiting':
      return (
        <>
          <p className="mb-2.5 text-sub leading-relaxed text-ink-2">
            {p?.queueSub}
          </p>
          {p?.profile && (
            <DetailKeyRow label="プロファイル" main={p.profile} plain />
          )}
          {p?.registeredAt && (
            <DetailKeyRow label="登録" main={p.registeredAt} />
          )}
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              disabled
              title="エンコード操作はこれから実装されます"
            >
              キャンセル
            </Button>
          </div>
        </>
      )
    case 'failed':
      return (
        <>
          {d.encode.reason && (
            <DetailKeyRow label="分類" main={d.encode.reason} />
          )}
          {p?.attempts && <DetailKeyRow label="試行" main={p.attempts} />}
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              disabled
              title="エンコード操作はこれから実装されます"
            >
              再実行
            </Button>
          </div>
          <p className="mt-3 text-note leading-relaxed text-ink-3">
            エンコードの失敗は録画の結果を書き換えません。録画は成功のまま、成果物だけが無い状態です。
          </p>
        </>
      )
    case 'none':
      return (
        <p className="text-sub leading-relaxed text-ink-2">
          {isPlayableSource(d)
            ? '成果物はまだありません。オンザフライで再生できますが、シークのたびにトランスコーダを立て直します。'
            : '成果物はありません。'}
        </p>
      )
  }
}
