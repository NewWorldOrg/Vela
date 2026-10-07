'use client'

import { useOptimistic, useState, useTransition } from 'react'

import { SYSTEM_STATE_LABELS } from '@/lib/system-terms'
import type {
  SegmentSettings,
  SegmentSettingsWrite,
} from '@/repository/segments'
import type { Reading } from '@/repository/system'
import { Switch } from '@/components/ui/switch'
import { InlineAlert } from '@/components/vela/banner'
import { FieldLabel } from '@/components/vela/field'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'

const DEVELOPER_FEATURES = '開発者機能'

const LEARNING = 'CM・OP・ED の学習'

const LEARNING_ID = 'developer-features-learning'

const NOT_SAVED = '変更を保存できませんでした。'

const ROW = 'grid grid-cols-[minmax(0,calc(180rem/16))_1fr] gap-x-5'

export function DeveloperFeatures({
  settings,
  onSettleLearning,
}: {
  settings: Reading<SegmentSettings>
  onSettleLearning: (learning: boolean) => Promise<SegmentSettingsWrite>
}) {
  return (
    <section data-slot="developer-features" className="mt-[calc(26rem/16)]">
      <SectionHeading>{DEVELOPER_FEATURES}</SectionHeading>
      {settings.state === 'ok' ? (
        <Learning
          learning={settings.value.learning}
          onSettle={onSettleLearning}
        />
      ) : (
        <Surface>
          <dl className={ROW}>
            <dt className="self-start text-ui font-bold text-ink">
              {LEARNING}
            </dt>
            <dd className="self-start text-ui text-ink-2">
              {settings.state === 'unauthenticated'
                ? SYSTEM_STATE_LABELS.signedOut
                : SYSTEM_STATE_LABELS.unknown}
            </dd>
          </dl>
        </Surface>
      )}
    </section>
  )
}

function Learning({
  learning,
  onSettle,
}: {
  learning: boolean
  onSettle: (learning: boolean) => Promise<SegmentSettingsWrite>
}) {
  const [shown, showAsIf] = useOptimistic(
    learning,
    (_: boolean, next: boolean) => next,
  )
  const [refused, setRefused] = useState(false)
  const [pending, startTransition] = useTransition()

  const settle = (next: boolean) => {
    if (pending) {
      return
    }

    setRefused(false)

    startTransition(async () => {
      showAsIf(next)

      const result = await onSettle(next)

      if (result.state !== 'ok') {
        setRefused(true)
      }
    })
  }

  return (
    <>
      <div aria-live="polite">
        {refused && (
          <InlineAlert tone="warn" className="mb-3.5">
            {NOT_SAVED}
          </InlineAlert>
        )}
      </div>
      <Surface>
        <dl className={ROW}>
          <dt className="self-start">
            <FieldLabel htmlFor={LEARNING_ID}>{LEARNING}</FieldLabel>
          </dt>
          <dd className="self-start">
            <Switch
              id={LEARNING_ID}
              checked={shown}
              aria-disabled={pending}
              className="aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
              onCheckedChange={settle}
            />
          </dd>
        </dl>
      </Surface>
    </>
  )
}
