import type { ComponentType, ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { SystemStatus } from '@/repository/system'
import { VelaMark } from '@/components/vela/marks'
import {
  ChannelIcon,
  ChevronRightIcon,
  EncodeIcon,
  ListIcon,
  DeviceDesktopIcon,
  LockIcon,
  QualityIcon,
  SegmentsIcon,
  SunIcon,
  TunerIcon,
  type IconProps,
} from '@/components/vela/icons'

type Tone = 'ok' | 'warn' | 'err'

/** A state that is well takes the success colour; one that wants a hand takes amber or red. */
const TONE_DOT: Record<Tone, string> = {
  ok: 'bg-accent',
  warn: 'bg-warn',
  err: 'bg-rec',
}

/** Every setting's tile is the same quiet plate: colour on this screen is kept for what is chosen, what is recording and what needs a look. */
const TILE = {
  viewing: 'bg-surface-2',
  display: 'bg-surface-2',
  encode: 'bg-surface-2',
  segments: 'bg-surface-2',
  quality: 'bg-surface-2',
  tuners: 'bg-surface-2',
  channels: 'bg-surface-2',
  keeping: 'bg-surface-2',
} as const

export interface SettingsEntranceValues {
  viewing?: string
  display?: string
}

interface Item {
  href: Route
  label: string
  icon: ComponentType<IconProps>
  tile: string
  value?: ReactNode
}

interface Group {
  name: string
  items: Item[]
}

interface Signal {
  name: ReactNode
  tone: Tone
  /** Its dot drawn while it is well too: the API's and the driver's, which say only by it. */
  dotted?: boolean
}

function apiSignal(status: SystemStatus): Signal {
  return {
    name: 'API',
    tone: status.api.state === 'ok' ? 'ok' : 'err',
    dotted: true,
  }
}

function driverTone(status: SystemStatus): Tone {
  if (status.driver.state !== 'ok') {
    return 'err'
  }

  const { connection } = status.driver.status

  if (connection === 'connected') {
    return 'ok'
  }

  return connection === 'draining' ? 'warn' : 'err'
}

function tunerTone(census: {
  faulted: number
  disabled: number
  drifted: boolean
}): Tone {
  if (census.faulted > 0) {
    return 'err'
  }

  return census.disabled > 0 || census.drifted ? 'warn' : 'ok'
}

function tunersFree(status: SystemStatus): ReactNode {
  if (status.tuners.state !== 'ok') {
    return undefined
  }

  const census = status.tuners.value
  const free = Math.max(
    0,
    census.total - census.busy - census.disabled - census.faulted,
  )

  return (
    <>
      空き <span className="tabular-nums">{free}</span> /{' '}
      <span className="tabular-nums">{census.total}</span>
    </>
  )
}

function signalsOf(status: SystemStatus): Signal[] {
  const signals: Signal[] = [
    apiSignal(status),
    { name: 'driver', tone: driverTone(status), dotted: true },
  ]
  const free = tunersFree(status)

  if (free && status.tuners.state === 'ok') {
    signals.push({
      name: <>チューナー {free}</>,
      tone: tunerTone(status.tuners.value),
    })
  }

  return signals
}

function groupsOf(
  status: SystemStatus,
  values: SettingsEntranceValues,
  hasMigration: boolean,
): Group[] {
  const keeping: Item[] = [
    {
      href: '/settings/authentication',
      label: '認証',
      icon: LockIcon,
      tile: TILE.keeping,
    },
    {
      href: '/settings/integrity',
      label: '整合性チェック',
      icon: QualityIcon,
      tile: TILE.keeping,
    },
  ]

  if (hasMigration) {
    keeping.push({
      href: '/settings/migration',
      label: '移行記録',
      icon: ListIcon,
      tile: TILE.keeping,
    })
  }

  return [
    {
      name: '観る',
      items: [
        {
          href: '/settings/viewing',
          label: '視聴',
          icon: DeviceDesktopIcon,
          tile: TILE.viewing,
          value: values.viewing,
        },
        {
          href: '/settings/display',
          label: '表示',
          icon: SunIcon,
          tile: TILE.display,
          value: values.display,
        },
      ],
    },
    {
      name: '録る',
      items: [
        {
          href: '/settings/encode',
          label: 'エンコード',
          icon: EncodeIcon,
          tile: TILE.encode,
        },
        {
          href: '/settings/segments',
          label: 'CM・OP・ED の検出',
          icon: SegmentsIcon,
          tile: TILE.segments,
        },
        {
          href: '/settings/quality',
          label: '品質',
          icon: QualityIcon,
          tile: TILE.quality,
        },
      ],
    },
    {
      name: '機器',
      items: [
        {
          href: '/settings/tuners',
          label: 'チューナー',
          icon: TunerIcon,
          tile: TILE.tuners,
          value: tunersFree(status),
        },
        {
          href: '/settings/channels',
          label: 'チャンネル',
          icon: ChannelIcon,
          tile: TILE.channels,
        },
      ],
    },
    { name: '管理', items: keeping },
  ]
}

function SystemRow({
  status,
  current,
}: {
  status: SystemStatus
  current?: string
}) {
  const here = current === '/settings/system'

  return (
    <Link
      href="/settings/system"
      aria-current={here ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg py-3.5 pr-3 pl-4 text-ink no-underline outline-none focus-visible:shadow-ring',
        'transition-[background-color] duration-[140ms] ease-toy',
        here ? 'bg-accent-tint' : 'bg-surface hover:bg-surface-2',
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-bg">
        <VelaMark small />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-title font-semibold',
            here && 'text-acc-text',
          )}
        >
          システム
        </span>
        <span className="mt-0.5 flex flex-wrap gap-x-2.5 text-sub text-ink-2 tabular-nums">
          {signalsOf(status).map((signal, nth) => (
            <span
              key={nth}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap',
                signal.tone === 'err' && 'text-rec-text',
              )}
            >
              {(signal.dotted || signal.tone !== 'ok') && (
                <span
                  aria-hidden="true"
                  className={cn('size-1.5 rounded-full', TONE_DOT[signal.tone])}
                />
              )}
              {signal.name}
            </span>
          ))}
        </span>
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-ink-3" />
    </Link>
  )
}

