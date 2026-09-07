'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import type {
  EncodeDestination,
  EncodeProfile,
  EncodeRemoval,
  EncodeWrite,
} from '@/repository/encode'
import type {
  EncodeDestinationDraft,
  EncodeRemoved,
} from '@/repository/encode-terms'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ADMIN_LIST_HEIGHT_CAP } from '@/components/vela/app-shell'
import { AddDestinationDialog } from '@/components/encode/add-destination-dialog'
import { ChangeDestinationButton } from '@/components/encode/change-definition-button'
import {
  DefinitionName,
  RemovalNotice,
  RETIRED_ROW,
  ROW_OPS,
  STAMP,
  STICKY_HEAD,
} from '@/components/encode/definition-list'
import { RemoveDefinitionButton } from '@/components/encode/remove-definition-button'

const COLUMNS: { label: string; hidden?: boolean }[] = [
  { label: '名称' },
  { label: '出力ルート' },
  { label: '既定のプロファイル' },
  { label: '作成' },
  { label: '操作', hidden: true },
]

export function DestinationList({
  destinations,
  profiles,
  roots,
  onDefine,
  onRevise,
  onRemove,
}: {
  destinations: EncodeDestination[]
  profiles: Pick<EncodeProfile, 'id' | 'label'>[]
  roots: string[]
  onDefine: (draft: EncodeDestinationDraft) => Promise<EncodeWrite>
  onRevise: (id: string, draft: EncodeDestinationDraft) => Promise<EncodeWrite>
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
        <AddDestinationDialog
          variant="sm"
          profiles={profiles}
          roots={roots}
          onDefine={onDefine}
        />
      </div>

      <Table
        className="min-w-[810px]"
        containerClassName={cn(ADMIN_LIST_HEIGHT_CAP, 'overflow-y-auto pb-1')}
      >
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
          {destinations.map((destination) => (
            <TableRow
              key={destination.id}
              className={destination.retired ? RETIRED_ROW : undefined}
            >
              <TableCell>
                <DefinitionName
                  label={destination.label}
                  retired={destination.retired}
                />
              </TableCell>
              <TableCell className="font-code">
                {destination.outputRoot}
              </TableCell>
              <TableCell>
                {destination.defaultProfileLabel ?? (
                  <span className="text-ink-3">—</span>
                )}
              </TableCell>
              <TableCell className={STAMP}>{destination.definedAt}</TableCell>
              <TableCell className="text-right">
                {!destination.retired && (
                  <span className={ROW_OPS}>
                    <ChangeDestinationButton
                      destination={destination}
                      profiles={profiles}
                      roots={roots}
                      onRevise={onRevise}
                    />
                    <RemoveDefinitionButton
                      kind="保存先"
                      label={destination.label}
                      onRemove={() => onRemove(destination.id)}
                      onRemoved={(removal) =>
                        setRemoved({ label: destination.label, removal })
                      }
                    />
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
