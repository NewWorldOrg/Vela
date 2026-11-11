'use client'

import type { HybridcastApp } from '@/lib/data-broadcast-view'
import {
  type FrameProps,
  HybridcastFrame,
} from '@/components/data-broadcast/hybridcast-frame'

/** Where the Hybridcast application the documents started runs, over the player's box in their place. Its frame opens once Carina started the application, and opens afresh for another application put in its place; until then the place stays empty over the picture, and the band says what runs and closes it back to the documents. */
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
