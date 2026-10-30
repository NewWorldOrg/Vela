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
  cardPlace,
  Table,
  TableBody,
  TableColumns,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ActionRow } from '@/components/vela/action-row'
import { ADMIN_LIST_HEIGHT_CAP } from '@/components/vela/app-shell'
import { AddProfileDialog } from '@/components/encode/add-profile-dialog'
import { ChangeProfileButton } from '@/components/encode/change-definition-button'
import {
  DefinitionName,
  RemovalNotice,
  RETIRED_ROW,
  STAMP,
  STICKY_HEAD,
} from '@/components/encode/definition-list'
import { RemoveDefinitionButton } from '@/components/encode/remove-definition-button'

const COLUMNS: { label: string; width: string; hidden?: boolean }[] = [
  { label: '名称', width: 'calc(200rem/16)' },
  { label: 'コーデック', width: 'calc(124rem/16)' },
  { label: '解像度', width: 'calc(112rem/16)' },
  { label: '品質(CRF)', width: 'calc(104rem/16)' },
  { label: '品質(QP)', width: 'calc(104rem/16)' },
  { label: 'インタレース解除', width: 'calc(148rem/16)' },
  { label: '作成', width: 'calc(122rem/16)' },
  { label: '操作', width: 'calc(192rem/16)', hidden: true },
]

export function ProfileList({
  profiles,
  defaults,
  onDefine,
  onRevise,
  onRemove,
}: {
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
      <div className="mb-2.5 flex flex-wrap items-center justify-end gap-2">
        <RemovalNotice removed={removed} />
        <AddProfileDialog size="sm" defaults={defaults} onDefine={onDefine} />
      </div>

      <Table
        cards
        className="table-fixed min-w-[calc(930rem/16)]"
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
                />
              </TableCell>
              <TableCell
                {...cardPlace('field', 'コーデック')}
                className="font-code"
              >
                {wordFor(CODEC_LABEL, profile.codec)}
              </TableCell>
              <TableCell {...cardPlace('field', '解像度')}>
                {wordFor(RESOLUTION_LABEL, profile.resolution)}
              </TableCell>
              <TableCell
                {...cardPlace('field', '品質(CRF)')}
                className="font-code tabular-nums"
              >
                {profile.rateFactor}
              </TableCell>
              <TableCell
                {...cardPlace('field', '品質(QP)')}
                className="font-code tabular-nums"
              >
                {profile.quantiser}
              </TableCell>
              <TableCell {...cardPlace('field', 'インタレース解除')}>
                {wordFor(DEINTERLACE_LABEL, profile.deinterlace)}
              </TableCell>
              <TableCell {...cardPlace('field', '作成')} className={STAMP}>
                {profile.definedAt}
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
