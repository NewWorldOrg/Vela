import type { ZeroDiagnosis } from '@/repository/services'
import { DangerIcon } from '@/components/vela/icons'

const CIRCLED = { 1: '①', 2: '②', 3: '③', 4: '④' } as const

/**
 * A system with no service at all. The count is the same in every case, so the
 * screen shows which of the four stages every attempt stopped at — that is
 * what separates an aerial problem from a descrambling problem from a
 * programme-information problem.
 */
export function ZeroDiagnosisPanel({
  label,
  diagnosis,
}: {
  label: string
  diagnosis: ZeroDiagnosis
}) {
  return (
    <div className="rounded-xl bg-surface pt-0.5 pb-1">
      <div className="flex items-start gap-[9px] px-[18px] pt-4 pb-1">
        <DangerIcon className="mt-[3px] size-[17px] text-coral" />
        <div>
          <h3 className="heading text-[14.5px] text-coral">
            {label} のサービスがありません
          </h3>
          <p className="mt-px text-sub text-ink-2">
            直近スキャン({diagnosis.scannedAt} · {diagnosis.attempted}{' '}
            件走査)の失敗内訳 — どの段階で止まっているかで原因を絞り込めます
          </p>
        </div>
      </div>
      <div className="grid gap-2.5 px-[18px] pt-3 pb-3.5 sm:grid-cols-2 min-[1020px]:grid-cols-4">
        {diagnosis.counts.map(({ class: failure, count }) => {
          const sole = count > 0 && count === diagnosis.attempted

          return (
            <div
              key={failure.no}
              className={
                sole
                  ? 'rounded-lg bg-coral-soft px-[13px] py-[11px]'
                  : 'rounded-lg bg-surface-2 px-[13px] py-[11px]'
              }
            >
              <div
                className={
                  sole
                    ? 'mb-0.5 text-cap font-medium text-coral'
                    : 'mb-0.5 text-cap font-medium text-ink-3'
                }
              >
                {CIRCLED[failure.no]} {failure.label}
              </div>
              <div
                className={
                  sole
                    ? 'font-code text-[19px] leading-[1.5] font-medium tabular-nums text-coral'
                    : 'font-code text-[19px] leading-[1.5] font-medium tabular-nums'
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
              <p className="mt-0.5 text-cap leading-[1.6] text-ink-2">
                {failure.note}
              </p>
            </div>
          )
        })}
      </div>
      {diagnosis.verdict && (
        <p className="mx-[18px] mb-4 rounded-xl bg-lemon-soft px-[15px] py-[11px] text-ui leading-[1.7] text-lemon">
          {diagnosis.verdict}
        </p>
      )}
    </div>
  )
}
