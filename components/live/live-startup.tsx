import { cn } from '@/lib/utils'
import { startupRowsOf } from '@/lib/live-startup'
import type { LiveStartup } from '@/lib/live-wire'
import { CheckIcon } from '@/components/vela/icons'
import { Spinner } from '@/components/vela/progress'

/**
 * The plate over the picture while the channel is being brought up: what has
 * been reached, what is underway, and how long each has taken.
 */
export function LiveStartupSteps({
  startup,
  elapsedMs,
  className,
}: {
  startup: LiveStartup
  /** Since the wire was opened, on the browser's own clock. */
  elapsedMs: number
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
      <Spinner className="mb-2.5 size-7 text-(--pl-accent)" />
      <b className="heading text-[14.5px]">チャンネルを準備しています</b>
      <ol className="mt-3 flex w-[300px] max-w-full flex-col gap-[7px] text-left text-sub">
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
                  'border-[#9FD9BE] bg-[#9FD9BE] text-(--pl-video)',
                row.state === 'now' && 'border-dashed border-(--pl-accent)',
              )}
            >
              {row.state === 'done' && <CheckIcon className="size-2.5" />}
            </span>
            {row.label}
            <span className="ml-auto font-code text-[11px]">{row.figure}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
