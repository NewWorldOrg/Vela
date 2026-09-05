'use client'

import { useCallback } from 'react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import type { EncodeJobsPage } from '@/repository/encode'
import { STATUS_OPTIONS } from '@/repository/encode-terms'
import { Pager } from '@/components/vela/pager'
import { SegmentedControl } from '@/components/vela/segmented-control'

const STATUS_PARAM = 'status'

const PAGE_PARAM = 'page'

const EVERY = 'all'

const OPTIONS = [{ value: EVERY, label: 'すべて' }, ...STATUS_OPTIONS]

function useJobsAddress() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(patch)) {
        if (value === null) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }

      const qs = params.toString()

      router.replace((qs ? `${pathname}?${qs}` : pathname) as Route, {
        scroll: false,
      })
    },
    [router, pathname, searchParams],
  )
}

export function JobsFilter({ jobs }: { jobs: EncodeJobsPage }) {
  const show = useJobsAddress()

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

export function JobsPager({ jobs }: { jobs: EncodeJobsPage }) {
  const show = useJobsAddress()

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
