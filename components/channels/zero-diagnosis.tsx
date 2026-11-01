import type { ZeroDiagnosis } from '@/repository/services'
import { numbered } from '@/repository/scan-failures'
import { DangerIcon, WarningIcon } from '@/components/vela/icons'

export function ZeroDiagnosisPanel({
  label,
  diagnosis,
}: {
  label: string
  diagnosis: ZeroDiagnosis
}) {
  return (
    <div className="rounded-lg bg-surface pt-0.5 pb-1">
      <div className="flex items-start gap-2.5 px-4 pt-4 pb-1">
        <DangerIcon className="mt-0.5 size-[calc(17rem/16)] shrink-0 text-rec" />
        <div>
          <h3 className="text-[calc(14.5rem/16)] font-semibold text-ink">
            {label} のサービスがありません
          </h3>
          <p className="mt-px text-sub text-ink-2">
            直近スキャン({diagnosis.scannedAt} · {diagnosis.attempted}{' '}
            件スキャン)の失敗内訳
          </p>
        </div>
      </div>
      <div className="grid gap-2 px-4 pt-3 pb-3.5 sm:grid-cols-2 min-[1020px]:grid-cols-4">
        {diagnosis.counts.map(({ class: failure, count }) => {
          const sole = count > 0 && count === diagnosis.attempted

          return (
            <div
              key={failure.no}
              className={
                sole
                  ? 'rounded-md bg-rec-soft px-3 py-2.5'
                  : 'rounded-md bg-surface-2 px-3 py-2.5'
              }
            >
              <div
                className={
                  sole
                    ? 'mb-0.5 text-cap font-medium text-rec-text'
                    : 'mb-0.5 text-cap font-medium text-ink-2'
                }
              >
                {numbered(failure)}
              </div>
              <div
                className={
                  sole
                    ? 'text-section font-bold tabular-nums text-rec-text'
                    : 'text-section font-bold tabular-nums'
                }
              >
                {count}
                {sole && (
                  <small className="text-cap font-normal text-ink-2">
                    {' '}
                    / {diagnosis.attempted}
                  </small>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {diagnosis.verdict && (
        <p className="mx-4 mb-4 flex items-start gap-2 border-t border-hair pt-3 text-ui text-ink">
          <WarningIcon className="mt-0.5 size-4 shrink-0 text-warn" />
          {diagnosis.verdict}
        </p>
      )}
    </div>
  )
}
