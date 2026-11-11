'use client'

import { type CSSProperties } from 'react'

import type { BmlKey } from '@/lib/bml/keys'
import type { BandPlace } from '@/lib/data-broadcast-view'
import { cn } from '@/lib/utils'
import {
  BAND_MOCK_WIDTH,
  BAND_MAX_SCALE,
  HYBRIDCAST_NAME,
  CLOSE_HYBRIDCAST_NAME,
  PILL,
  type Pressing,
  KEYPAD_NAME,
  DATA_BROADCAST_NAME,
  aiming,
} from '@/components/data-broadcast/data-broadcast-palette'
import { StationLine } from '@/components/data-broadcast/station-line'
import { Disc } from '@/components/data-broadcast/disc'
import { Colours } from '@/components/data-broadcast/colours'
import { Digits } from '@/components/data-broadcast/digits'

/** One mock pixel, measured against the player's width: the mock's size at its width and below, growing with the player, and no more than one and a half times the mock. */
const UNIT = `clamp(1px, 100cqw / ${BAND_MOCK_WIDTH}, ${BAND_MAX_SCALE}px)`

function mock(px: number): string {
  return `calc(${px} * var(--u))`
}

/** The mock's measures: the band and its scrim, the pills, the disc and its wedges, the arrows, Enter, the colour dots and the digits. */
const MEASURES = {
  '--u': UNIT,
  '--band': mock(136),
  '--scrim': mock(256),
  '--gap': mock(20),
  '--row-gap': mock(12),
  '--pill-h': mock(44),
  '--pill-w': mock(56),
  '--pill-font': mock(13),
  '--disc': mock(136),
  '--wedge': mock(75),
  '--reach': mock(45),
  '--arrow': mock(22),
  '--ok': mock(48),
  '--ok-font': mock(13),
  '--dot': mock(44),
  '--pitch': mock(54),
  '--key': mock(44),
  '--key-pitch': mock(52),
  '--key-font': mock(15),
} as CSSProperties

/** The scrim under the band and the control bar, as the mock lays it: one gradient from the player's bottom up. */
const SCRIM =
  'linear-gradient(to top, rgba(6,5,9,.92) 0%, rgba(6,5,9,.86) 30%, rgba(6,5,9,.8) 62%, rgba(6,5,9,.5) 78%, rgba(6,5,9,.18) 92%, rgba(6,5,9,0) 100%)'

const PILL_ON = 'bg-white/28 text-white hover:bg-white/28'

/** The Hybridcast application running, at the band's left: the station and `Hybridcast`, and `閉じる`, which goes back to the documents. It takes what room the keys leave. Where the station and `Hybridcast` do not fit on one line, `Hybridcast` goes under the station, and only a station that does not fit on its own line is cut short, before the keys move. */
function OnTheBand({
  station,
  onClose,
  onAim,
}: {
  station: string
  onClose: () => void
  onAim: () => void
}) {
  return (
    <div
      role="group"
      aria-label={HYBRIDCAST_NAME}
      data-slot="hybridcast-on-the-band"
      className="flex min-w-0 grow basis-0 items-center gap-(--row-gap)"
    >
      <StationLine
        station={station}
        what={HYBRIDCAST_NAME}
        className="text-[length:var(--pill-font)]"
      />
      <button
        type="button"
        aria-label={CLOSE_HYBRIDCAST_NAME}
        onMouseDown={(event) => {
          event.preventDefault()
          onAim()
        }}
        onClick={onClose}
        className={PILL}
      >
        閉じる
      </button>
    </div>
  )
}

/** The remote control's keys as a band, right-aligned with the bar's right-hand controls: `戻る`, the disc, the four colours and `123`, which draws the digits out beside it and puts them away again. While a Hybridcast application runs, its station and `閉じる` stand at the band's left. In a window the band is under the player's box on the box's own black, so nothing covers the documents' face; in fullscreen it stands on the bar with the scrim under both. Everything is measured against the player's width. */
export function DataBroadcastBand({
  place,
  numbers,
  onNumbers,
  onKey,
  onAim,
  station,
  application = null,
}: {
  place: Exclude<BandPlace, 'column'>
  numbers: boolean
  onNumbers: (shown: boolean) => void
  onKey: (key: BmlKey) => void
  onAim: () => void
  station?: string
  application?: { station: string; onClose: () => void } | null
}) {
  const pressing: Pressing = { onKey, onAim }
  const underTheBox = place === 'under'

  return (
    <div className="[container-type:inline-size]">
      <div
        role="group"
        aria-label={KEYPAD_NAME}
        data-slot="data-broadcast-band"
        data-place={place}
        data-face={numbers ? 'numbers' : 'keys'}
        style={MEASURES}
        className={cn(
          'flex flex-wrap-reverse items-center justify-end gap-x-(--gap) gap-y-(--row-gap) px-4 text-(--pl-ink) max-[700px]:px-3',
          underTheBox
            ? 'min-h-[calc(var(--band)+var(--row-gap)*2)] bg-(--pl-bg) py-(--row-gap)'
            : 'min-h-(--band)',
        )}
      >
        {!underTheBox && (
          <div
            aria-hidden
            data-slot="data-broadcast-scrim"
            style={{ backgroundImage: SCRIM }}
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-[1] h-(--scrim)"
          />
        )}
        {application && (
          <OnTheBand
            station={application.station}
            onClose={application.onClose}
            onAim={onAim}
          />
        )}
        {!application && station !== undefined && (
          <div className="flex min-w-0 grow basis-0 items-center">
            <StationLine
              station={station}
              what={DATA_BROADCAST_NAME}
              className="text-[length:var(--pill-font)]"
            />
          </div>
        )}
        <button
          type="button"
          aria-label="戻る"
          onMouseDown={aiming(pressing)}
          onClick={() => onKey('back')}
          className={PILL}
        >
          戻る
        </button>
        <Disc pressing={pressing} />
        <Colours pressing={pressing} />
        <button
          type="button"
          aria-label="123 数字"
          aria-expanded={numbers}
          onMouseDown={aiming(pressing)}
          onClick={() => {
            onAim()
            onNumbers(!numbers)
          }}
          className={cn(PILL, 'font-code', numbers && PILL_ON)}
        >
          123
        </button>
        {numbers && <Digits pressing={pressing} />}
      </div>
    </div>
  )
}
