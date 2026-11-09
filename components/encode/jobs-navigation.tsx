'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import Link from 'next/link'

import { rerunSaying } from '@/lib/encode'
import { addressWith } from '@/lib/path'
import { signedOut } from '@/lib/signed-out'
import {
  everyShownPicked,
  keepsChoosing,
  pressedPick,
  withEveryShown,
} from '@/lib/library-picking'
import type {
  EncodeJobsPage,
  EncodeRerun,
  EncodeRerunRow,
  EncodeWrite,
} from '@/repository/encode'
import { STATUS_OPTIONS } from '@/repository/encode-terms'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/vela/empty-state'
import { RebuildIcon } from '@/components/vela/icons'
import { Pager } from '@/components/vela/pager'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { useToast } from '@/components/vela/toast'
import {
  PickingBand,
  PickingBar,
  PickToggle,
  useLeaveOnEscape,
  type PickedAction,
} from '@/components/library/picking'
import { JobTable } from '@/components/encode/job-table'

const STATUS_PARAM = 'status'

const PAGE_PARAM = 'page'

const EVERY = 'all'

const OPTIONS = [{ value: EVERY, label: 'すべて' }, ...STATUS_OPTIONS]

const SIGNED_OUT = signedOut('再実行')

const NONE_PICKED: ReadonlySet<string> = new Set()

const NO_REASONS: ReadonlyMap<string, string> = new Map()

type Show = (patch: Record<string, string | null>) => void

function useJobsAddress(): [boolean, Show] {
  const router = useRouter()
  const [waiting, startWaiting] = useTransition()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const show = useCallback(
    (patch: Record<string, string | null>) => {
      startWaiting(() =>
        router.replace(
          addressWith(pathname, searchParams.toString(), patch) as Route,
          { scroll: false },
        ),
      )
    },
    [router, pathname, searchParams],
  )

  return [waiting, show]
}

interface Rerunning {
  picking: boolean
  picked: ReadonlySet<string>
  /** The ids still on the list, the ones queued again having left it. */
  shownIds: string[]
  chosen: string[]
  reasons: ReadonlyMap<string, string>
  pending: boolean
  toggle: () => void
  stop: () => void
  pick: (id: string) => void
  every: () => void
  forget: () => void
  rerun: () => void
}

function notQueued(one: EncodeRerunRow): one is EncodeRerunRow & {
  reason: string
} {
  return one.reason !== undefined
}

/** The failed jobs being chosen for `まとめて再実行`, what the press did to each row, and the rows that left the list as they were queued again. */
function useRerunning(
  ids: readonly string[],
  onRerun: (ids: string[]) => Promise<EncodeRerun>,
  focusBack: () => void,
): Rerunning {
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<ReadonlySet<string>>(NONE_PICKED)
  const [tookOne, setTookOne] = useState(false)
  const [reasons, setReasons] =
    useState<ReadonlyMap<string, string>>(NO_REASONS)
  const [gone, setGone] = useState<ReadonlySet<string>>(NONE_PICKED)
  const [pending, startTransition] = useTransition()
  const say = useToast()
  const stop = useCallback((): void => {
    setPicking(false)
    setPicked(NONE_PICKED)
    setTookOne(false)
  }, [])
  const shownIds = ids.filter((id) => !gone.has(id))
  const chosen = shownIds.filter((id) => picked.has(id))
  const settle = (next: ReadonlySet<string>): void => {
    const some = tookOne || next.size > 0

    setTookOne(some)

    if (keepsChoosing(next.size, some)) {
      setPicked(next)
    } else {
      stop()
      focusBack()
    }
  }

  useLeaveOnEscape(picking, stop)

  const rerun = (): void => {
    if (pending || chosen.length === 0) {
      return
    }

    startTransition(async () => {
      const result = await onRerun(chosen)

      if (result.state !== 'ok') {
        say({
          text:
            result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
        })

        return
      }

      const left = result.items.filter(notQueued)
      const queued = result.items.filter((one) => !notQueued(one))

      setGone(new Set([...gone, ...queued.map((one) => one.id)]))
      setReasons(new Map(left.map((one) => [one.id, one.reason])))
      stop()
      focusBack()
      say({ text: rerunSaying(queued.length, left.length) })
    })
  }

  return {
    picking,
    picked,
    shownIds,
    chosen,
    reasons,
    pending,
    toggle: () => {
      if (picking) {
        stop()
      } else {
        setReasons(NO_REASONS)
        setPicking(true)
      }
    },
    stop,
    pick: (id) => settle(pressedPick(picked, shownIds, id)),
    every: () => settle(withEveryShown(picked, shownIds)),
    forget: () => {
      stop()
      setReasons(NO_REASONS)
      setGone(NONE_PICKED)
    },
    rerun,
  }
}

