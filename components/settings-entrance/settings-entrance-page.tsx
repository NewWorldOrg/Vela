import type { ComponentType, ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { SystemStatus } from '@/repository/system'
import { VelaMark } from '@/components/vela/marks'
import {
  ChannelIcon,
  ChevronRightIcon,
  DisplayIcon,
  EncodeIcon,
  KeyIcon,
  ListIcon,
  PlayIcon,
  QualityIcon,
  SegmentsIcon,
  TunerIcon,
  type IconProps,
} from '@/components/vela/icons'

type Tone = 'ok' | 'warn' | 'err'

const TONE_DOT: Record<Tone, string> = {
  ok: 'bg-mint',
  warn: 'bg-lemon',
  err: 'bg-coral',
}

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
}

function apiSignal(status: SystemStatus): Signal {
  return { name: 'API', tone: status.api.state === 'ok' ? 'ok' : 'err' }
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
      空き <span className="font-code">{free}</span> /{' '}
      <span className="font-code">{census.total}</span>
    </>
  )
}

function signalsOf(status: SystemStatus): Signal[] {
  const signals: Signal[] = [
    apiSignal(status),
    { name: 'driver', tone: driverTone(status) },
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
      icon: KeyIcon,
      tile: 'bg-surface-2',
    },
  ]

  if (hasMigration) {
    keeping.push({
      href: '/settings/migration',
      label: '移行記録',
      icon: ListIcon,
      tile: 'bg-surface-2',
    })
  }

  return [
    {
      name: '観る',
      items: [
        {
          href: '/settings/viewing',
          label: '視聴',
          icon: PlayIcon,
          tile: 'bg-tint-sky',
          value: values.viewing,
        },
        {
          href: '/settings/display',
          label: '表示',
          icon: DisplayIcon,
          tile: 'bg-tint-lavender',
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
          tile: 'bg-tint-sage',
        },
        {
          href: '/settings/segments',
          label: 'CM・OP・ED の検出',
          icon: SegmentsIcon,
          tile: 'bg-tint-butter',
        },
        {
          href: '/settings/quality',
          label: '品質',
          icon: QualityIcon,
          tile: 'bg-tint-salmon',
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
          tile: 'bg-tint-blush',
          value: tunersFree(status),
        },
        {
          href: '/settings/channels',
          label: 'チャンネル',
          icon: ChannelIcon,
          tile: 'bg-tint-sky',
        },
      ],
    },
    { name: '管理', items: keeping },
  ]
}

function SystemRow({ status }: { status: SystemStatus }) {
  return (
    <Link
      href="/settings/system"
      className="flex items-center gap-3 rounded-xl border border-line bg-surface py-3 pr-2 pl-3.5 text-ink no-underline outline-none focus-visible:shadow-ring"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-2">
        <VelaMark className="size-[calc(26rem/16)]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="heading block text-h3 leading-normal">システム</span>
        <span className="flex flex-wrap gap-x-2.5 text-note text-ink-2">
          {signalsOf(status).map((signal, nth) => (
            <span key={nth} className="flex items-center gap-[calc(5rem/16)]">
              <span
                aria-hidden="true"
                className={cn(
                  'size-[calc(7rem/16)] rounded-full',
                  TONE_DOT[signal.tone],
                )}
              />
              {signal.name}
            </span>
          ))}
        </span>
      </span>
      <ChevronRightIcon className="size-[calc(18rem/16)] shrink-0 text-ink-3" />
    </Link>
  )
}

function ItemRow({ item }: { item: Item }) {
  const Icon = item.icon

  return (
    <li className="border-b border-dashed border-line last:border-b-0">
      <Link
        href={item.href}
        className="flex h-[calc(54rem/16)] items-center gap-3 pr-2 pl-3 text-ink no-underline outline-none focus-visible:shadow-ring"
      >
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-md text-ink-2 [&_svg]:size-[calc(18rem/16)]',
            item.tile,
          )}
        >
          <Icon />
        </span>
        <span className="min-w-0 flex-1 truncate text-ui font-bold">
          {item.label}
        </span>
        {item.value && (
          <span className="min-w-0 truncate text-note text-ink-3">
            {item.value}
          </span>
        )}
        <ChevronRightIcon className="size-[calc(18rem/16)] shrink-0 text-ink-3" />
      </Link>
    </li>
  )
}

/** The way into the settings on a phone held upright: the system's state at the head, then each setting with its value, in four groups. */
export function SettingsEntranceView({
  status,
  values,
  hasMigration,
}: {
  status: SystemStatus
  values: SettingsEntranceValues
  hasMigration: boolean
}) {
  return (
    <div data-slot="settings-entrance" className="pt-1 pb-4">
      <h1 className="sr-only">設定</h1>
      <SystemRow status={status} />
      {groupsOf(status, values, hasMigration).map((group) => (
        <section key={group.name} aria-labelledby={`settings-${group.name}`}>
          <h2
            id={`settings-${group.name}`}
            className="px-0.5 pt-4 pb-1.5 text-note font-bold tracking-[0.06em] text-ink-3"
          >
            {group.name}
          </h2>
          <ul className="overflow-hidden rounded-xl border border-line bg-surface">
            {group.items.map((item) => (
              <ItemRow key={item.href} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
