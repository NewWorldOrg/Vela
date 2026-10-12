'use client'

import type { ReactNode } from 'react'

import {
  AUTO_OPEN_HINT,
  AUTO_OPEN_LABEL,
  HYBRIDCAST_HINT,
  HYBRIDCAST_LABEL,
  LINE_HINT,
  LINE_LABEL,
  RECEIVER_ID_HINT,
  RECEIVER_ID_LABEL,
} from '@/lib/viewing'
import {
  AUTO_OPEN_SPELLING,
  DATA_BROADCAST_AUTO_OPEN,
  DATA_BROADCAST_HYBRIDCAST,
  DATA_BROADCAST_LINE,
  DATA_BROADCAST_RECEIVER_ID,
  HYBRIDCAST_SPELLING,
  LINE_SPELLING,
  RECEIVER_ID_SPELLING,
} from '@/lib/stored-flag'
import { useStoredFlag } from '@/hooks/useStoredFlag'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { FieldHint, FieldLabel } from '@/components/vela/field'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { PageHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'

const AUTO_OPEN_ID = 'viewing-data-broadcast-auto-open'

const LINE_ID = 'viewing-data-broadcast-line'

const RECEIVER_ID_ID = 'viewing-data-broadcast-receiver-id'

const HYBRIDCAST_ID = 'viewing-data-broadcast-hybridcast'

/** One row of the page: the name on the left, the switch on the right and one sentence under the name; a row after the first is set off by a dashed rule. */
function Row({
  id,
  label,
  hint,
  first = false,
  children,
}: {
  id: string
  label: string
  hint: string
  first?: boolean
  children: ReactNode
}) {
  return (
    <>
      <dl
        className={cn(
          'flex items-center justify-between gap-4',
          !first && 'mt-4 border-t border-dashed border-line pt-4',
        )}
      >
        <dt className="min-w-0">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
        </dt>
        <dd className="shrink-0">{children}</dd>
      </dl>
      <FieldHint className="mt-1.5">{hint}</FieldHint>
    </>
  )
}

/** The viewing settings. The card's ID can be handed over, and Hybridcast allowed, only while the line is allowed, so turning the line off turns both off too. */
export function ViewingView({
  autoOpensDataBroadcast = false,
  allowsTheLine = false,
  handsTheReceiverId = false,
  allowsHybridcast = false,
}: {
  autoOpensDataBroadcast?: boolean
  allowsTheLine?: boolean
  handsTheReceiverId?: boolean
  allowsHybridcast?: boolean
}) {
  const [autoOpens, setAutoOpens] = useStoredFlag(
    DATA_BROADCAST_AUTO_OPEN,
    AUTO_OPEN_SPELLING,
    autoOpensDataBroadcast,
  )
  const [allows, setAllows] = useStoredFlag(
    DATA_BROADCAST_LINE,
    LINE_SPELLING,
    allowsTheLine,
  )
  const [hands, setHands] = useStoredFlag(
    DATA_BROADCAST_RECEIVER_ID,
    RECEIVER_ID_SPELLING,
    handsTheReceiverId,
  )
  const [hybridcast, setHybridcast] = useStoredFlag(
    DATA_BROADCAST_HYBRIDCAST,
    HYBRIDCAST_SPELLING,
    allowsHybridcast,
  )

  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>視聴</CrumbCurrent>
      </Crumb>
      <PageHeading>視聴</PageHeading>

      <Surface className="mt-3.5 max-w-[calc(640rem/16)]">
        <Row
          id={AUTO_OPEN_ID}
          label={AUTO_OPEN_LABEL}
          hint={AUTO_OPEN_HINT}
          first
        >
          <Switch
            id={AUTO_OPEN_ID}
            checked={autoOpens}
            onCheckedChange={setAutoOpens}
          />
        </Row>
        <Row id={LINE_ID} label={LINE_LABEL} hint={LINE_HINT}>
          <Switch
            id={LINE_ID}
            checked={allows}
            onCheckedChange={(next) => {
              if (!next && hands) {
                setHands(false)
              }

              if (!next && hybridcast) {
                setHybridcast(false)
              }

              setAllows(next)
            }}
          />
        </Row>
        <Row
          id={RECEIVER_ID_ID}
          label={RECEIVER_ID_LABEL}
          hint={RECEIVER_ID_HINT}
        >
          <Switch
            id={RECEIVER_ID_ID}
            checked={allows && hands}
            disabled={!allows}
            onCheckedChange={setHands}
          />
        </Row>
        <Row id={HYBRIDCAST_ID} label={HYBRIDCAST_LABEL} hint={HYBRIDCAST_HINT}>
          <Switch
            id={HYBRIDCAST_ID}
            checked={allows && hybridcast}
            disabled={!allows}
            onCheckedChange={setHybridcast}
          />
        </Row>
      </Surface>
    </>
  )
}
