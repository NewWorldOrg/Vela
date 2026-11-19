'use client'

import type { HybridcastApp } from '@/lib/data-broadcast-view'
import {
  type FrameProps,
  HybridcastFrame,
} from '@/components/data-broadcast/hybridcast-frame'

export function HybridcastFace({
  app,
  ...frame
}: Omit<FrameProps, 'address' | 'application'> & { app: HybridcastApp }) {
  const { address, application } = app

  return (
    <div
      data-slot="hybridcast-face"
      data-started={address === null ? 'no' : 'yes'}
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
    >
      {address && application && (
        <HybridcastFrame
          key={app.nth}
          address={address}
          application={application}
          {...frame}
        />
      )}
    </div>
  )
}
