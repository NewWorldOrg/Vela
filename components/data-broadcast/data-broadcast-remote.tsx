'use client'

import type { BmlKey } from '@/lib/bml/keys'
import { cn } from '@/lib/utils'
import { DataBroadcastIcon } from '@/components/vela/icons'
import {
  type Pressing,
  KEYPAD_NAME,
  HYBRIDCAST_NAME,
  CLOSE_HYBRIDCAST_NAME,
  PILL,
  DATA_BROADCAST_NAME,
  aiming,
  KEY_LOOK,
} from '@/components/data-broadcast/data-broadcast-palette'
import { StationLine } from '@/components/data-broadcast/station-line'
import { Disc } from '@/components/data-broadcast/disc'
import { Colours } from '@/components/data-broadcast/colours'

const IN_THE_COLUMN = cn(
  '[--disc:184px] [--wedge:101.5px] [--reach:61px] [--arrow:30px] [--ok:65px] [--ok-font:15px] [--pill-h:44px] [--pill-w:64px] [--pill-font:13px] [--dot:52px] [--pitch:70px] [--line-font:13px] [--digit-font:17px] [--digit-h:48px] [--digit-row-gap:14px] [--group-gap:24px] [--under-disc:12px]',
  '[@media(height<900px)]:[--disc:152px] [@media(height<900px)]:[--wedge:84px] [@media(height<900px)]:[--reach:50px] [@media(height<900px)]:[--arrow:25px] [@media(height<900px)]:[--ok:54px] [@media(height<900px)]:[--ok-font:13px] [@media(height<900px)]:[--dot:44px] [@media(height<900px)]:[--pitch:60px] [@media(height<900px)]:[--digit-h:44px] [@media(height<900px)]:[--digit-row-gap:10px] [@media(height<900px)]:[--group-gap:16px] [@media(height<900px)]:[--under-disc:8px]',
)

const DIGIT_GRID: (BmlKey | null)[] = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  null,
  '0',
  null,
]

export function DataBroadcastRemote({
  station,
  onKey,
  onAim,
  onToggle,
  application = null,
  className,
}: {
  station: string
  onKey: (key: BmlKey) => void
  onAim: () => void
  onToggle: () => void
  application?: { onClose: () => void } | null
  className?: string
}) {
  const pressing: Pressing = { onKey, onAim }

  return (
    <div
      role="group"
      aria-label={KEYPAD_NAME}
      data-slot="data-broadcast-remote"
      className={cn(
        IN_THE_COLUMN,
        'flex flex-col gap-y-(--group-gap) rounded-xl bg-(--pl-bg) p-[calc(20*var(--px))] text-(--pl-ink)',
        className,
      )}
    >
      <div className="flex h-[calc(44*var(--px))] shrink-0 items-center gap-[calc(12*var(--px))]">
        {application ? (
          <div
            role="group"
            aria-label={HYBRIDCAST_NAME}
            data-slot="hybridcast-on-the-band"
            className="flex min-w-0 flex-1 items-center gap-[calc(12*var(--px))]"
          >
            <StationLine
              station={station}
              what={HYBRIDCAST_NAME}
              className="min-w-0 flex-1 text-[length:var(--line-font)]"
            />
            <button
              type="button"
              aria-label={CLOSE_HYBRIDCAST_NAME}
              onMouseDown={(event) => {
                event.preventDefault()
                onAim()
              }}
              onClick={application.onClose}
              className={PILL}
            >
              閉じる
            </button>
          </div>
        ) : (
          <StationLine
            station={station}
            what={DATA_BROADCAST_NAME}
            className="text-[length:var(--line-font)]"
          />
        )}
      </div>
      <div
        data-slot="remote-cross"
        className="flex shrink-0 flex-col items-center gap-y-(--under-disc)"
      >
        <Disc pressing={pressing} />
        <div
          data-slot="remote-utility"
          className="flex w-(--disc) items-center justify-between"
        >
          <button
            type="button"
            aria-label="戻る"
            onMouseDown={aiming(pressing)}
            onClick={() => onKey('back')}
            className={PILL}
          >
            戻る
          </button>
          <button
            type="button"
            aria-label={DATA_BROADCAST_NAME}
            onMouseDown={(event) => {
              event.preventDefault()
              onAim()
            }}
            onClick={onToggle}
            className={cn(PILL, '[&_svg]:size-6')}
          >
            <DataBroadcastIcon />
          </button>
        </div>
      </div>
      <div className="flex shrink-0 justify-center">
        <Colours pressing={pressing} />
      </div>
      <div
        role="group"
        aria-label="数字"
        className="mx-auto grid w-full max-w-[calc(330*var(--px))] shrink-0 grid-cols-3 gap-x-[calc(18*var(--px))] gap-y-(--digit-row-gap)"
      >
        {DIGIT_GRID.map((digit, nth) =>
          digit === null ? (
            <i key={`gap-${nth}`} aria-hidden />
          ) : (
            <button
              key={digit}
              type="button"
              onMouseDown={aiming(pressing)}
              onClick={() => onKey(digit)}
              className={cn(
                KEY_LOOK,
                'h-(--digit-h) w-full font-code text-[length:var(--digit-font)] leading-none after:absolute after:-inset-[2px] after:content-[""]',
              )}
            >
              {digit}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
