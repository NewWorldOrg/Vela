import { cn } from '@/lib/utils'
import { startupRowsOf } from '@/lib/live-startup'
import type { LiveStartup } from '@/lib/live-wire'
import { CheckIcon } from '@/components/vela/icons'
import { Spinner } from '@/components/vela/progress'

/**
 * The plate over the picture while the channel is being brought up: what has
 * been reached, what is underway, and how long each has taken.
 *
 * A wire opened again after one was lost is the same startup with a different
 * name over it — 再接続中, and which attempt this is — so that a reader who
 * pressed 再試行 can tell the picture coming back from a channel being tuned
 * for the first time. Nothing here counts down: the wire is only ever reopened
 * by a press, so there is no next attempt to say the time until.
 */
export function LiveStartupSteps({
  startup,
  elapsedMs,
  reconnecting,
  className,
}: {
  startup: LiveStartup
  /** Since the wire was opened, on the browser's own clock. */
  elapsedMs: number
  /** Which retry this is, when the wire before it was lost. */
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
      <b className="heading text-[14.5px]">
        {reconnecting === undefined ? 'チャンネルを準備しています' : '再接続中'}
      </b>
      {reconnecting !== undefined && (
        <span className="mt-1 font-code text-[11.5px] text-(--pl-ink-2)">
          {reconnecting} 回目
        </span>
      )}
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
