'use client'

import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'
import {
  CAPTION_BACKGROUNDS,
  CAPTION_BACKGROUND_LABEL,
  CAPTION_COLOURS,
  CAPTION_COLOUR_LABEL,
  CAPTION_EDGES,
  CAPTION_EDGE_LABEL,
  CAPTION_SCALES,
  PLAIN_CAPTION_STYLE,
  isPlain,
  isShifted,
  type CaptionColour,
  type CaptionStyle,
} from '@/lib/caption-style'
import { ChevronLeftIcon } from '@/components/vela/icons'
import {
  PLAYER_BUTTON,
  PLAYER_BUTTON_ON,
  PLAYER_GLYPH_BUTTON,
} from '@/components/recordings/player-palette'
import { PlayerSegmentedControl } from '@/components/recordings/player-segmented-control'
import { Setting } from '@/components/recordings/setting'

const SWATCH: Record<Exclude<CaptionColour, 'broadcast'>, string> = {
  white: 'bg-(--pl-caption-white)',
  yellow: 'bg-(--pl-caption-yellow)',
  cyan: 'bg-(--pl-caption-cyan)',
  green: 'bg-(--pl-caption-green)',
}

function Swatch({ colour }: { colour: Exclude<CaptionColour, 'broadcast'> }) {
  return (
    <span
      aria-hidden="true"
      data-slot="caption-swatch"
      className={cn(
        'block size-[calc(14rem/16)] rounded-full border border-white/35',
        SWATCH[colour],
      )}
    />
  )
}

function faceOfColour(colour: CaptionColour) {
  return colour === 'broadcast' ? undefined : <Swatch colour={colour} />
}

/** The caption's face of the gear: the background, the size, the colour of the letters, the edge, and putting the move or everything back. */
export function CaptionStylePanel({
  style,
  onChange,
  onBack,
  narrow = false,
}: {
  style: CaptionStyle
  onChange: (next: CaptionStyle) => void
  onBack: () => void
  narrow?: boolean
}) {
  const back = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    back.current?.focus()
  }, [])

  const choose = (patch: Partial<CaptionStyle>) =>
    onChange({ ...style, ...patch })
  const allOneColour = (
    <button
      type="button"
      aria-pressed={style.allOneColour}
      disabled={style.colour === 'broadcast'}
      onClick={() => choose({ allOneColour: !style.allOneColour })}
      className={cn(
        PLAYER_BUTTON,
        style.allOneColour && style.colour !== 'broadcast' && PLAYER_BUTTON_ON,
      )}
    >
      全部同じ色
    </button>
  )

  return (
    <div data-slot="caption-style">
      <div className="flex items-center gap-1.5 border-b border-dashed border-white/12 pb-2">
        <button
          ref={back}
          type="button"
          aria-label="戻る"
          onClick={onBack}
          className={cn(PLAYER_GLYPH_BUTTON, 'size-8 [&_svg]:size-5')}
        >
          <ChevronLeftIcon />
        </button>
        <span className="text-ui font-bold text-(--pl-ink)">字幕</span>
      </div>
      <Setting label="背景">
        <PlayerSegmentedControl
          label="背景"
          options={CAPTION_BACKGROUNDS}
          value={style.background}
          onChange={(background) => choose({ background })}
          nameOf={(one) => CAPTION_BACKGROUND_LABEL[one]}
        />
      </Setting>
      <Setting label="大きさ">
        <PlayerSegmentedControl
          label="大きさ"
          options={CAPTION_SCALES}
          value={style.scale}
          onChange={(scale) => choose({ scale })}
          nameOf={(one) => `${one}%`}
          numeric
        />
      </Setting>
      <Setting label="文字色">
        <PlayerSegmentedControl
          label="文字色"
          options={CAPTION_COLOURS}
          value={style.colour}
          onChange={(colour) => choose({ colour })}
          nameOf={(one) => CAPTION_COLOUR_LABEL[one]}
          faceOf={faceOfColour}
        />
        {!narrow && allOneColour}
      </Setting>
      {narrow && <Setting label="">{allOneColour}</Setting>}
      <Setting label="縁取り">
        <PlayerSegmentedControl
          label="縁取り"
          options={CAPTION_EDGES}
          value={style.edge}
          onChange={(edge) => choose({ edge })}
          nameOf={(one) => CAPTION_EDGE_LABEL[one]}
        />
      </Setting>
      <Setting label="">
        <button
          type="button"
          disabled={!isShifted(style)}
          onClick={() => choose({ shift: { x: 0, y: 0 } })}
          className={PLAYER_BUTTON}
        >
          位置を戻す
        </button>
        <button
          type="button"
          disabled={isPlain(style)}
          onClick={() => onChange(PLAIN_CAPTION_STYLE)}
          className={PLAYER_BUTTON}
        >
          元に戻す
        </button>
      </Setting>
    </div>
  )
}
