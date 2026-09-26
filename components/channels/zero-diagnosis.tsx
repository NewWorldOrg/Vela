import type { ZeroDiagnosis } from '@/repository/services'
import { numbered } from '@/repository/scan-failures'
import { DangerIcon } from '@/components/vela/icons'

export function ZeroDiagnosisPanel({
  label,
  diagnosis,
}: {
  label: string
  diagnosis: ZeroDiagnosis
}) {
  return (
    <div className="rounded-xl bg-surface pt-0.5 pb-1">
      <div className="flex items-start gap-[calc(9rem/16)] px-[calc(18rem/16)] pt-4 pb-1">
        <DangerIcon className="mt-[calc(3rem/16)] size-[calc(17rem/16)] text-coral" />
        <div>
          <h3 className="heading text-[calc(14.5rem/16)] text-coral">
            {label} のサービスがありません
          </h3>
          <p className="mt-px text-sub text-ink-2">
            直近スキャン({diagnosis.scannedAt} · {diagnosis.attempted}{' '}
            件走査)の失敗内訳
          </p>
        </div>
      </div>
      <div className="grid gap-2.5 px-[calc(18rem/16)] pt-3 pb-3.5 sm:grid-cols-2 min-[1020px]:grid-cols-4">
        {diagnosis.counts.map(({ class: failure, count }) => {
          const sole = count > 0 && count === diagnosis.attempted

          return (
            <div
              key={failure.no}
              className={
                sole
                  ? 'rounded-lg bg-coral-soft px-[calc(13rem/16)] py-[calc(11rem/16)]'
                  : 'rounded-lg bg-surface-2 px-[calc(13rem/16)] py-[calc(11rem/16)]'
              }
            >
              <div
                className={
                  sole
                    ? 'mb-0.5 text-cap font-medium text-coral'
                    : 'mb-0.5 text-cap font-medium text-ink-3'
                }
              >
                {numbered(failure)}
              </div>
              <div
                className={
                  sole
                    ? 'font-code text-[calc(19rem/16)] leading-[1.5] font-medium tabular-nums text-coral'
                    : 'font-code text-[calc(19rem/16)] leading-[1.5] font-medium tabular-nums'
                }
              >
                {count}
                {sole && (
                  <small className="text-cap font-normal text-ink-3">
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
        <p className="mx-[calc(18rem/16)] mb-4 rounded-xl bg-lemon-soft px-[calc(15rem/16)] py-[calc(11rem/16)] text-ui leading-[1.7] text-lemon">
          {diagnosis.verdict}
        </p>
      )}
    </div>
  )
}
