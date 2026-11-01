'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import { wordFor } from '@/lib/not-yet-in-this-build'
import type {
  EncodeProfile,
  EncodeRemoval,
  EncodeWrite,
} from '@/repository/encode'
import type {
  EncodeProfileDefaults,
  EncodeProfileDraft,
  EncodeRemoved,
} from '@/repository/encode-terms'
import {
  CODEC_LABEL,
  DEINTERLACE_LABEL,
  RESOLUTION_LABEL,
} from '@/repository/encode-terms'
import {
  Table,
  TableBody,
  TableColumns,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cardPlace } from '@/components/ui/table-cards'
import { ActionRow } from '@/components/vela/action-row'
import { SectionHeading } from '@/components/vela/section-heading'
import { ADMIN_LIST_HEIGHT_CAP } from '@/components/vela/app-shell'
import { AddProfileDialog } from '@/components/encode/add-profile-dialog'
import { ChangeProfileButton } from '@/components/encode/change-definition-button'
import {
  DefinitionName,
  RemovalNotice,
  RETIRED_ROW,
  STICKY_HEAD,
} from '@/components/encode/definition-list'
import { RemoveDefinitionButton } from '@/components/encode/remove-definition-button'

/** When a profile was made is said under its name, so the table fits the settings frame. */
const COLUMNS: {
  label: string
  width: string | undefined
  hidden?: boolean
}[] = [
  { label: '名称', width: undefined },
  { label: 'コーデック', width: 'calc(96rem/16)' },
  { label: '解像度', width: 'calc(108rem/16)' },
  { label: '品質(CRF)', width: 'calc(92rem/16)' },
  { label: '品質(QP)', width: 'calc(84rem/16)' },
  { label: 'インタレース解除', width: 'calc(128rem/16)' },
  { label: '操作', width: 'calc(180rem/16)', hidden: true },
]

export function ProfileList({
  heading,
  profiles,
  defaults,
  onDefine,
  onRevise,
  onRemove,
}: {
  heading: string
  profiles: EncodeProfile[]
  defaults: EncodeProfileDefaults
  onDefine: (draft: EncodeProfileDraft) => Promise<EncodeWrite>
  onRevise: (id: string, draft: EncodeProfileDraft) => Promise<EncodeWrite>
  onRemove: (id: string) => Promise<EncodeRemoval>
}) {
  const [removed, setRemoved] = useState<{
    label: string
    removal: EncodeRemoved
  }>()

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <SectionHeading className="mb-0">{heading}</SectionHeading>
        <RemovalNotice removed={removed} />
        <AddProfileDialog size="sm" defaults={defaults} onDefine={onDefine} />
      </div>

      <Table
        cards
        className="table-fixed min-w-[calc(820rem/16)]"
        containerClassName={cn(ADMIN_LIST_HEIGHT_CAP, 'overflow-y-auto pb-1')}
      >
        <TableColumns widths={COLUMNS.map((column) => column.width)} />
        <TableHeader className={STICKY_HEAD}>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column.label}>
                {column.hidden ? (
                  <span className="sr-only">{column.label}</span>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((profile) => (
            <TableRow
              key={profile.id}
              className={profile.retired ? RETIRED_ROW : undefined}
            >
              <TableCell {...cardPlace('lead')}>
                <DefinitionName
                  label={profile.label}
                  retired={profile.retired}
                  definedAt={profile.definedAt}
                />
              </TableCell>
              <TableCell {...cardPlace('field', 'コーデック')}>
                {wordFor(CODEC_LABEL, profile.codec)}
              </TableCell>
              <TableCell {...cardPlace('field', '解像度')}>
                {wordFor(RESOLUTION_LABEL, profile.resolution)}
              </TableCell>
              <TableCell
                {...cardPlace('field', '品質(CRF)')}
                className="tabular-nums"
              >
                {profile.rateFactor}
              </TableCell>
              <TableCell
                {...cardPlace('field', '品質(QP)')}
                className="tabular-nums"
              >
                {profile.quantiser}
              </TableCell>
              <TableCell {...cardPlace('field', 'インタレース解除')}>
                {wordFor(DEINTERLACE_LABEL, profile.deinterlace)}
              </TableCell>
              <TableCell {...cardPlace('actions')} className="text-right">
                {!profile.retired && (
                  <ActionRow>
                    <ChangeProfileButton
                      profile={profile}
                      onRevise={onRevise}
                    />
                    <RemoveDefinitionButton
                      kind="プロファイル"
                      label={profile.label}
                      onRemove={() => onRemove(profile.id)}
                      onRemoved={(removal) =>
                        setRemoved({ label: profile.label, removal })
                      }
                    />
                  </ActionRow>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
