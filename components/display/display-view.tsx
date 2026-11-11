'use client'

import { useState, useSyncExternalStore } from 'react'

import {
  MOTION_COOKIE,
  MOTION_LABEL,
  movesNow,
  type MotionSetting,
} from '@/lib/motion'
import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/components/theme/theme-provider'
import type { ThemePreference } from '@/lib/theme'
import { THEME_OPTIONS } from '@/components/theme/theme-toggle'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { PageHeading } from '@/components/vela/page-heading'
import { SettingsGroup, SettingsRow } from '@/components/vela/settings-group'

const MOTION_ID = 'display-motion'

const THEME_LABEL = 'テーマ'

const REDUCED_BY_THE_SYSTEM = '(prefers-reduced-motion: reduce)'

function followTheSystem(notify: () => void): () => void {
  const asked = window.matchMedia(REDUCED_BY_THE_SYSTEM)

  asked.addEventListener('change', notify)

  return () => asked.removeEventListener('change', notify)
}

function reducedByTheSystem(): boolean {
  return window.matchMedia(REDUCED_BY_THE_SYSTEM).matches
}

function reducedOnTheServer(): boolean {
  return false
}

function remember(said: MotionSetting): void {
  document.cookie = `${MOTION_COOKIE}=${said};path=/;max-age=31536000;SameSite=Lax`
  document.documentElement.dataset.motion = said
}

export function DisplayView({ motion }: { motion?: MotionSetting }) {
  const [said, setSaid] = useState<MotionSetting | undefined>(motion)
  const reduced = useSyncExternalStore(
    followTheSystem,
    reducedByTheSystem,
    reducedOnTheServer,
  )
  const moves = movesNow(said, reduced)
  const { preference, setPreference } = useTheme()

  return (
    <>
      <PageHeading>表示</PageHeading>

      <SettingsGroup className="mt-[calc(18rem/16)]">
        <SettingsRow name={THEME_LABEL}>
          <SegmentedControl
            aria-label={THEME_LABEL}
            options={THEME_OPTIONS.map(({ value, label }) => ({
              value,
              label,
            }))}
            value={preference}
            onValueChange={(next) => setPreference(next as ThemePreference)}
          />
        </SettingsRow>
        <SettingsRow name={<label htmlFor={MOTION_ID}>{MOTION_LABEL}</label>}>
          <Switch
            id={MOTION_ID}
            checked={moves}
            onCheckedChange={(next) => {
              const chosen: MotionSetting = next ? 'moves' : 'still'

              setSaid(chosen)
              remember(chosen)
            }}
          />
        </SettingsRow>
      </SettingsGroup>
    </>
  )
}
