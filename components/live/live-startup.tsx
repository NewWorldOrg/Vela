import { cn } from '@/lib/utils'
import { startupRowsOf } from '@/lib/live-startup'
import type { LiveStartup } from '@/lib/live-wire'
import { CheckIcon } from '@/components/vela/icons'
import { Spinner } from '@/components/vela/progress'

export function LiveStartupSteps({
  startup,
  elapsedMs,
  reconnecting,
  className,
}: {
  startup: LiveStartup
  elapsedMs: number
  reconnecting?: number
  className?: string
}) {
  return (
    <div
      role="status"
      className={cn(
        'pointer-events-none absolute inset-0 m-auto flex h-fit w-fit max-w-[88%] flex-col items-center rounded-2xl border border-white/25 bg-black/80 px-6 py-5 text-center text-(--pl-ink)',
        className,
      )}
    >
      <Spinner
        className={cn(
          'mb-2.5 size-7',
          reconnecting === undefined
            ? 'text-(--pl-accent)'
            : 'text-(--pl-lemon)',
        )}
      />
      <b className="heading text-[calc(14.5rem/16)]">
        {reconnecting === undefined ? 'チャンネルを準備しています' : '再接続中'}
      </b>
      {reconnecting !== undefined && (
        <span className="mt-1 font-code text-note text-(--pl-ink-2)">
          {reconnecting} 回目
        </span>
      )}
      <ol className="mt-3 flex w-[calc(300rem/16)] max-w-full flex-col gap-[calc(7rem/16)] text-left text-sub">
        {startupRowsOf(startup, elapsedMs).map((row) => (
          <li
            key={row.segment}
            data-startup={row.state}
            className={cn(
              'flex items-center gap-2.5 text-(--pl-ink-3)',
              row.state === 'done' && 'text-(--pl-ink-2)',
              row.state === 'now' && 'text-(--pl-ink)',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-white/25',
                row.state === 'done' &&
                  'border-(--pl-done) bg-(--pl-done) text-(--pl-video)',
                row.state === 'now' && 'border-dashed border-(--pl-accent)',
              )}
            >
              {row.state === 'done' && <CheckIcon className="size-2.5" />}
            </span>
            {row.label}
            <span className="ml-auto font-code text-cap">{row.figure}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
