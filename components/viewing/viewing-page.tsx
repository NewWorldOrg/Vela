'use client'

import { AUTO_OPEN_HINT, AUTO_OPEN_LABEL } from '@/lib/viewing'
import { AUTO_OPEN_SPELLING, DATA_BROADCAST_AUTO_OPEN } from '@/lib/stored-flag'
import { useStoredFlag } from '@/hooks/useStoredFlag'
import { Switch } from '@/components/ui/switch'
import { FieldHint, FieldLabel } from '@/components/vela/field'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { PageHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'

const AUTO_OPEN_ID = 'viewing-data-broadcast-auto-open'

export function ViewingView({
  autoOpensDataBroadcast = false,
}: {
  autoOpensDataBroadcast?: boolean
}) {
  const [autoOpens, setAutoOpens] = useStoredFlag(
    DATA_BROADCAST_AUTO_OPEN,
    AUTO_OPEN_SPELLING,
    autoOpensDataBroadcast,
  )

  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>視聴</CrumbCurrent>
      </Crumb>
      <PageHeading>視聴</PageHeading>

      <Surface className="mt-3.5 max-w-[calc(640rem/16)]">
        <dl className="flex items-center justify-between gap-4">
          <dt className="min-w-0">
            <FieldLabel htmlFor={AUTO_OPEN_ID}>{AUTO_OPEN_LABEL}</FieldLabel>
          </dt>
          <dd className="shrink-0">
            <Switch
              id={AUTO_OPEN_ID}
              checked={autoOpens}
              onCheckedChange={setAutoOpens}
            />
          </dd>
        </dl>
        <FieldHint className="mt-1.5">{AUTO_OPEN_HINT}</FieldHint>
      </Surface>
    </>
  )
}
