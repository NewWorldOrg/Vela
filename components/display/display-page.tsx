'use client'

import { useState } from 'react'

import {
  MOTION_COOKIE,
  MOTION_HINT,
  MOTION_LABEL,
  movesUnless,
  type MotionSetting,
} from '@/lib/motion'
import { Switch } from '@/components/ui/switch'
import {
  useTheme,
  type ThemePreference,
} from '@/components/theme/ThemeProvider'
import { THEME_OPTIONS } from '@/components/theme/ThemeToggle'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { FieldHint, FieldLabel } from '@/components/vela/field'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { PageHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'

const MOTION_ID = 'display-motion'

const THEME_LABEL = 'テーマ'

const THEME_HINT = 'システムは端末の明暗の設定に合わせます。'

function remember(said: MotionSetting): void {
  document.cookie = `${MOTION_COOKIE}=${said};path=/;max-age=31536000;SameSite=Lax`
  document.documentElement.dataset.motion = said
}

export function DisplayView({ motion }: { motion?: MotionSetting }) {
  const [moves, setMoves] = useState<boolean>(movesUnless(motion))
  const { preference, setPreference } = useTheme()

  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>表示</CrumbCurrent>
      </Crumb>
      <PageHeading>表示</PageHeading>

      <Surface className="mt-3.5 max-w-[calc(640rem/16)]">
        <dl className="flex items-center justify-between gap-4">
          <dt className="min-w-0 text-ui font-bold text-ink">{THEME_LABEL}</dt>
          <dd className="shrink-0">
            <SegmentedControl
              aria-label={THEME_LABEL}
              options={THEME_OPTIONS.map(({ value, label }) => ({
                value,
                label,
              }))}
              value={preference}
              onValueChange={(next) => setPreference(next as ThemePreference)}
            />
          </dd>
        </dl>
        <FieldHint className="mt-1.5">{THEME_HINT}</FieldHint>

        <dl className="mt-4 flex items-center justify-between gap-4 border-t border-dashed border-line pt-4">
          <dt className="min-w-0">
            <FieldLabel htmlFor={MOTION_ID}>{MOTION_LABEL}</FieldLabel>
          </dt>
          <dd className="shrink-0">
            <Switch
              id={MOTION_ID}
              checked={moves}
              onCheckedChange={(next) => {
                setMoves(next)
                remember(next ? 'moves' : 'still')
              }}
            />
          </dd>
        </dl>
        <FieldHint className="mt-1.5">{MOTION_HINT}</FieldHint>
      </Surface>
    </>
  )
}
