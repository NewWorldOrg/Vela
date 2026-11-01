import { formatClock } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Reservation } from '@/repository/reservations'
import type { TunerRow } from '@/repository/tuners'

interface TunerChip {
  id: string
  label: string
  state: string
  busy: boolean
}

/** The tuners that can record, leaving out the ones turned off or at fault, each named by its kind and, where there are several of a kind, its place among them, with what it is doing now. */
export function tunerChipsOf(rows: readonly TunerRow[]): TunerChip[] {
  const usable = rows.filter(
    (row) => row.enabled && row.kind && row.state !== 'faulted',
  )
  const ofKind = (kind: TunerRow['kind']) =>
    usable.filter((row) => row.kind === kind)

  return usable.map((row) => {
    const kin = ofKind(row.kind)
    const label =
      kin.length > 1 ? `${row.kind} ${kin.indexOf(row) + 1}` : `${row.kind}`
    const recording = row.session?.tone === 'recording'

    return {
      id: row.id,
      label,
      state: recording ? '録画中' : (row.session?.label ?? '空き'),
      busy: row.session !== undefined,
    }
  })
}

/** The reservation that records next, with the time it starts and the tuners as they stand. */
export function NextRecording({
  reservations,
  tuners,
}: {
  reservations: readonly Reservation[]
  tuners?: readonly TunerRow[]
}) {
  const next = reservations.find(
    (one) => one.standing === 'scheduled' && one.span,
  )
  const chips = tuners ? tunerChipsOf(tuners) : []

  if (!next?.span) {
    return null
  }

  return (
    <section
      data-slot="next-recording"
      aria-labelledby="next-recording-heading"
      className="rounded-xl bg-surface px-[calc(18rem/16)] pt-4 pb-[calc(18rem/16)]"
    >
      <h2
        id="next-recording-heading"
        className="text-sub font-semibold text-ink-2"
      >
        次の録画
      </h2>
      <p className="mt-1.5 truncate text-title font-semibold text-ink">
        {next.title}
      </p>
      <p className="mt-0.5 text-sub text-ink-2">
        {next.channelName} ·{' '}
        <span className="font-code tabular-nums">
          {formatClock(new Date(next.span.startAt).getTime())}
        </span>{' '}
        から
      </p>
      {chips.length > 0 && (
        <ul
          aria-label="チューナー"
          className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(calc(96rem/16),1fr))] gap-1.5"
        >
          {chips.map((chip) => (
            <li
              key={chip.id}
              className={cn(
                'flex h-[calc(30rem/16)] items-center justify-center truncate rounded-sm px-2 text-note font-semibold',
                chip.busy
                  ? 'bg-raised text-ink shadow-[0_0_0_1px_var(--hair)]'
                  : 'bg-surface-2 text-ink-2',
              )}
            >
              {chip.label} · {chip.state}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