export function JobsList({
  jobs,
  onCallOff,
  onRerun,
  onChoosing,
}: {
  jobs: EncodeJobsPage
  onCallOff: (id: string) => Promise<EncodeWrite>
  onRerun: (ids: string[]) => Promise<EncodeRerun>
  /** Told when the failed jobs start and stop being chosen, so the page can leave room for a phone's band. */
  onChoosing?: (choosing: boolean) => void
}) {
  const [waiting, show] = useJobsAddress()
  const pickRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const focusBack = useCallback(
    () => pickRef.current?.focus({ preventScroll: true }),
    [],
  )
  const rerunning = useRerunning(
    jobs.items.map((job) => job.id),
    onRerun,
    focusBack,
  )
  const shown = jobs.items.filter((job) => rerunning.shownIds.includes(job.id))
  const offersPicking = jobs.status === 'failed' && shown.length > 0
  const action: PickedAction = {
    label: 'まとめて再実行',
    icon: <RebuildIcon />,
    variant: 'redo',
    pending: rerunning.pending,
    enabled: rerunning.chosen.length > 0,
    onPress: rerunning.rerun,
  }
  const controls = {
    count: rerunning.chosen.length,
    everyPicked: everyShownPicked(rerunning.picked, rerunning.shownIds),
    onEvery: rerunning.every,
    actions: [action],
    subject: 'ジョブ',
  } as const
  const showAndForget: Show = (patch) => {
    rerunning.forget()
    show(patch)
  }

  useEffect(() => {
    onChoosing?.(rerunning.picking)
  }, [onChoosing, rerunning.picking])

  return (
    <>
      <JobsFilter
        jobs={jobs}
        show={showAndForget}
        pickToggle={
          offersPicking ? (
            <PickToggle
              ref={pickRef}
              pressed={rerunning.picking}
              onPress={rerunning.toggle}
            />
          ) : undefined
        }
      />
      {shown.length > 0 ? (
        <>
          <JobTable
            jobs={shown}
            onCallOff={onCallOff}
            waiting={waiting}
            picking={
              rerunning.picking
                ? { picked: rerunning.picked, onPick: rerunning.pick }
                : undefined
            }
            reasons={rerunning.reasons}
          />
          <JobsPager jobs={jobs} show={showAndForget} />
        </>
      ) : jobs.status ? (
        <EmptyState title="条件に合うジョブがありません" />
      ) : (
        <EmptyState
          title="ジョブの履歴がありません"
          action={
            <Button variant="tone" size="sm" asChild>
              <Link href="/library">ライブラリへ</Link>
            </Button>
          }
        />
      )}
      {rerunning.picking && (
        <PickingBand {...controls} className="hidden phone:flex" />
      )}
      <PickingBar
        {...controls}
        shown={rerunning.picking}
        onClose={() => {
          rerunning.stop()
          focusBack()
        }}
        closeRef={closeRef}
        className="phone:hidden"
      />
    </>
  )
}

function JobsFilter({
  jobs,
  show,
  pickToggle,
}: {
  jobs: EncodeJobsPage
  show: Show
  pickToggle?: ReactNode
}) {
  return (
    <div className="mb-2.5 flex flex-wrap items-center gap-3">
      <SegmentedControl
        aria-label="状態"
        options={OPTIONS}
        value={jobs.status ?? EVERY}
        onValueChange={(next) =>
          show({
            [STATUS_PARAM]: next === EVERY ? null : next,
            [PAGE_PARAM]: null,
          })
        }
      />
      <span className="ml-auto text-sub whitespace-nowrap text-ink-2">
        {jobs.status ? '該当' : '全'}{' '}
        <b className="font-code font-medium text-ink">{jobs.total}</b> 件
      </span>
      {pickToggle}
    </div>
  )
}

function JobsPager({ jobs, show }: { jobs: EncodeJobsPage; show: Show }) {
  if (jobs.lastPage <= 1) {
    return null
  }

  return (
    <Pager
      total={jobs.total}
      page={jobs.page}
      lastPage={jobs.lastPage}
      onPage={(page) =>
        show({ [PAGE_PARAM]: page === 1 ? null : String(page) })
      }
    />
  )
}
