'use client'

import type { ReactNode } from 'react'

import {
  AUTO_OPEN_LABEL,
  HYBRIDCAST_LABEL,
  LINE_LABEL,
  RECEIVER_ID_LABEL,
  SOUNDS_LABEL,
} from '@/lib/viewing'
import {
  AUTO_OPEN_SPELLING,
  DATA_BROADCAST_AUTO_OPEN,
  DATA_BROADCAST_HYBRIDCAST,
  DATA_BROADCAST_LINE,
  DATA_BROADCAST_RECEIVER_ID,
  DATA_BROADCAST_SOUNDS,
  HYBRIDCAST_SPELLING,
  LINE_SPELLING,
  RECEIVER_ID_SPELLING,
  SOUNDS_SPELLING,
} from '@/lib/stored-flag'
import { useStoredFlag } from '@/hooks/useStoredFlag'
import { Switch } from '@/components/ui/switch'
import { PageHeading } from '@/components/vela/page-heading'
import {
  SETTINGS_GROUP_TITLE,
  SettingsGroup,
  SettingsRow,
} from '@/components/vela/settings-rows'
import { UnreadSurface } from '@/components/segments/unread-surface'
import {
  ResidencePanel,
  RESIDENCE_SLOT,
  type SettleResidence,
} from '@/components/viewing/residence-panel'
import type { Residence } from '@/lib/bml/receiver-info'
import { RESIDENCE_HEADING } from '@/lib/residence'
import type { Reading } from '@/repository/system'

const AUTO_OPEN_ID = 'viewing-data-broadcast-auto-open'

const LINE_ID = 'viewing-data-broadcast-line'

const RECEIVER_ID_ID = 'viewing-data-broadcast-receiver-id'

const HYBRIDCAST_ID = 'viewing-data-broadcast-hybridcast'

const SOUNDS_ID = 'viewing-data-broadcast-sounds'

/** One row of the page: the name on the left, its switch on the right. */
function Row({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <SettingsRow name={<label htmlFor={id}>{label}</label>}>
      {children}
    </SettingsRow>
  )
}

/** The viewing settings. The card's ID can be handed over, and Hybridcast allowed, only while the line is allowed, so turning the line off turns both off too. The sounds stand apart from the line and start on. Under them, where the receiver is, which Carina keeps for the household rather than the browser. */
export function ViewingView({
  autoOpensDataBroadcast = false,
  allowsTheLine = false,
  handsTheReceiverId = false,
  allowsHybridcast = false,
  playsSounds = true,
  residence,
  onSettleResidence,
}: {
  autoOpensDataBroadcast?: boolean
  allowsTheLine?: boolean
  handsTheReceiverId?: boolean
  allowsHybridcast?: boolean
  playsSounds?: boolean
  residence: Reading<Residence>
  onSettleResidence: SettleResidence
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
  const [sounds, setSounds] = useStoredFlag(
    DATA_BROADCAST_SOUNDS,
    SOUNDS_SPELLING,
    playsSounds,
  )

  return (
    <>
      <PageHeading>視聴</PageHeading>

      <SettingsGroup className="mt-[calc(18rem/16)]">
        <Row id={AUTO_OPEN_ID} label={AUTO_OPEN_LABEL}>
          <Switch
            id={AUTO_OPEN_ID}
            checked={autoOpens}
            onCheckedChange={setAutoOpens}
          />
        </Row>
        <Row id={LINE_ID} label={LINE_LABEL}>
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
        <Row id={RECEIVER_ID_ID} label={RECEIVER_ID_LABEL}>
          <Switch
            id={RECEIVER_ID_ID}
            checked={allows && hands}
            disabled={!allows}
            onCheckedChange={setHands}
          />
        </Row>
        <Row id={HYBRIDCAST_ID} label={HYBRIDCAST_LABEL}>
          <Switch
            id={HYBRIDCAST_ID}
            checked={allows && hybridcast}
            disabled={!allows}
            onCheckedChange={setHybridcast}
          />
        </Row>
        <Row id={SOUNDS_ID} label={SOUNDS_LABEL}>
          <Switch id={SOUNDS_ID} checked={sounds} onCheckedChange={setSounds} />
        </Row>
      </SettingsGroup>

      {residence.state === 'ok' ? (
        <ResidencePanel
          heading={RESIDENCE_HEADING}
          residence={residence.value}
          onSettle={onSettleResidence}
        />
      ) : (
        <section>
          <h2 className={SETTINGS_GROUP_TITLE}>{RESIDENCE_HEADING}</h2>
          <UnreadSurface slot={RESIDENCE_SLOT} reading={residence} />
        </section>
      )}
    </>
  )
}
