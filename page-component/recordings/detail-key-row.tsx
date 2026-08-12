import { cn } from '@/lib/utils'

export function DetailKeyRow({
  label,
  main,
  sub,
  plain,
}: {
  label: string
  main: string
  sub?: string
  plain?: boolean
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-3 border-b border-dashed border-line py-[9px] text-ui last:border-b-0">
      <span className="w-[132px] shrink-0 text-note text-ink-3 max-[900px]:w-[110px] max-[700px]:w-full">
        {label}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn(!plain && 'font-code text-[13px]')}>{main}</span>
        {sub && (
          <small className="block text-[11px] leading-[1.7] text-ink-3">
            {sub}
          </small>
        )}
      </span>
    </div>
  )
}
