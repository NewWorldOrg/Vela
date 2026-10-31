'use client'

import { useState } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { playingOnHref } from '@/lib/playback-source'
import { formatClock } from '@/lib/format'
import {
  byDay,
  dayHeadingOf,
  minutesLeftOf,
  watchStateOf,
} from '@/lib/library-days'
import type { Recording, RecordingDiscarded } from '@/repository/recordings'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronUpIcon, MoreIcon, TrashIcon } from '@/components/vela/icons'
import { useToast } from '@/components/vela/toast'
import { pressable } from '@/components/vela/tactile'
import { Picture } from '@/components/library/library-cards'
import { AttentionChips } from '@/components/library/attention-chips'
import {
  holdDeletion,
  releaseDeletion,
} from '@/components/recordings/held-deletions'

function recordingHref(id: string): Route {
  return `/recordings/${id}` as Route
}

/** The recordings left part-way, across the phone in a row that is sent sideways: each opens where it was left. */
export function PhoneContinue({ recordings }: { recordings: Recording[] }) {
  if (recordings.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="library-continue" data-slot="phone-continue">
      <h2
        id="library-continue"
        className="px-0.5 pt-3 pb-2 text-heading font-bold tracking-[-0.015em] text-ink"
      >
        続きから
      </h2>
      <ul className="-mx-3.5 flex gap-3 overflow-x-auto px-4 pb-1">
        {recordings.map((recording) => {
          const left = minutesLeftOf(recording)

          return (
            <li key={recording.id} className="w-[calc(232rem/16)] shrink-0">
              <Link
                href={playingOnHref(recording.id) as Route}
                className="block text-ink no-underline outline-none focus-visible:shadow-ring"
              >
                <Picture
                  recording={recording}
                  corner="rounded-md"
                  lengthShown={false}
                />
                <span className="mt-2 block truncate text-ui font-bold">
                  {recording.title}
                </span>
                <span className="block text-note text-ink-2">
                  {recording.channel}
                  {left !== undefined && (
                    <>
                      {' · '}残り <span className="font-code">{left}</span> 分
                    </>
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** The recordings on a phone held upright: under the day each started on, a row each of its picture with its length and the line of how far it was watched, its title, channel and time, and only the states that need attention. Pressing the row opens it; `…` opens what can be done to it under the row. */
export function PhoneRecordingRows({
  recordings,
  now,
  picking,
  picked,
  onPick,
  onDelete,
}: {
  recordings: Recording[]
  now: Date
  picking: boolean
  picked: ReadonlySet<string>
  onPick: (picked: Set<string>) => void
  onDelete: (id: string) => Promise<RecordingDiscarded>
}) {
  const [open, setOpen] = useState<string>()
  const say = useToast()
  const router = useRouter()

  const deleteWhenTheToastLeaves = (recording: Recording): void => {
    const { id } = recording

    setOpen(undefined)
    holdDeletion(id)
    say({
      text: `録画を削除しました　${recording.title}`,
      action: { label: '元に戻す', onPress: () => releaseDeletion(id) },
      onExpire: () => {
        void onDelete(id).then((result) => {
          releaseDeletion(id)
          router.refresh()

          if (result.state === 'rejected') {
            say({ text: result.message })
          }
        })
      },
    })
  }

  const pick = (id: string, taken: boolean): void => {
    const next = new Set(picked)

    if (taken) {
      next.add(id)
    } else {
      next.delete(id)
    }

    onPick(next)
  }

  return (
    <div data-slot="phone-recording-rows" className="-mx-3.5">
      {byDay(recordings).map(({ day, items }) => {
        const heading = dayHeadingOf(day, now)

        return (
          <section key={day} aria-label={heading.near ?? heading.date}>
            <h2 className="flex items-baseline gap-2 px-4 pt-5 pb-1 text-title font-bold tracking-[-0.015em] text-ink">
              {heading.near}
              <span
                className={cn(
                  'font-code',
                  heading.near && 'text-sub font-medium text-ink-2',
                )}
              >
                {heading.date}
              </span>
            </h2>
            <ul className="sideways:grid sideways:grid-cols-2">
              {items.map((recording) => (
                <li
                  key={recording.id}
                  data-keep={recording.id}
                  data-recording={recording.id}
                  className="min-w-0"
                >
                  <div className="flex items-start">
                    {picking && (
                      <label className="flex h-[calc(92rem/16)] w-12 shrink-0 items-center justify-center pl-2">
                        <Checkbox
                          aria-label={`${recording.title} を選ぶ`}
                          checked={picked.has(recording.id)}
                          onCheckedChange={(on) =>
                            pick(recording.id, on === true)
                          }
                        />
                      </label>
                    )}
                    <Link
                      href={recordingHref(recording.id)}
                      className={cn(
                        'flex min-w-0 flex-1 items-start gap-3 py-3 pr-1 text-ink no-underline outline-none focus-visible:shadow-ring',
                        picking ? 'pl-1' : 'pl-4',
                      )}
                    >
                      <span className="w-[calc(120rem/16)] shrink-0">
                        <Picture recording={recording} corner="rounded-sm" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'line-clamp-2 text-ui leading-normal font-bold',
                            watchStateOf(recording) === 'watched' &&
                              'text-ink-2',
                          )}
                        >
                          {watchStateOf(recording) === 'unwatched' && (
                            <span
                              data-slot="unwatched-dot"
                              className="mr-1.5 mb-[0.12em] inline-block size-1.5 rounded-full bg-accent"
                            >
                              <span className="sr-only">未視聴</span>
                            </span>
                          )}
                          {recording.title}
                        </span>
                        <span className="mt-0.5 block text-sub text-ink-2">
                          {recording.channel} ·{' '}
                          <span className="font-code">
                            {formatClock(
                              new Date(recording.startedAt).getTime(),
                            )}
                          </span>
                        </span>
                        <AttentionChips
                          recording={recording}
                          className="mt-1.5"
                        />
                      </span>
                    </Link>
                    {!picking && (
                      <button
                        type="button"
                        aria-label="この録画の操作"
                        aria-expanded={open === recording.id}
                        onClick={() =>
                          setOpen(
                            open === recording.id ? undefined : recording.id,
                          )
                        }
                        className={cn(
                          'mt-1 mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 outline-none focus-visible:shadow-ring [&_svg]:size-5',
                          pressable,
                        )}
                      >
                        {open === recording.id ? (
                          <ChevronUpIcon />
                        ) : (
                          <MoreIcon />
                        )}
                      </button>
                    )}
                  </div>
                  {open === recording.id && (
                    <div className="mx-4 mb-2 flex flex-wrap gap-2 rounded-md bg-surface px-3 py-3">
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={recording.outcome === 'recording'}
                        title={
                          recording.outcome === 'recording'
                            ? '録画中のため、削除できません。'
                            : undefined
                        }
                        onClick={() => deleteWhenTheToastLeaves(recording)}
                      >
                        <TrashIcon />
                        削除
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
