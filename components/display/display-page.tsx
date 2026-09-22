'use client'

import { useState } from 'react'

import {
  MOTION_COOKIE,
  MOTION_LABEL,
  movesUnless,
  type MotionSetting,
} from '@/lib/motion'
import { Switch } from '@/components/ui/switch'
import { FieldLabel } from '@/components/vela/field'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { PageHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'

const MOTION_ID = 'display-motion'

function remember(said: MotionSetting): void {
  document.cookie = `${MOTION_COOKIE}=${said};path=/;max-age=31536000;SameSite=Lax`
  document.documentElement.dataset.motion = said
}

export function DisplayView({ motion }: { motion?: MotionSetting }) {
  const [moves, setMoves] = useState<boolean>(movesUnless(motion))

  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>表示</CrumbCurrent>
      </Crumb>
      <PageHeading>表示</PageHeading>

      <Surface className="mt-3.5">
        <dl className="grid gap-x-5 gap-y-3.5 sm:grid-cols-[minmax(0,180px)_1fr]">
          <dt className="self-start">
            <FieldLabel htmlFor={MOTION_ID}>{MOTION_LABEL}</FieldLabel>
          </dt>
          <dd className="self-start">
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
      </Surface>
    </>
  )
}
