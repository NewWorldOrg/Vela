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
