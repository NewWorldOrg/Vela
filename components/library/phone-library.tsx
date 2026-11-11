'use client'

import { useState, type ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { formatClock } from '@/lib/format'
import { byDay, dayHeadingOf, watchStateOf } from '@/lib/library-days'
import type { Recording, RecordingDiscarded } from '@/repository/recordings'
import { Button } from '@/components/ui/button'
import { ChevronUpIcon, MoreIcon, TrashIcon } from '@/components/vela/icons'
import { InlineAlert } from '@/components/vela/inline-alert'
import { useToast } from '@/components/vela/toast'
import { pressable } from '@/components/vela/tactile'
import { Picture } from '@/components/library/picture'
import { type Picking } from '@/components/library/library-cards'
import { PickMark } from '@/components/library/pick-mark'
import { PickShade } from '@/components/library/pick-shade'
import { AttentionChips } from '@/components/library/attention-chips'
import {
  holdDeletion,
  releaseDeletion,
} from '@/components/recordings/held-deletions'

function recordingHref(id: string): Route {
  return `/recordings/${id}` as Route
}

/** The recordings on a phone held upright: under the day each started on, a row each of its picture with its length and the line of how far it was watched, its title, channel and time, and only the states that need attention. Pressing the row opens it; `…` opens what can be done to it under the row. */
export function PhoneRecordingRows({
  recordings,
  now,
  picking,
  onDelete,
}: {
  recordings: Recording[]
  now: Date
  picking?: Picking
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
                  {picking ? (
                    <PickedRow recording={recording} picking={picking} />
                  ) : (
                    <div className="flex items-start">
                      <Link
                        href={recordingHref(recording.id)}
                        className="flex min-w-0 flex-1 items-start gap-3 py-3 pr-1 pl-4 text-ink no-underline outline-none focus-visible:shadow-ring"
                      >
                        <RowFace recording={recording} />
                      </Link>
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
                    </div>
                  )}
                  {!picking && open === recording.id && (
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

/** What a row of the phone's list shows: the picture with its length and how far it was watched, the title, the channel and time, and the states that need attention. */
function RowFace({
  recording,
  mark,
  said,
}: {
  recording: Recording
  mark?: ReactNode
  /** Why this recording's thumbnail was not made again, said under the row while choosing. */
  said?: string
}) {
  const state = watchStateOf(recording)

  return (
    <>
      <span className="w-[calc(120rem/16)] shrink-0">
        <Picture recording={recording} corner="rounded-sm">
          {mark}
        </Picture>
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'line-clamp-2 text-ui leading-normal font-bold',
            state === 'watched' && 'text-ink-2',
          )}
        >
          {state === 'unwatched' && (
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
            {formatClock(new Date(recording.startedAt).getTime())}
          </span>
        </span>
        <AttentionChips recording={recording} className="mt-1.5" />
        {said && (
          <InlineAlert tone="warn" className="mt-1.5">
            {said}
          </InlineAlert>
        )}
      </span>
    </>
  )
}

/** A row while the library is choosing: the whole row takes the recording in or leaves it out, its mark on the picture, so nothing moves sideways. A taken row lies on the accent's tint. */
function PickedRow({
  recording,
  picking,
}: {
  recording: Recording
  picking: Picking
}) {
  const taken = picking.picked.has(recording.id)

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={taken}
      aria-label={`${recording.title} を選ぶ`}
      onClick={(event) => picking.onPick(recording.id, event.shiftKey)}
      className={cn(
        'flex min-w-0 cursor-pointer items-start gap-3 rounded-xl py-3 pr-[calc(44rem/16)] text-left text-ink outline-none select-none focus-visible:shadow-ring',
        'mx-2 w-[calc(100%-1rem)] pl-2 transition-[background-color] duration-[140ms] ease-toy',
        taken && 'bg-accent-tint',
      )}
    >
      <RowFace
        recording={recording}
        said={picking.said?.get(recording.id)}
        mark={
          <>
            <PickShade />
            <PickMark taken={taken} size="phone" />
          </>
        }
      />
    </button>
  )
}
