import type { Metadata } from 'next'

import { ScreenPlaceholder } from '@/app/_components/screen-placeholder'

export const metadata: Metadata = { title: 'ログイン' }

export default function Page() {
  return (
    <div className="dot-grid flex min-h-dvh flex-col bg-bg">
      <ScreenPlaceholder spot="star">
        ログインの画面はこれから実装されます。
      </ScreenPlaceholder>
    </div>
  )
}
