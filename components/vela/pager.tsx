'use client'

import { cn } from '@/lib/utils'
import { IconButton } from '@/components/vela/icon-button'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/vela/icons'

export function pageNumbers(current: number, last: number): (number | 'gap')[] {
  const wanted = [1, current - 1, current, current + 1, last]
  const items: (number | 'gap')[] = []
  let previous = 0

  for (let n = 1; n <= last; n++) {
    if (!wanted.includes(n)) {
      continue
    }
    if (n - previous > 1) {
      items.push('gap')
    }
    items.push(n)
    previous = n
  }

  return items
}

export function Pager({
  total,
  page,
  lastPage,
  onPage,
  className,
}: {
  total: number
  page: number
  lastPage: number
  onPage: (page: number) => void
  className?: string
}) {
  return (
    <div
      data-slot="pager"
      className={cn(
        'mt-3 flex flex-wrap items-center gap-4 border-t border-dashed border-line pt-3.5',
        className,
      )}
    >
      <span className="mr-auto pr-3 text-sub text-ink-2">
        全 <b className="font-code font-medium text-ink">{total}</b> 件 /{' '}
        <b className="font-code font-medium text-ink">{lastPage}</b> ページ中{' '}
        <b className="font-code font-medium text-ink">{page}</b> ページ目
      </span>
      <IconButton
        size="sm"
        aria-label="前のページ"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeftIcon />
      </IconButton>
      {pageNumbers(page, lastPage).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="px-0.5 font-code text-ink-3">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-label={`${item} ページ目`}
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onPage(item)}
            className={cn(
              'tap-target flex h-[29px] min-w-[29px] cursor-pointer items-center justify-center rounded-full border px-2.5 font-code text-sub shadow-pop transition-[translate,box-shadow,color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-lg active:translate-x-px active:translate-y-px active:shadow-pop-none',
              item === page
                ? 'border-btn-fill bg-btn-fill text-on-btn'
                : 'border-line-strong bg-surface text-ink-2 hover:text-ink',
            )}
          >
            {item}
          </button>
        ),
      )}
      <IconButton
        size="sm"
        aria-label="次のページ"
        disabled={page >= lastPage}
        onClick={() => onPage(page + 1)}
      >
        <ChevronRightIcon />
      </IconButton>
    </div>
  )
}
