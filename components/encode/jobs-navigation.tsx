'use client'

import { useCallback, useTransition } from 'react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import Link from 'next/link'

import { addressWith } from '@/lib/path'
import type { EncodeJobsPage, EncodeWrite } from '@/repository/encode'
import { STATUS_OPTIONS } from '@/repository/encode-terms'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/vela/empty-state'
import { Pager } from '@/components/vela/pager'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { JobTable } from '@/components/encode/job-table'

const STATUS_PARAM = 'status'

const PAGE_PARAM = 'page'

const EVERY = 'all'

const OPTIONS = [{ value: EVERY, label: 'すべて' }, ...STATUS_OPTIONS]

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

export function JobsList({
  jobs,
  onCallOff,
}: {
  jobs: EncodeJobsPage
  onCallOff: (id: string) => Promise<EncodeWrite>
}) {
  const [waiting, show] = useJobsAddress()

  return (
    <>
      <JobsFilter jobs={jobs} show={show} />
      {jobs.items.length > 0 ? (
        <>
          <JobTable jobs={jobs.items} onCallOff={onCallOff} waiting={waiting} />
          <JobsPager jobs={jobs} show={show} />
        </>
      ) : jobs.status ? (
        <EmptyState spot="tape" title="条件に合うジョブがありません" />
      ) : (
        <EmptyState
          spot="tape"
          title="ジョブの履歴がありません"
          action={
            <Button variant="watch" size="sm" asChild>
              <Link href="/library">ライブラリを開く</Link>
            </Button>
          }
        />
      )}
    </>
  )
}

function JobsFilter({ jobs, show }: { jobs: EncodeJobsPage; show: Show }) {
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
