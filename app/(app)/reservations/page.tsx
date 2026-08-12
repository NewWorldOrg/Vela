import type { Metadata } from 'next'

import { ScreenPlaceholder } from '@/app/_components/screen-placeholder'

export const metadata: Metadata = { title: '予約' }

export default function Page() {
  return (
    <ScreenPlaceholder spot="star">
      予約一覧の画面はこれから実装されます。
    </ScreenPlaceholder>
  )
}
