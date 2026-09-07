'use client'

import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type {
  CandidateTuning,
  ServiceRow,
  WriteResult,
} from '@/repository/services'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ADMIN_LIST_HEIGHT_CAP } from '@/components/vela/app-shell'
import { ChevronRightIcon } from '@/components/vela/icons'
import { CandidateList } from '@/components/channels/candidate-list'
import { cn } from '@/lib/utils'

const SERVICE_COLUMNS: { label: string; hidden?: boolean }[] = [
  { label: '候補チャンネルの開閉', hidden: true },
  { label: 'サービス' },
  { label: '区分' },
  { label: '現在の物理ch' },
  { label: '候補' },
  { label: '有効' },
  { label: '最終確認' },
  { label: '状態', hidden: true },
]

export interface CandidateActions {
  onSelect: (
    serviceKey: string,
    candidateChannelId: string,
  ) => Promise<WriteResult>
  onAdd: (serviceKey: string, tuning: CandidateTuning) => Promise<WriteResult>
  onDelete: (
    serviceKey: string,
    candidateChannelId: string,
  ) => Promise<WriteResult>
}

interface Unfolded {
  open?: string
  folding?: string
  toggle: (serviceKey: string) => void
  settle: (serviceKey: string) => void
}

const UnfoldedService = createContext<Unfolded | null>(null)

function foldsGradually() {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function UnfoldingServices({ children }: { children: ReactNode }) {
  const [unfolded, setUnfolded] = useState<{ open?: string; folding?: string }>(
    {},
  )

  return (
    <UnfoldedService
      value={{
        ...unfolded,
        toggle: (serviceKey) =>
          setUnfolded(({ open }) => {
            const next = open === serviceKey ? undefined : serviceKey

            return {
              open: next,
              folding:
                open !== undefined && open !== next && foldsGradually()
                  ? open
                  : undefined,
            }
          }),
        settle: (serviceKey) =>
          setUnfolded((held) =>
            held.folding === serviceKey
              ? { open: held.open, folding: undefined }
              : held,
          ),
      }}
    >
      {children}
    </UnfoldedService>
  )
}

function useUnfolded(): Unfolded {
  const held = use(UnfoldedService)

  if (held === null) {
    throw new Error(
      'A service table unfolds through the provider above it, and there is none.',
    )
  }

  return held
}

function CategoryBadge({ service }: { service: ServiceRow }) {
  return (
    <Badge variant={service.minorCategory ? 'kindData' : 'kindTv'}>
      {service.category}
    </Badge>
  )
}

function UnfoldedCandidates({
  service,
  actions,
  expanded,
  onSettle,
}: {
  service: ServiceRow
  actions: CandidateActions
  expanded: boolean
  onSettle: (serviceKey: string) => void
}) {
  const fold = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = fold.current

    if (expanded || element === null) {
      return
    }

    const shut = getComputedStyle(element).gridTemplateRows === '0px'

    if (shut || element.getAnimations().length === 0) {
      onSettle(service.key)
    }
  }, [expanded, onSettle, service.key])

  return (
    <TableRow className="[&:last-child_[data-slot=unfold-body]]:border-b-0">
      <TableCell colSpan={SERVICE_COLUMNS.length} className="border-0 p-0">
        <div
          ref={fold}
          data-slot="unfold"
          inert={!expanded}
          onTransitionEnd={(event) => {
            if (
              event.target === event.currentTarget &&
              event.propertyName === 'grid-template-rows'
            ) {
              onSettle(service.key)
            }
          }}
          className={cn(
            'grid transition-[grid-template-rows] duration-150 ease-toy motion-reduce:transition-none',
            expanded
              ? 'grid-rows-[1fr] starting:grid-rows-[0fr]'
              : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden">
            <div
              data-slot="unfold-body"
              className="border-b border-dashed border-line bg-surface-2 py-3.5 pr-[18px] pl-10"
            >
              <CandidateList
                serviceKey={service.key}
                serviceName={service.name}
                candidates={service.candidates}
                {...actions}
              />
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function ServiceTable({
  services,
  actions,
}: {
  services: ServiceRow[]
  actions: CandidateActions
}) {
  const { open, folding, toggle, settle } = useUnfolded()

  return (
    <Table
      className="min-w-[860px]"
      containerClassName={cn(ADMIN_LIST_HEIGHT_CAP, 'overflow-y-auto pb-1')}
    >
      <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10">
        <TableRow>
          {SERVICE_COLUMNS.map((column) => (
            <TableHead key={column.label}>
              {column.hidden ? (
                <span className="sr-only">{column.label}</span>
              ) : (
                column.label
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((service) => {
          const expanded = open === service.key
          const mounted = expanded || folding === service.key

          return [
            <TableRow
              key={service.key}
              className="has-aria-expanded:bg-transparent"
            >
              <TableCell className="w-6">
                <button
                  type="button"
                  aria-label={`${service.name} の候補チャンネル`}
                  aria-expanded={expanded}
                  onClick={() => toggle(service.key)}
                  className="tap-target inline-flex cursor-pointer text-ink-3 hover:text-ink"
                >
                  <ChevronRightIcon
                    className={cn(
                      'size-3.5 transition-transform duration-150 ease-toy motion-reduce:transition-none',
                      expanded && 'rotate-90',
                    )}
                  />
                </button>
              </TableCell>
              <TableCell>
                <b className="text-[13px] font-bold">{service.name}</b>
                <span className="ml-2 font-code text-cap text-ink-3">
                  {service.sid}
                </span>
              </TableCell>
              <TableCell>
                <CategoryBadge service={service} />
              </TableCell>
              <TableCell>
                {service.currentChannel === undefined ? (
                  <span className="text-ui font-bold text-lemon">
                    選局先なし
                  </span>
                ) : (
                  <span className="font-code font-medium tabular-nums">
                    {service.currentChannel}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <span className="font-code tabular-nums text-ink-2">
                  {service.candidateCount}
                </span>
                {service.needsAttentionCount > 0 && (
                  <span className="ml-1.5 text-sub text-lemon">
                    (要確認 {service.needsAttentionCount})
                  </span>
                )}
              </TableCell>
              <TableCell>
                <span
                  className={
                    service.enabled
                      ? 'text-ui font-medium text-ink'
                      : 'text-ui text-ink-3'
                  }
                >
                  {service.enabled ? '有効' : '無効'}
                </span>
              </TableCell>
              <TableCell className="font-code text-sub whitespace-nowrap text-ink-2">
                {service.lastSeen}
              </TableCell>
              <TableCell>
                {service.currentChannel === undefined ? (
                  <Badge variant="warn" className="font-bold">
                    要対応
                  </Badge>
                ) : (
                  service.betterChannel !== undefined && (
                    <Badge variant="sky" className="font-bold">
                      実測上位の候補 {service.betterChannel}
                    </Badge>
                  )
                )}
              </TableCell>
            </TableRow>,
            mounted && (
              <UnfoldedCandidates
                key={`${service.key}-candidates`}
                service={service}
                actions={actions}
                expanded={expanded}
                onSettle={settle}
              />
            ),
          ]
        })}
      </TableBody>
    </Table>
  )
}