function ItemRow({
  item,
  current,
  withValues,
}: {
  item: Item
  current?: string
  withValues: boolean
}) {
  const Icon = item.icon
  const here = current?.startsWith(item.href) ?? false

  return (
    <li className="relative before:absolute before:top-0 before:right-0 before:left-[calc(58rem/16)] before:h-px before:bg-hair first:before:hidden">
      <Link
        href={item.href}
        aria-current={here ? 'page' : undefined}
        className={cn(
          'flex h-[calc(52rem/16)] items-center gap-3.5 pr-3 pl-4 text-ink no-underline outline-none focus-visible:shadow-ring focus-visible:-outline-offset-2',
          'transition-[background-color] duration-[140ms] ease-toy',
          here ? 'bg-accent-tint' : 'hover:bg-surface-2',
        )}
      >
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-sm text-ink-2 [&_svg]:size-4 [&_svg]:stroke-[1.9]',
            item.tile,
            here && 'bg-accent-fill text-on-accent',
          )}
        >
          <Icon />
        </span>
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-[calc(14.5rem/16)] font-medium',
            here && 'text-acc-text',
          )}
        >
          {item.label}
        </span>
        {withValues && item.value && (
          <span className="min-w-0 truncate text-ui text-ink-2 tabular-nums">
            {item.value}
          </span>
        )}
        <ChevronRightIcon className="size-4 shrink-0 text-ink-3" />
      </Link>
    </li>
  )
}

/** The way into the settings: the system's state at the head, then each setting with its value, in four groups. A phone held upright opens it as a screen of its own; anywhere else it stays at the left of the setting open, which it marks (`current`). */
export function SettingsEntranceView({
  status,
  values,
  hasMigration,
  current,
  withValues = true,
}: {
  status: SystemStatus
  values: SettingsEntranceValues
  hasMigration: boolean
  current?: string
  /** Each setting's value after its name; the wide screen leaves them to the setting open beside. */
  withValues?: boolean
}) {
  const GroupTitle = current === undefined ? 'h2' : 'p'

  return (
    <div data-slot="settings-entrance" className="pt-4 pb-6 upright:pt-1">
      {current === undefined && <h1 className="sr-only">設定</h1>}
      <SystemRow status={status} current={current} />
      {groupsOf(status, values, hasMigration).map((group) => (
        <section key={group.name} aria-labelledby={`settings-${group.name}`}>
          <GroupTitle
            id={`settings-${group.name}`}
            className="mx-4 mt-[calc(22rem/16)] mb-2 text-sub font-semibold text-ink-2"
          >
            {group.name}
          </GroupTitle>
          <ul className="overflow-hidden rounded-lg bg-surface">
            {group.items.map((item) => (
              <ItemRow
                key={item.href}
                item={item}
                current={current}
                withValues={withValues}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
