'use client'

import {
  Component,
  lazy,
  Suspense,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'

import type { BmlFrame } from '@/components/data-broadcast/bml-frame'

type FrameProps = ComponentProps<typeof BmlFrame>

type FrameModule = { BmlFrame: typeof BmlFrame }

function readFrame(): Promise<FrameModule> {
  return import('@/components/data-broadcast/bml-frame')
}

class UnreadFrame extends Component<
  { onUnread: () => void; children: ReactNode },
  { unread: boolean }
> {
  state = { unread: false }

  static getDerivedStateFromError() {
    return { unread: true }
  }

  componentDidCatch() {
    this.props.onUnread()
  }

  render() {
    return this.state.unread ? null : this.props.children
  }
}

/** The data broadcast's frame, read only when the data broadcast is opened. A frame that cannot be read is told to the player as the runtime failing, and is read again the next time the data broadcast opens. */
export function FrameOnDemand({
  load = readFrame,
  ...props
}: FrameProps & { load?: () => Promise<FrameModule> }) {
  const [Frame] = useState(() =>
    lazy(() => load().then((frame) => ({ default: frame.BmlFrame }))),
  )

  return (
    <UnreadFrame
      onUnread={() => props.onMessage({ kind: 'error', reason: 'missing' })}
    >
      <Suspense fallback={null}>
        <Frame {...props} />
      </Suspense>
    </UnreadFrame>
  )
}
