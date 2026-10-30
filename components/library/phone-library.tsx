'use client'

import { useState } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { playingOnHref } from '@/lib/playback-source'
import { formatClock, formatPlayerTime } from '@/lib/format'
import {
  byDay,
  dayHeadingOf,
  minutesLeftOf,
  watchedShareOf,
} from '@/lib/library-days'
import type { Recording, RecordingDiscarded } from '@/repository/recordings'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ChevronUpIcon,
  MoreIcon,
  PlayIcon,
  TrashIcon,
} from '@/components/vela/icons'
import { useToast } from '@/components/vela/toast'
import { pressable } from '@/components/vela/tactile'
import { RecordingThumb } from '@/components/library/recording-thumb'
import { OutcomeChip } from '@/components/recordings/outcome-chip'
import { EncodeChip } from '@/components/recordings/encode-chip'
import { LeftScrambledChip } from '@/components/recordings/left-scrambled-chip'
import { FileMissingChip } from '@/components/recordings/file-missing-chip'
import {
  holdDeletion,
  releaseDeletion,
} from '@/components/recordings/held-deletions'

/** The encode states a row names, each with the word that says it is the encode's. */
const SHOWN_ENCODE: Partial<Record<Recording['encode'], string>> = {
  queued: 'エンコード待ち',
  running: 'エンコード中',
  failed: 'エンコード失敗',
}

function recordingHref(id: string): Route {
  return `/recordings/${id}` as Route
}

function WatchedLine({ share }: { share: number | undefined }) {
  if (share === undefined) {
    return null
  }

  return (
    <span
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-1 bg-black/35"
    >
      <span
        className="block h-full bg-(--pl-accent)"
        style={{ width: `${share * 100}%` }}
      />
    </span>
  )
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
        className="px-0.5 pt-3 pb-1.5 text-note font-bold tracking-[0.06em] text-ink-3"
      >
        続きから
      </h2>
      <ul className="-mx-3.5 flex gap-3 overflow-x-auto px-4 pb-1">
        {recordings.map((recording) => {
          const left = minutesLeftOf(recording)

          return (
            <li key={recording.id} className="w-[calc(214rem/16)] shrink-0">
              <Link
                href={playingOnHref(recording.id) as Route}
                className="block text-ink no-underline outline-none focus-visible:shadow-ring"
              >
                <span className="relative block">
                  <RecordingThumb
                    recording={recording}
                    className="aspect-video h-auto w-full rounded-lg"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute bottom-3 left-2.5 flex size-9 items-center justify-center rounded-full bg-white/90 text-[#1a181e] [&_svg]:ml-0.5 [&_svg]:size-4 [&_svg]:fill-current"
                  >
                    <PlayIcon />
                  </span>
                  <WatchedLine share={watchedShareOf(recording)} />
                </span>
                <span className="mt-1.5 block truncate text-ui font-bold">
                  {recording.title}
                </span>
                <span className="block text-note text-ink-3">
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

function Attention({ recording }: { recording: Recording }) {
  const chips = [
    recording.outcome !== 'complete' && (
      <OutcomeChip key="outcome" recording={recording} />
    ),
    recording.leftScrambled && <LeftScrambledChip key="scrambled" />,
    recording.fileMissing && <FileMissingChip key="missing" />,
    SHOWN_ENCODE[recording.encode] && (
      <EncodeChip
        key="encode"
        recording={recording}
        says={SHOWN_ENCODE[recording.encode]}
      />
    ),
  ].filter(Boolean)

  if (chips.length === 0) {
    return null
  }

  return <span className="mt-1.5 flex flex-wrap gap-1.5">{chips}</span>
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
            <h2 className="flex items-center gap-2 px-4 pt-4 pb-1.5 text-note font-bold tracking-[0.06em] text-ink-3">
              {heading.near}
              <span className="font-code font-medium">{heading.date}</span>
            </h2>
            <ul className="border-y border-line bg-surface sideways:grid sideways:grid-cols-2">
              {items.map((recording) => (
                <li
                  key={recording.id}
                  data-recording={recording.id}
                  className="border-b border-dashed border-line last:border-b-0 sideways:odd:border-r sideways:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
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
                      <span className="relative shrink-0">
                        <RecordingThumb
                          recording={recording}
                          className="h-[calc(68rem/16)] w-[calc(120rem/16)]"
                        />
                        {recording.lengthSec !== undefined && (
                          <span className="absolute right-1.5 bottom-2 rounded-sm bg-black/60 px-[calc(5rem/16)] py-[calc(3rem/16)] font-code text-micro leading-none font-bold text-white">
                            {formatPlayerTime(recording.lengthSec)}
                          </span>
                        )}
                        <WatchedLine share={watchedShareOf(recording)} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-ui leading-normal font-bold">
                          {recording.title}
                        </span>
                        <span className="mt-0.5 block text-sub text-ink-3">
                          {recording.channel} ·{' '}
                          <span className="font-code">
                            {formatClock(
                              new Date(recording.startedAt).getTime(),
                            )}
                          </span>
                        </span>
                        <Attention recording={recording} />
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
                          'mt-1 mr-1 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-3 outline-none focus-visible:shadow-ring [&_svg]:size-5',
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
                    <div className="flex flex-wrap gap-2 border-t border-dashed border-line px-4 pt-3 pb-3.5">
                      <Button
                        variant="remove"
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
